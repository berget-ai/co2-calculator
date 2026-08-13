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

  // Calculate GPUs needed based on the static weight-based memory estimate.
  const weightBasedGpus = Math.ceil(modelMemoryGb / hardware.gpuMemoryGb);

  // A model's weights may fit on N cards while its concurrency-driven KV
  // cache forces more. minGpus captures that production reality (e.g. a large
  // MoE serving many concurrent long-context requests). Sanitise it to a
  // finite non-negative integer so a fractional or NaN override can't leak
  // fractional GPUs (or NaN) into the rest of the calculation.
  const rawMin = modelProfile.minGpus;
  const minGpus =
    typeof rawMin === "number" && Number.isFinite(rawMin) ? Math.max(0, Math.floor(rawMin)) : 0;
  const gpusNeeded = Math.max(weightBasedGpus, minGpus);

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
// Deployment profiles (on-prem / shared / hyperscaler)
//
// WHO runs the hardware determines both how the fixed costs are shared and
// how efficiently the hardware is used. Each profile bundles the levers that
// move together in practice.
// ---------------------------------------------------------------------------

export type DeploymentProfile = "onprem" | "shared" | "hyperscaler";

export interface DeploymentProfileSpec {
  /**
   * Multiplier on the day-average concurrency used to divide the fixed costs.
   * A hyperscaler packs more concurrent requests onto the same GPU via
   * disaggregated serving (separate prefill/decode pools), so the fixed cost
   * is spread further. Conservative mid-point of the Splitwise 1.4–2.35×
   * throughput range (well below DistServe's 7.4× goodput extreme).
   */
  packingFactor: number;
  /**
   * Multiplier on GPU time per request. Disaggregated serving runs each phase
   * on hardware suited to it, cutting the GPU time a request occupies.
   * Splitwise reports ~20% lower cost at the same throughput (≈ ×0.8).
   */
  gpuTimeFactor: number;
  /**
   * Power usage effectiveness for the facility. On-prem uses a typical
   * enterprise server-room value; shared uses the datacentre's measured PUE
   * (so it is left undefined and falls through to the grid); hyperscaler uses
   * the hyperscale fleet average (Google 2025: 1.09; Uptime Institute global
   * average 1.54).
   */
  pueOverride?: number;
}

