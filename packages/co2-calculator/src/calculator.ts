/**
 * Core inference calculator that emerged from iteratively refining
 * formulas against production Prometheus + vLLM data.
 *
 * All calculations return per-request energy and CO₂ with a full
 * breakdown so callers can display any comparison they like.
 */

import type {
  InferenceParams,
  InferenceResult,
  InferenceComponent,
  GridRegion,
} from "./types.js";

const SECONDS_IN_HOUR = 3_600;
const GPU_LIFETIME_SECONDS = 5 * 365 * 24 * 3_600; // 5 years

// PUE is now grid-specific (see grids.ts)
// Sweden: 1.15 (free-air cooling)
// Texas: 1.80 (extreme cooling needs)
// Global average: 1.50

// ---------------------------------------------------------------------------
// GPU allocation heuristic (from live-calculator.html production tuning)
// ---------------------------------------------------------------------------

function gpusForModel(params: number, maxOnNode: number): number {
  if (params <= 10_000_000_000) return 1;
  if (params <= 40_000_000_000) return 2;
  if (params <= 100_000_000_000) return 4;
  return maxOnNode;
}

// ---------------------------------------------------------------------------
// Time-of-day
// ---------------------------------------------------------------------------

function applyTimeOfDay(
  grid: GridRegion,
  hourOfDay: number,
): { effectiveIntensity: number; isLowPeriod: boolean; factor: number } {
  const weight = grid.demandCurve[Math.max(0, Math.min(23, hourOfDay))] ?? 0.5;
  const isLow = weight <= grid.lowPeriodThreshold;
  const factor = isLow ? grid.lowPeriodFactor : grid.peakPeriodFactor;
  return {
    effectiveIntensity: grid.intensityGPerKwh * factor,
    isLowPeriod: isLow,
    factor,
  };
}

// ---------------------------------------------------------------------------
// Concurrency impact on response time
// 
// When many requests hit the server simultaneously, each request takes longer
// because GPUs are shared. However, the fixed overhead (server infrastructure,
// datacenter PUE) is divided among all concurrent requests.
// 
// This creates a trade-off:
// - Higher concurrency → longer per-request GPU time → higher per-request CO₂
// - Higher concurrency → lower overhead per request → shared infrastructure cost
// ---------------------------------------------------------------------------

export function applyConcurrencyDelay(
  baseResponseTime: number,
  concurrency: number,
): number {
  // Baseline is concurrency=8 (typical production load)
  // Sub-linear scaling: doubling concurrency adds ~15% latency
  // This reflects queueing and resource contention
  const baselineConcurrency = 8;
  if (concurrency <= baselineConcurrency) return baseResponseTime;
  
  const ratio = concurrency / baselineConcurrency;
  const delayFactor = 1 + Math.log2(ratio) * 0.15;
  return baseResponseTime * delayFactor;
}

// ---------------------------------------------------------------------------
// Default traffic pattern (requests per minute by hour)
// Based on typical SaaS usage: low at night, peaks during business hours
// ---------------------------------------------------------------------------

export const DEFAULT_TRAFFIC_PATTERN = [
  0.05, 0.03, 0.02, 0.02, 0.03, 0.05,  // 00-05: Night (very low)
  0.10, 0.20, 0.35, 0.50, 0.55, 0.50,  // 06-11: Morning ramp-up
  0.45, 0.40, 0.42, 0.45, 0.50, 0.48,  // 12-17: Afternoon plateau
  0.40, 0.30, 0.25, 0.20, 0.15, 0.10,  // 18-23: Evening taper
];

export function getConcurrencyFromTrafficPattern(hourOfDay: number): number {
  const normalizedHour = Math.max(0, Math.min(23, hourOfDay));
  const trafficWeight = DEFAULT_TRAFFIC_PATTERN[normalizedHour];
  // Scale to realistic concurrency range (1-32)
  return Math.max(1, Math.round(trafficWeight * 64));
}

// ---------------------------------------------------------------------------
// Main calculation
// ---------------------------------------------------------------------------

