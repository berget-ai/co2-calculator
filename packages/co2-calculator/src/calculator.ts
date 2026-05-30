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
const PUE = 1.2;
const GPU_LIFETIME_SECONDS = 5 * 365 * 24 * 3_600; // 5 years

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

  // --- Token-based time adjustment ---
  // Scale response time based on token count relative to defaults
  const tokenRatio = (inputTokens + outputTokens) / 
    (modelProfile.defaultInputTokens + modelProfile.defaultOutputTokens);
  const adjustedResponseTime = measuredResponseTimeSeconds * Math.sqrt(tokenRatio);

  const gpuTimeSec = adjustedResponseTime;
  const gpuTimeH = gpuTimeSec / SECONDS_IN_HOUR;

  const gpusUsed = Math.min(
    gpusForModel(modelProfile.parameters, hardware.gpuCount),
    hardware.gpuCount,
  );

  const { effectiveIntensity, isLowPeriod, factor } = applyTimeOfDay(
    deploymentGrid,
    hourOfDay,
  );

  // --- Power (per GPU) ---
  const utilization = Math.min(1.0, adjustedResponseTime / 10);
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

  // --- Server infrastructure (shared by concurrency) ---
  const serverEnergyKwh = (hardware.chassisWatts * gpuTimeH) / (1_000 * concurrency);
  const serverOperationalCO2 = serverEnergyKwh * effectiveIntensity;

  // --- PUE overhead ---
  const overheadCO2 = (gpuOperationalCO2 + serverOperationalCO2) * (PUE - 1);

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
      datacenterOverhead: mkComp(overheadCO2, 0, "Datacenter overhead (PUE 1.2)"),
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

/** Convert CO₂ to energy-equivalent comparisons on the reference grid.
 *  Physics is grid-independent, so this lets users see "how much energy is this
 *  on MY grid?" even when running on a dirty grid elsewhere. */
export function calculateComparisons(
  co2Grams: number,
  referenceGrid: GridRegion,
): ComparisonResult {
  // If this CO₂ came from the reference grid, how much energy is that?
  const equivalentEnergyKwh = co2Grams / referenceGrid.intensityGPerKwh;

  return {
    microwaveSeconds: (equivalentEnergyKwh / 0.8) * SECONDS_IN_HOUR,
    ledBulbSeconds: (equivalentEnergyKwh / 0.01) * SECONDS_IN_HOUR,
    // These are deployment-grid dependent (actual environmental impact)
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
