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
  ModelProfile,
  HardwareConfig,
} from "./types.js";

const SECONDS_IN_HOUR = 3_600;
const GPU_LIFETIME_SECONDS = 5 * 365 * 24 * 3_600; // 5 years

// PUE is now grid-specific (see grids.ts)
// Sweden: 1.15 (free-air cooling)
// Texas: 1.80 (extreme cooling needs)
// Global average: 1.50

// ---------------------------------------------------------------------------
// GPU allocation heuristic (memory-aware)
// ---------------------------------------------------------------------------

function gpusForModel(modelProfile: ModelProfile, hardware: HardwareConfig): number {
  // Calculate model memory requirement
  // Formula: parameters × bytes_per_param × overhead_factor
  // - INT4/INT8 quantized: 0.5 bytes per param
  // - FP16: 2 bytes per param  
  // - FP32: 4 bytes per param
  // - Overhead for KV cache, activations, etc: 1.2x
  const bytesPerParam = modelProfile.modelSizeBytes 
    ? modelProfile.modelSizeBytes / modelProfile.parameters 
    : 2.0; // Default to FP16
  
  const modelMemoryGb = (modelProfile.parameters * bytesPerParam * 1.2) / (1024 * 1024 * 1024);
  
  // Calculate GPUs needed based on memory
  const gpusNeeded = Math.ceil(modelMemoryGb / hardware.gpuMemoryGb);
  
  // Clamp to available GPUs on node
  return Math.min(gpusNeeded, hardware.gpuCount);
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
    outputTokens,
    hourOfDay,
    includeTraining,
    lifetimeQueries,
  } = params;

  const deployment = params.deployment ?? "shared";
  const caching = params.caching ?? true;

  // --- Concurrency (Section 3.2) ---
  // On-prem: you run the model yourself, so there is no sharing — concurrency
  // is 1 and the full infrastructure/embodied cost lands on your queries.
  // Shared: when no explicit concurrency is given, derive it from the model's
  // measured production concurrency (Little's Law) scaled by the time-of-day
  // traffic pattern, so a popular model at peak hour shares more than a quiet
  // one at night. Falls back to a generic default for models we don't serve.
  const GENERIC_DEFAULT_CONCURRENCY = 8;
  // Clamp hourOfDay into [0,23] and guard against non-finite values so the
  // traffic-pattern lookup and everything downstream can never go NaN.
  const safeHour = Number.isFinite(hourOfDay) ? Math.max(0, Math.min(23, Math.floor(hourOfDay))) : 14;
  const timeOfDayWeight = DEFAULT_TRAFFIC_PATTERN[safeHour] ?? 0.5;
  const derivedConcurrency =
    (modelProfile.defaultConcurrency ?? GENERIC_DEFAULT_CONCURRENCY) *
    (timeOfDayWeight / 0.5); // normalise so the afternoon plateau (0.5) = model baseline
  const rawConcurrency = params.concurrency ?? derivedConcurrency;
  const concurrency =
    deployment === "onprem"
      ? 1
      : Math.max(1, Math.round(Number.isFinite(rawConcurrency) ? rawConcurrency : GENERIC_DEFAULT_CONCURRENCY));

  const safeConcurrency = concurrency;

  // --- Caching (KV prefix cache) ---
  // When enabled, the model's measured cachedPromptFraction of the prompt is
  // served from the KV cache and skips the prefill phase, so only the
  // uncached share of input tokens drives prefill GPU time. The fraction is
  // clamped to [0,1] and guarded against non-finite values so a bad measured
  // value can never produce negative/NaN effective tokens.
  const inputTokens = params.inputTokens;
  const rawFraction = caching ? modelProfile.cachedPromptFraction ?? 0 : 0;
  const cachedFraction = Number.isFinite(rawFraction) ? Math.max(0, Math.min(1, rawFraction)) : 0;
  const effectiveInputTokens = inputTokens * (1 - cachedFraction);

  // --- Token-based time adjustment (Section 3.1) ---
  // Scale response time based on token count relative to defaults.
  // Square root models sub-linear scaling: doubling tokens does not double
  // processing time because tokens are processed in parallel (prefill phase)
  // and the decode phase has fixed overhead per step.
  const tokenRatio = (effectiveInputTokens + outputTokens) /
    (modelProfile.defaultInputTokens + modelProfile.defaultOutputTokens);
  const tokenAdjustedTime = measuredResponseTimeSeconds * Math.sqrt(tokenRatio);

  // --- GPU Allocation (Section 3.3) ---
  // Calculate GPUs needed based on memory requirements
  const gpusUsed = gpusForModel(modelProfile, hardware);

  // --- Concurrency Impact (Section 3.2) ---
  // When many requests hit the server simultaneously, each request takes
  // longer due to resource contention (queueing, memory bandwidth, KV cache
  // pressure). This is modelled by applyConcurrencyDelay() which applies a
  // logarithmic delay factor above a baseline concurrency of 8.
  //
  // Note: The concurrency delay INCREASES per-request GPU time (each request
  // takes longer). However, the fixed server infrastructure cost (chassis
  // power, PUE overhead) is DIVIDED among all concurrent requests, creating
  // a trade-off: higher concurrency → more GPU time per request, but less
  // infrastructure cost per request.
  const concurrencyAdjustedTime = applyConcurrencyDelay(tokenAdjustedTime, safeConcurrency);
  const gpuTimeSec = concurrencyAdjustedTime;
  const gpuTimeH = gpuTimeSec / SECONDS_IN_HOUR;

  // --- Productive batch size (shared-cost denominator) ---
  // vLLM's `request_inference_time` is WALL-CLOCK residency time: with
  // continuous batching, N requests each record the full duration they were
  // resident even though they shared the GPU. The GPU is one device with one
  // power draw; batching amortises energy and embodied carbon across the
  // batch, it does not multiply them. So every shared cost (incremental
  // compute energy, idle standby, embodied amortisation, server chassis) is
  // divided by the number of requests genuinely sharing the GPU — the
  // productive batch size.
  //
  // `defaultConcurrency` is measured via Little's Law on end-to-end latency
  // (rate × mean latency), which IS the productive batch size for a shared
  // deployment: it counts the requests resident on the node, which is exactly
  // what divides the shared cost. Each request then bears its own
  // (token-adjusted) GPU time's worth of the shared rate — short requests a
  // little, long requests more — and the total across the real request mix
  // conserves the node's full fixed cost.
  const productiveBatch = safeConcurrency;

  const { effectiveIntensity, isLowPeriod, factor } = applyTimeOfDay(
    deploymentGrid,
    hourOfDay,
  );

  // --- Power (per GPU) (Section 3.4) ---
  // GPU power is interpolated between idle and peak based on utilization.
  //
  // LLMCO2 (Fu et al., 2024) shows inference utilization is 10-40% of peak,
  // significantly lower than training, due to the memory-bound decode phase.
  // However, LLMCO2 also warns that utilization is "highly variable" and that
  // equation-based models using simple parameter-based heuristics are
  // "inaccurate" — utilization depends on batch size, prompt length, KV cache
  // pressure, sampling strategy, and framework-level optimizations.
  //
  // We use a fixed midpoint of 25% (the center of the 10-40% range) rather
  // than parameter-based tiers. This is a conservative heuristic that:
  // 1. Acknowledges the 10-40% range from LLMCO2 measurements
  // 2. Avoids unsupported claims that parameter count determines utilization
  // 3. Can be refined with EcoLogits' parametric model when more data is available
  //
  // The uncertainty (±15 percentage points) is documented in Section 9.
  //
  // Reference: Fu, Z. et al. (2024). LLMCO2. arXiv:2410.02950
  // Alternative: EcoLogits (Rincé & Banse, 2025) — α × e^(β×B) × P_active + γ
  const utilization = 0.25; // Midpoint of 10-40% range from LLMCO2

  // --- Power: split into IDLE baseline and INCREMENTAL load (Section 3.4) ---
  //
  // A node's power draw has two physically distinct parts:
  //
  //  1. IDLE baseline — the node draws nodeIdleWatts around the clock simply
  //     by being powered on, regardless of load. Our DCGM measurements confirm
  //     this is substantial and is NOT a deep sleep state: an idle B300 draws
  //     ~122 W per GPU at 0% utilisation (spec value ~125 W), an idle L4 ~40 W.
  //     This standby cost must be attributed to the requests the node serves,
  //     or it is silently dropped from the accounting.
  //
  //  2. INCREMENTAL load — the additional power drawn while actually
  //     processing, interpolated between idle and peak by utilisation.
  //
  // We therefore separate them. The incremental part is what varies with the
  // work done; the idle part is a fixed overhead shared across requests.
  const idlePerGpuWatts = hardware.nodeIdleWatts / hardware.gpuCount;
  const incrementalPerGpuWatts =
    ((hardware.nodePeakWatts - hardware.nodeIdleWatts) / hardware.gpuCount) * utilization;

  // --- Concurrency division (Section 3.2, corrected) ---
  //
  // vLLM's `request_inference_time` is WALL-CLOCK residency time: with
  // continuous batching, N concurrent requests each record the full duration
  // they were resident, even though they SHARED the GPU. (Verified against
  // vllm/v1/metrics/stats.py: inference_time = last_token_ts − scheduled_ts.)
  // Our production data shows ~10 requests concurrently in the inference phase
  // for the busiest model — summing their wall-clock yields ~10 GPU-seconds
  // per wall-second, far more than the single GPU-sec a GPU can physically
  // deliver. The GPU is ONE device with ONE power draw; batching amortises
  // energy across the batch, it does not multiply it.
  //
  // Per-request GPU energy, idle share and embodied share must therefore be
  // DIVIDED by concurrency, otherwise the same GPU-second (and the same
  // manufacturing carbon) is counted once per concurrent request.

  // --- GPU operational energy (incremental load only, shared across batch) ---
  // Shared across the productive batch (requests genuinely sharing the GPU).
  const gpuEnergyKwh = (incrementalPerGpuWatts * gpuTimeH * gpusUsed) / productiveBatch / 1_000;
  const gpuOperationalCO2 = gpuEnergyKwh * effectiveIntensity;

  // --- GPU idle baseline (standby draw, shared across batch) ---
  // The node's idle draw over this request's GPU residency, split among the
  // requests genuinely sharing the GPU (productive batch — see embodied note
  // below). Uses this request's own GPU time, so short requests bear little
  // standby cost and long requests more; the productive-batch denominator
  // keeps the total conserved across the skewed request mix.
  const idleEnergyKwh = (idlePerGpuWatts * gpuTimeH * gpusUsed) / productiveBatch / 1_000;
  const idleOperationalCO2 = idleEnergyKwh * effectiveIntensity;

  // --- Server Infrastructure (Section 3.6) ---
  // Server chassis power is a fixed per-node cost shared across the productive
  // batch of requests genuinely sharing the node.
  const serverEnergyKwh = (hardware.chassisWatts * gpuTimeH) / 1_000;
  const serverOperationalCO2 = (serverEnergyKwh * effectiveIntensity) / productiveBatch;

  // --- PUE overhead (grid-specific) ---
  const pue = deploymentGrid.typicalPue;
  const overheadCO2 = (gpuOperationalCO2 + idleOperationalCO2 + serverOperationalCO2) * (pue - 1);

  // --- Embodied GPU (amortised over projected lifetime utilization) ---
  // Embodied emissions have already occurred with certainty. To ensure the
  // full embodied carbon is accounted for over the hardware's lifetime, we
  // amortise based on projected lifetime utilization rather than per-query
  // GPU time.
  //
  // The projected lifetime utilization assumes the GPU is active (processing
  // requests) for a fraction of its 5-year life. We use 50% as a conservative
  // estimate: GPUs in inference deployments typically run at 30-70% utilization
  // over their lifetime (batching, multiple tenants, scheduled maintenance).
  //
  // This means: embodiedPerGpuGrams × activeSecondsPerQuery × gpusUsed
  // where activeSecondsPerQuery accounts for the GPU being "reserved" for this
  // query's share of lifetime capacity.
  //
  // Reference: SEI review (Babis, 2026) — "The simplest tweak seems to be
  // dividing total embodied emissions by projected lifetime utilization in
  // GPU-seconds"
  const PROJECTED_LIFETIME_UTILIZATION = 0.50; // 50% active over 5 years
  const projectedActiveSeconds = GPU_LIFETIME_SECONDS * PROJECTED_LIFETIME_UTILIZATION;
  const embodiedPerGpuGrams = (hardware.embodiedPerGpuKg * 1_000) / projectedActiveSeconds;
  // Per-query allocation: this query's share of projected lifetime active
  // time, DIVIDED by concurrency. With continuous batching, N concurrent
  // requests each claim the same wall-clock residency, but the GPU's embodied
  // carbon is a fixed one-off cost — counting it once per concurrent request
  // would multiply the total manufacturing footprint by the batch size. The
  // request's fair share is the wall-clock residency split across the batch.
  // Per-request embodied uses THIS request's own (token-adjusted) GPU time,
  // divided by the productive batch size (defined above). A short request
  // occupies the GPU briefly and fairly bears little embodied carbon; a long
  // reasoning request bears proportionally more. Summed across the real
  // (right-skewed) mix of requests, this conserves the GPU's full
  // manufacturing amortisation.
  const embodiedGpuCO2 = (embodiedPerGpuGrams * gpuTimeSec * gpusUsed) / productiveBatch;

  // --- Embodied Other Compute (shared infrastructure: CPU, RAM, SSD, firewalls, switches)
  // Same lifetime utilization approach, divided among concurrent requests.
  // otherComputeEmbodiedKg is 0 for all configs (whole-node footprint is
  // already inside embodiedPerGpuKg), so this term is currently always zero.
  const otherComputePerSecond = (hardware.otherComputeEmbodiedKg * 1_000) / projectedActiveSeconds;
  const embodiedOtherCO2 = (otherComputePerSecond * gpuTimeSec) / productiveBatch;

  // --- Training (amortised) ---
  const trainingCO2 = includeTraining
    ? modelProfile.totalTrainingCO2Grams / lifetimeQueries
    : 0;

  const totalCO2 =
    gpuOperationalCO2 + idleOperationalCO2 + serverOperationalCO2 + overheadCO2 + embodiedGpuCO2 + embodiedOtherCO2 + trainingCO2;

  const totalEnergyKwh = gpuEnergyKwh + idleEnergyKwh + serverEnergyKwh;

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
      gpuOperational: mkComp(gpuOperationalCO2, gpuEnergyKwh, "GPU energy (compute)"),
      gpuIdle: mkComp(idleOperationalCO2, idleEnergyKwh, "GPU idle baseline (standby)"),
      serverOperational: mkComp(serverOperationalCO2, serverEnergyKwh, "Server infrastructure"),
      datacenterOverhead: mkComp(overheadCO2, 0, `Cooling & overhead (PUE ${pue.toFixed(2)})`),
      embodiedGpu: mkComp(embodiedGpuCO2, 0, "GPU embodied (amortised)"),
      embodiedOther: mkComp(embodiedOtherCO2, 0, "Other compute embodied (amortised)"),
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