export function calculateInference(params: InferenceParams): InferenceResult {
  const {
    modelProfile,
    hardware,
    deploymentGrid,
    measuredResponseTimeSeconds,
    inputTokens,
    outputTokens,
    concurrency,
    hourOfDay,
    includeTraining,
    lifetimeQueries,
  } = params;

  // --- Token-based time adjustment (Section 3.1) ---
  // Scale response time based on token count relative to defaults
  const tokenRatio = (inputTokens + outputTokens) / 
    (modelProfile.defaultInputTokens + modelProfile.defaultOutputTokens);
  const tokenAdjustedTime = measuredResponseTimeSeconds * Math.sqrt(tokenRatio);

  // --- GPU Time Allocation (Section 3.1) ---
  // Per-request GPU time = response time × (concurrency / gpus_in_node)
  // This accounts for the fact that GPUs are shared among concurrent requests
  const gpuTimeSec = tokenAdjustedTime * Math.min(1, concurrency / gpusUsed);
  const gpuTimeH = gpuTimeSec / SECONDS_IN_HOUR;

  const gpusUsed = Math.min(
    gpusForModel(modelProfile.parameters, hardware.gpuCount),
    hardware.gpuCount,
  );

  const { effectiveIntensity, isLowPeriod, factor } = applyTimeOfDay(
    deploymentGrid,
    hourOfDay,
  );

  // --- Power (per GPU) (Section 3.4) ---
  // Utilization based on model size, not response time
  // U_util ≈ 0.3 for small models, 0.6 for medium, 0.9 for large
  let utilization: number;
  if (modelProfile.parameters <= 10_000_000_000) {
    utilization = 0.3; // Small models
  } else if (modelProfile.parameters <= 40_000_000_000) {
    utilization = 0.6; // Medium models
  } else {
    utilization = 0.9; // Large models
  }
  
  // Base idle power that every GPU draws regardless of load
  const baseGpuPower = hardware.nodeIdleWatts / hardware.gpuCount;
  // Additional power when under load
  const incrementalPower =
    ((hardware.nodePeakWatts - hardware.nodeIdleWatts) / hardware.gpuCount) *
    utilization;
  const powerPerGpu = baseGpuPower + incrementalPower;

  // --- GPU operational energy (all allocated GPUs) ---
  const gpuEnergyKwh = (powerPerGpu * gpuTimeH * gpusUsed) / 1_000;
  const gpuOperationalCO2 = gpuEnergyKwh * effectiveIntensity;

  // --- Server Infrastructure (Section 3.6) ---
  // Server chassis power is constant per node, NOT divided by concurrency
  // The CO₂ is divided among concurrent requests for per-request accounting
  const serverEnergyKwh = (hardware.chassisWatts * gpuTimeH) / 1_000;
  const serverOperationalCO2 = (serverEnergyKwh * effectiveIntensity) / concurrency;

  // --- PUE overhead (grid-specific) ---
  const pue = deploymentGrid.typicalPue;
  const overheadCO2 = (gpuOperationalCO2 + serverOperationalCO2) * (pue - 1);

  // --- Embodied (amortised per GPU-second, all GPUs used) ---
  const embodiedPerGpuGrams = (hardware.embodiedPerGpuKg * 1_000) / GPU_LIFETIME_SECONDS;
  const embodiedCO2 = embodiedPerGpuGrams * gpuTimeSec * gpusUsed;

  // --- Training (amortised) ---
  const trainingCO2 = includeTraining
    ? modelProfile.totalTrainingCO2Grams / lifetimeQueries
    : 0;

  const totalCO2 =
    gpuOperationalCO2 + serverOperationalCO2 + overheadCO2 + embodiedCO2 + trainingCO2;

  const totalEnergyKwh = gpuEnergyKwh + serverEnergyKwh;

  // --- Water usage (grid-specific cooling method) ---
  // Water is used for evaporative cooling in hot climates
  // Free-air cooling (Nordics) uses zero water
  const waterLiters = totalEnergyKwh * deploymentGrid.waterLitersPerKwh;

  // --- Build result ---
  const mkComp = (co2: number, energy: number, label: string): InferenceComponent => ({
    co2Grams: Number(co2.toFixed(6)),
    energyKwh: Number(energy.toFixed(9)),
    label,
  });

  return {
    totalCO2Grams: Number(totalCO2.toFixed(6)),
    components: {
      gpuOperational: mkComp(gpuOperationalCO2, gpuEnergyKwh, "GPU energy"),
      serverOperational: mkComp(serverOperationalCO2, serverEnergyKwh, "Server infrastructure"),
      datacenterOverhead: mkComp(overheadCO2, 0, `Cooling & overhead (PUE ${pue.toFixed(2)})`),
      embodied: mkComp(embodiedCO2, 0, "Hardware embodied (amortised)"),
      trainingAmortised: mkComp(trainingCO2, 0, `Training amortised (${includeTraining ? "included" : "excluded"})`),
    },
    totalEnergyKwh,
    gpusAllocated: gpusUsed,
    effectiveIntensityGPerKwh: Number(effectiveIntensity.toFixed(2)),
    timing: {
      isLowPeriod,
      periodFactor: Number(factor.toFixed(2)),
      hourOfDay,
    },
    deploymentGrid: {
      name: deploymentGrid.name,
      intensityGPerKwh: deploymentGrid.intensityGPerKwh,
    },
    waterLiters: Number(waterLiters.toFixed(6)),
  };
}