export const DEPLOYMENT_PROFILES: Record<DeploymentProfile, DeploymentProfileSpec> = {
  // Your own server: no sharing (concurrency 1, handled separately), no
  // packing benefit, no serving-stack efficiency gain, enterprise PUE.
  onprem: {
    packingFactor: 1,
    gpuTimeFactor: 1,
    pueOverride: 1.4, // Uptime Institute global average ~1.54; small server room ~1.4
  },
  // Shared (Berget): the reference point. Day-average concurrency, standard
  // GPU time, and the datacentre's measured PUE (Nordics ~1.15) from the grid.
  shared: {
    packingFactor: 1,
    gpuTimeFactor: 1,
    pueOverride: undefined, // fall through to the grid's typicalPue
  },
  // Hyperscaler: disaggregated serving (Splitwise/DistServe) packs ~2× the
  // effective concurrency and cuts GPU time ~20%, in a hyperscale facility.
  hyperscaler: {
    packingFactor: 2.0, // Splitwise 1.4–2.35× throughput; conservative mid-point
    gpuTimeFactor: 0.8, // Splitwise ~20% lower cost at same throughput
    pueOverride: 1.1, // Google fleet average 1.09 (2025)
  },
};

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

  // --- Split shared-cost denominators (gpuConcurrency vs nodeConcurrency) ---
  // Two physically distinct fixed costs are shared across DIFFERENT groups:
  //
  //  * GPU-related fixed costs (GPU compute energy, GPU idle standby, GPU
  //    embodied) are shared only by the requests genuinely resident on THIS
  //    model's GPU batch — measured via Little's Law. That is `gpuConcurrency`.
  //
  //  * Node-level fixed costs (server chassis energy and the supporting-
  //    infrastructure embodied term: databases, logging/storage, network gear)
  //    are shared by the WHOLE node's request load, which is broader than a
  //    single model's GPU batch. That is `nodeConcurrency`.
  //
  // Using one denominator for both is the sliding system boundary we call out
  // in the article, so they are kept separate. Each falls back to the generic
  // `concurrency` (and thence to the derived value) when not given, which
  // preserves the pre-split behaviour for existing callers.
  const clampConc = (v: number | undefined, fallback: number) =>
    Math.max(1, Math.round(Number.isFinite(v as number) ? (v as number) : fallback));
  const gpuConcurrency =
    deployment === "onprem" ? 1 : clampConc(params.gpuConcurrency, concurrency);
  const nodeConcurrency =
    deployment === "onprem" ? 1 : clampConc(params.nodeConcurrency, concurrency);

  // --- Day-average concurrency for FIXED-cost allocation ---
  //
  // The node's fixed costs (GPU idle standby, server chassis energy, GPU
  // embodied, supporting-infra embodied) are SUNK costs: the node is powered
  // on 24/7 and accrues them around the clock regardless of whether any
  // request arrives. They must therefore be amortised over the WHOLE DAY's
  // work, not over the instantaneous concurrency of the moment a request
  // happens to land.
  //
  // The bug this fixes: dividing the fixed cost by the INSTANTANEOUS
  // (time-of-day-scaled) concurrency makes a single night request (derived
  // concurrency → 1) bear the node's ENTIRE fixed cost — up to ~21× its fair
  // share — even though the node would have burned that idle power anyway had
  // the request never arrived. Day traffic "pays for" the night idle, so
  // night requests are already "paid for".
  //
  // The day-average concurrency IS the model's measured `defaultConcurrency`
  // (Little's Law over a 30-day window): it is the average number of requests
  // resident across the whole day. When the caller does not override the
  // concurrency, we use it directly as the fixed-cost denominator — the
  // time-of-day pattern then only modulates the grid carbon intensity (see
  // applyTimeOfDay), which is the physically correct place for a night/day
  // difference.
  //
  // Precedence for the fixed-cost denominator (highest first):
  //   1. explicit `gpuConcurrency`/`nodeConcurrency` (the caller knows the
  //      real batch — honour it verbatim);
  //   2. explicit deprecated `concurrency` (the caller pinned a value — use it
  //      for both, preserving the pre-split contract);
  //   3. the model's measured `defaultConcurrency` (the day average) — this is
  //      the case that fixes the night explosion, because it ignores the
  //      time-of-day collapse.
  const explicitConc = params.concurrency;
  // Fallback for the fixed-cost denominator when the model has no measured
  // defaultConcurrency: use the GENERIC_DEFAULT_CONCURRENCY (a day-average
  // value), NOT the time-of-day-scaled `concurrency` — otherwise the
  // night-time fixed-cost spike is reintroduced for unmeasured/custom models.
  const gpuFixed =
    params.gpuConcurrency !== undefined
      ? gpuConcurrency
      : explicitConc !== undefined
        ? clampConc(explicitConc, concurrency)
        : clampConc(modelProfile.defaultConcurrency, GENERIC_DEFAULT_CONCURRENCY);
  const nodeFixed =
    params.nodeConcurrency !== undefined
      ? nodeConcurrency
      : explicitConc !== undefined
        ? clampConc(explicitConc, concurrency)
        : clampConc(modelProfile.defaultConcurrency, GENERIC_DEFAULT_CONCURRENCY);

  // --- Deployment profile (who runs the hardware) ---
  // The packing factor captures how much further the fixed cost is spread on
  // this deployment: a hyperscaler's disaggregated serving packs more
  // concurrent requests onto the same GPU, so each request bears a smaller
  // share of the fixed cost. On-prem packs nothing (you are alone).
  const profile = DEPLOYMENT_PROFILES[deployment];
  const dayAverageGpuConcurrency =
    deployment === "onprem" ? 1 : gpuFixed * profile.packingFactor;
  const dayAverageNodeConcurrency =
    deployment === "onprem" ? 1 : nodeFixed * profile.packingFactor;

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
  // Concurrency delay models queueing on THIS model's GPU batch, so it uses
  // the GPU concurrency (not the broader node concurrency).
  const concurrencyAdjustedTime = applyConcurrencyDelay(tokenAdjustedTime, gpuConcurrency);
  // The deployment profile's serving-stack efficiency: a hyperscaler's
  // disaggregated serving (separate prefill/decode pools) cuts the GPU time a
  // request occupies (Splitwise ~20% lower cost at the same throughput).
  const gpuTimeSec = concurrencyAdjustedTime * profile.gpuTimeFactor;
  const gpuTimeH = gpuTimeSec / SECONDS_IN_HOUR;

  // --- Shared-cost denominators (split: GPU batch vs node batch) ---
  // vLLM's `request_inference_time` is WALL-CLOCK residency time: with
  // continuous batching, N requests each record the full duration they were
  // resident even though they shared the GPU. The GPU is one device with one
  // power draw; batching amortises energy and embodied carbon across the
  // batch, it does not multiply them.
  //
  // `defaultConcurrency` is measured via Little's Law on end-to-end latency
  // (rate × mean latency). For a shared deployment this is the model's **GPU
  // batch**: the requests genuinely resident on THIS model's GPU. It is the
  // denominator for the GPU-related fixed costs (GPU compute energy, GPU idle
  // standby, GPU embodied). Each request then bears its own (token-adjusted)
  // GPU time's worth of that shared rate — short requests a little, long
  // requests more — and the total across the real request mix conserves the
  // GPU's fixed cost.
  //
  // The node-level fixed costs are a DIFFERENT, broader group: the server
  // chassis energy and the supporting-infrastructure embodied term
  // (databases, logging/storage, network gear) serve the WHOLE node's request
  // load, not just one model's GPU batch. They are divided by
  // `nodeConcurrency`, which is typically larger than `gpuConcurrency`.
  // Keeping the two denominators distinct avoids understating the GPU share —
  // see the split note where they are derived above.
  //
  // Both denominators use the DAY-AVERAGE concurrency (not the instantaneous
  // time-of-day value) so the fixed cost is amortised over the whole day —
  // see the day-average note above. The instantaneous `gpuConcurrency` is
  // still used for the concurrency-delay (latency) term, where the moment's
  // contention genuinely affects the response time.
  const gpuBatch = dayAverageGpuConcurrency;
  const nodeBatch = dayAverageNodeConcurrency;

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
  const gpuEnergyKwh = (incrementalPerGpuWatts * gpuTimeH * gpusUsed) / gpuBatch / 1_000;
  const gpuOperationalCO2 = gpuEnergyKwh * effectiveIntensity;

  // --- GPU idle baseline (standby draw, shared across batch) ---
  // The node's idle draw over this request's GPU residency, split among the
  // requests genuinely sharing the GPU (productive batch — see embodied note
  // below). Uses this request's own GPU time, so short requests bear little
  // standby cost and long requests more; the productive-batch denominator
  // keeps the total conserved across the skewed request mix.
  const idleEnergyKwh = (idlePerGpuWatts * gpuTimeH * gpusUsed) / gpuBatch / 1_000;
  const idleOperationalCO2 = idleEnergyKwh * effectiveIntensity;

  // --- Server Infrastructure (Section 3.6) ---
  // Server chassis power is a fixed per-node cost shared across the node's
  // whole request load (nodeConcurrency) — broader than one model's GPU batch.
  // Energy is per-request (divided by nodeBatch), and the CO₂ follows
  // directly from that per-request energy — keeping energyKwh, totalEnergyKwh
  // and waterLiters consistent with the CO₂ components.
  const serverEnergyKwh = (hardware.chassisWatts * gpuTimeH) / nodeBatch / 1_000;
  const serverOperationalCO2 = serverEnergyKwh * effectiveIntensity;

  // --- PUE overhead (deployment-specific) ---
  // The facility's power usage effectiveness depends on WHO runs it: an
  // on-prem server room (~1.4), a shared Nordic datacentre (the grid's
  // measured typicalPue, ~1.15), or a hyperscale facility (~1.1, Google fleet
  // average 1.09). The deployment profile overrides the grid default when set.
  const pue = profile.pueOverride ?? deploymentGrid.typicalPue;
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
  const embodiedGpuCO2 = (embodiedPerGpuGrams * gpuTimeSec * gpusUsed) / gpuBatch;

  // --- Embodied Other Compute (separate supporting infrastructure) ---
  // Databases, logging/object-storage servers and network gear that serve the
  // node but are NOT part of its chassis (that is already in embodiedPerGpuKg)
  // and NOT in its measured power draw. Same lifetime-utilisation amortisation
  // as the GPU, divided among the requests sharing the node. This term is
  // region-independent (the same supporting stack exists everywhere) and is
  // needed for the totals to reconcile against real-world consumption.
  const otherComputePerSecond = (hardware.otherComputeEmbodiedKg * 1_000) / projectedActiveSeconds;
  const embodiedOtherCO2 = (otherComputePerSecond * gpuTimeSec) / nodeBatch;

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