// ---------------------------------------------------------------------------
// Comparison helpers (grid-independent physics + grid-dependent CO₂)
// ---------------------------------------------------------------------------

export interface ComparisonResult {
  /** Microwave time in seconds (based on reference-grid) */
  microwaveSeconds: number;
  /** LED bulb time in seconds (based on reference-grid) */
  ledBulbSeconds: number;
  /** Car distance in km (grid-dependent) */
  carKm: number;
  /** Smartphone charge percent (grid-dependent) */
  phoneChargePercent: number;
  /** Flight permille (‰) (grid-dependent) */
  flightPermille: number;
}

/** Convert CO₂ to energy-equivalent comparisons using a fixed reference.
 *  
 *  We use a fixed carbon intensity (EU average ≈ 300 g/kWh) so that
 *  comparisons are consistent regardless of which grid the user selects.
 *  This answers: "What does this CO₂ amount to in everyday terms?"
 *  rather than "How much energy is this on my grid?"
 */
export function calculateComparisons(
  co2Grams: number,
): ComparisonResult {
  // Fixed reference: EU average grid intensity for consistent comparisons
  const REFERENCE_INTENSITY = 300; // g/kWh
  const equivalentEnergyKwh = co2Grams / REFERENCE_INTENSITY;

  return {
    microwaveSeconds: (equivalentEnergyKwh / 0.8) * SECONDS_IN_HOUR,
    ledBulbSeconds: (equivalentEnergyKwh / 0.01) * SECONDS_IN_HOUR,
    // These are direct CO₂ equivalents (grid-independent)
    carKm: co2Grams / 120,
    phoneChargePercent: (co2Grams / 15) * 100,
    flightPermille: (co2Grams / 90_000) * 1_000,
  };
}

// ---------------------------------------------------------------------------
// Convenience: format seconds → human readable
// ---------------------------------------------------------------------------

export function fmtTime(seconds: number): string {
  if (seconds < 1) return `${(seconds * 1_000).toFixed(0)} ms`;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m} min ${s} s`;
  const h = Math.floor(m / 60);
  return `${h} hr ${m % 60} min`;
}

export function fmtNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function fmtParams(p: number): string {
  if (p >= 1e12) return `${(p / 1e12).toFixed(1)}T`;
  if (p >= 1e9) return `${(p / 1e9).toFixed(p >= 10e9 ? 0 : 1)}B`;
  if (p >= 1e6) return `${(p / 1e6).toFixed(0)}M`;
  return String(p);
}
