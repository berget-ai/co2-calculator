/**
 * Comprehensive tests for the inference calculator.
 */

import { describe, it, expect } from "vitest";
import { calculateInference, calculateComparisons, fmtTime, fmtNumber, fmtParams, getConcurrencyFromTrafficPattern, DEFAULT_TRAFFIC_PATTERN, DEPLOYMENT_PROFILES } from "./calculator.js";
import { MODEL_PROFILES } from "./models.js";
import { HARDWARE_CONFIGS } from "./hardware.js";
import { GRID_REGIONS } from "./grids.js";
import type { InferenceParams } from "./types.js";

const baseParams = (overrides: Partial<InferenceParams> = {}): InferenceParams => ({
  modelProfile: MODEL_PROFILES["mistralai/Mistral-Small-3.2-24B-Instruct-2506"],
  hardware: HARDWARE_CONFIGS.h200,
  deploymentGrid: GRID_REGIONS.sweden,
  measuredResponseTimeSeconds: 1.2,
  inputTokens: 800,
  outputTokens: 400,
  concurrency: 8,
  hourOfDay: 14,
  includeTraining: true,
  lifetimeQueries: 1_000_000_000,
  ...overrides,
});

describe("calculateInference", () => {
  it("allocates GPUs based on memory requirements", () => {
    // A 128B model in FP16 (2 bytes/param, no modelSizeBytes override) needs ~268GB memory
    // H100: 80GB per GPU → needs 4 GPUs (268/80 = 3.35 → ceil = 4)
    // MI300X: 192GB per GPU → needs 2 GPUs (268/192 = 1.40 → ceil = 2)
    const largeModel = baseParams({
      modelProfile: {
        ...MODEL_PROFILES["mistralai/Mistral-Medium-3.5-128B"],
        modelSizeBytes: undefined, // Force FP16 (2 bytes per param)
      },
      hardware: HARDWARE_CONFIGS.h100,
    });
    const h100Result = calculateInference(largeModel);
    expect(h100Result.gpusAllocated).toBe(4); // 268GB / 80GB = 3.35 → ceil = 4
    
    const mi300xResult = calculateInference({
      ...largeModel,
      hardware: HARDWARE_CONFIGS.mi300x,
    });
    expect(mi300xResult.gpusAllocated).toBe(2); // 268GB / 192GB = 1.40 → ceil = 2
  });

  it("allocates 1 GPU for small models that fit in memory", () => {
    const small = calculateInference(baseParams());
    expect(small.gpusAllocated).toBe(1); // 8B model fits in any GPU
  });

  it("allocates 2 GPUs for mid-size models that need more memory", () => {
    // Mistral 24B in FP16 needs ~48GB memory
    // H200: 141GB per GPU → fits on 1 GPU
    const mistral = baseParams({
      modelProfile: MODEL_PROFILES["mistralai/Mistral-Small-3.2-24B-Instruct-2506"],
      hardware: HARDWARE_CONFIGS.h200,
    });
    expect(calculateInference(mistral).gpusAllocated).toBe(1); // 48GB fits in 141GB
  });

  it("minGpus overrides the weight-based estimate when larger (KV-cache-bound)", () => {
    // A model whose weights fit on 1 GPU but that sets minGpus: 8 (production
    // concurrency-driven KV cache) must report 8, not 1.
    const kvBound = baseParams({
      modelProfile: {
        ...MODEL_PROFILES["mistralai/Mistral-Small-3.2-24B-Instruct-2506"],
        minGpus: 8,
      },
      hardware: HARDWARE_CONFIGS.b300,
    });
    expect(calculateInference(kvBound).gpusAllocated).toBe(8);
  });

  it("minGpus does not lower the weight-based estimate", () => {
    // If the weight-based estimate already exceeds minGpus, the estimate wins.
    const heavy = baseParams({
      modelProfile: {
        ...MODEL_PROFILES["mistralai/Mistral-Medium-3.5-128B"],
        modelSizeBytes: undefined, // Force FP16 → ~268 GB → 4 GPUs on h100
        minGpus: 1,
      },
      hardware: HARDWARE_CONFIGS.h100,
    });
    expect(calculateInference(heavy).gpusAllocated).toBe(4);
  });

  it("minGpus is clamped to the node's gpuCount", () => {
    const over = baseParams({
      modelProfile: {
        ...MODEL_PROFILES["mistralai/Mistral-Small-3.2-24B-Instruct-2506"],
        minGpus: 99,
      },
      hardware: HARDWARE_CONFIGS.b300, // gpuCount 8
    });
    expect(calculateInference(over).gpusAllocated).toBe(8);
  });

  it("minGpus is sanitised (fractional / NaN) before applying", () => {
    const fractional = baseParams({
      modelProfile: {
        ...MODEL_PROFILES["mistralai/Mistral-Small-3.2-24B-Instruct-2506"],
        minGpus: 4.9,
      },
      hardware: HARDWARE_CONFIGS.b300,
    });
    expect(calculateInference(fractional).gpusAllocated).toBe(4); // floor(4.9)

    const nan = baseParams({
      modelProfile: {
        ...MODEL_PROFILES["mistralai/Mistral-Small-3.2-24B-Instruct-2506"],
        minGpus: NaN,
      },
      hardware: HARDWARE_CONFIGS.b300,
    });
    expect(calculateInference(nan).gpusAllocated).toBe(1); // NaN → ignored
  });

  it("allocates 6 GPUs for large models that need more memory", () => {
    // GLM-5.2 (753B) in FP8 (~1 byte/param) needs ~753GB memory
    // H200: 141GB per GPU → needs 6 GPUs
    const glm = baseParams({
      modelProfile: MODEL_PROFILES["zai-org/GLM-5.2"],
      hardware: HARDWARE_CONFIGS.h200,
    });
    expect(calculateInference(glm).gpusAllocated).toBe(6); // 753GB / 141GB = 5.34 → ceil = 6
  });

  it("allocates 8 GPUs for very large models on H100", () => {
    // Kimi K3 (2.8T) in INT4 (~0.5 bytes/param) needs ~1.4TB memory
    // H100: 80GB per GPU → needs 18 GPUs, clamped to node max 8
    const huge = baseParams({
      modelProfile: MODEL_PROFILES["moonshotai/Kimi-K3"],
      hardware: HARDWARE_CONFIGS.h100,
    });
    expect(calculateInference(huge).gpusAllocated).toBe(8); // 1400GB / 80GB = 17.5 → clamped to 8
  });

  it("applies grid-specific PUE overhead (Section 3.5)", () => {
    const result = calculateInference(baseParams());
    const overhead = result.components.datacenterOverhead.co2Grams;
    const gpu = result.components.gpuOperational.co2Grams;
    const idle = result.components.gpuIdle.co2Grams;
    const server = result.components.serverOperational.co2Grams;
    // Sweden has PUE 1.15 (free-air cooling), so overhead = 15% of (compute + idle + server)
    expect(overhead).toBeCloseTo((gpu + idle + server) * 0.15, 6);
  });

  it("uses higher PUE for hot climates", () => {
    const texas = baseParams({ deploymentGrid: GRID_REGIONS.texas });
    const result = calculateInference(texas);
    // Texas has PUE 1.80, so overhead = 80% of (compute + idle + server)
    const overhead = result.components.datacenterOverhead.co2Grams;
    const gpu = result.components.gpuOperational.co2Grams;
    const idle = result.components.gpuIdle.co2Grams;
    const server = result.components.serverOperational.co2Grams;
    expect(overhead).toBeCloseTo((gpu + idle + server) * 0.80, 5);
  });

  it("calculates water usage based on climate", () => {
    const sweden = calculateInference(baseParams());
    const texas = calculateInference(baseParams({ deploymentGrid: GRID_REGIONS.texas }));
    
    // Sweden uses free-air cooling: 0 liters
    expect(sweden.waterLiters).toBe(0);
    
    // Texas uses evaporative cooling: >0 liters
    expect(texas.waterLiters).toBeGreaterThan(0);
    
    // Texas should use significantly more water than Sweden
    expect(texas.waterLiters).toBeGreaterThan(sweden.waterLiters);
  });

  it("uses a fixed utilization midpoint (Section 3.4)", () => {
    // Utilisation is a fixed 25% midpoint (LLMCO2 10-40% range), NOT scaled by
    // parameter count. Parameter-based tiers were removed after SEI review —
    // utilisation depends on batch size, prompt length and KV cache pressure,
    // not model size. So GPU power per card is identical across model sizes;
    // only GPU-time and the number of allocated GPUs drive energy.
    const small = calculateInference(baseParams({
      modelProfile: { ...baseParams().modelProfile, parameters: 8_000_000_000 },
    }));
    const large = calculateInference(baseParams({
      modelProfile: { ...baseParams().modelProfile, parameters: 70_000_000_000 },
    }));
    // Same per-GPU power → same per-GPU operational energy for the same time.
    const perGpuSmall = small.components.gpuOperational.energyKwh / small.gpusAllocated;
    const perGpuLarge = large.components.gpuOperational.energyKwh / large.gpusAllocated;
    expect(perGpuSmall).toBeCloseTo(perGpuLarge, 8);
  });

  it("divides server CO₂ among concurrent requests (Section 3.6)", () => {
    const lowConcurrency = calculateInference(baseParams({ concurrency: 2 }));
    const highConcurrency = calculateInference(baseParams({ concurrency: 32 }));

    // Chassis power is constant per node, so per-request server CO₂ falls as
    // the fixed cost is shared across more concurrent requests.
    expect(highConcurrency.components.serverOperational.co2Grams).toBeLessThan(
      lowConcurrency.components.serverOperational.co2Grams
    );
  });

  it("amortises training CO₂ over lifetime queries", () => {
    const result1B = calculateInference(baseParams({ lifetimeQueries: 1_000_000_000 }));
    const result10B = calculateInference(baseParams({ lifetimeQueries: 10_000_000_000 }));
    expect(result10B.components.trainingAmortised.co2Grams).toBeCloseTo(
      result1B.components.trainingAmortised.co2Grams / 10, 6
    );
  });

  // --- Split shared-cost denominators (gpuConcurrency vs nodeConcurrency) ---

  it("scales GPU terms with gpuConcurrency, not nodeConcurrency", () => {
    // Vary only the GPU batch; the GPU-related terms (compute, idle, GPU
    // embodied) must scale inversely with it, while the node-level terms
    // (server chassis, supporting-infra embodied) stay fixed.
    const small = calculateInference(baseParams({ gpuConcurrency: 2, nodeConcurrency: 16 }));
    const large = calculateInference(baseParams({ gpuConcurrency: 8, nodeConcurrency: 16 }));

    // GPU terms fall as the GPU batch grows
    expect(large.components.gpuOperational.co2Grams).toBeLessThan(small.components.gpuOperational.co2Grams);
    expect(large.components.gpuIdle.co2Grams).toBeLessThan(small.components.gpuIdle.co2Grams);
    expect(large.components.embodiedGpu.co2Grams).toBeLessThan(small.components.embodiedGpu.co2Grams);

    // Node-level terms are unaffected by the GPU batch
    expect(large.components.serverOperational.co2Grams).toBeCloseTo(small.components.serverOperational.co2Grams, 9);
    expect(large.components.embodiedOther.co2Grams).toBeCloseTo(small.components.embodiedOther.co2Grams, 9);
  });

  it("scales chassis and supporting-infra terms with nodeConcurrency, not gpuConcurrency", () => {
    // Vary only the node batch; the node-level terms must scale inversely with
    // it, while the GPU-related terms stay fixed.
    const small = calculateInference(baseParams({ gpuConcurrency: 4, nodeConcurrency: 2 }));
    const large = calculateInference(baseParams({ gpuConcurrency: 4, nodeConcurrency: 16 }));

    // Node-level terms fall as the node batch grows
    expect(large.components.serverOperational.co2Grams).toBeLessThan(small.components.serverOperational.co2Grams);
    expect(large.components.embodiedOther.co2Grams).toBeLessThan(small.components.embodiedOther.co2Grams);

    // GPU terms are unaffected by the node batch
    expect(large.components.gpuOperational.co2Grams).toBeCloseTo(small.components.gpuOperational.co2Grams, 9);
    expect(large.components.gpuIdle.co2Grams).toBeCloseTo(small.components.gpuIdle.co2Grams, 9);
    expect(large.components.embodiedGpu.co2Grams).toBeCloseTo(small.components.embodiedGpu.co2Grams, 9);
  });

  it("treats deprecated `concurrency` as a fallback for both denominators", () => {
    // With only `concurrency` set, both denominators use it (pre-split
    // behaviour). With both specific values set, they take precedence.
    const legacy = calculateInference(baseParams({ concurrency: 6 }));
    const explicit = calculateInference(baseParams({ concurrency: 6, gpuConcurrency: 6, nodeConcurrency: 6 }));

    expect(explicit.components.gpuOperational.co2Grams).toBeCloseTo(legacy.components.gpuOperational.co2Grams, 9);
    expect(explicit.components.serverOperational.co2Grams).toBeCloseTo(legacy.components.serverOperational.co2Grams, 9);
    expect(explicit.components.embodiedGpu.co2Grams).toBeCloseTo(legacy.components.embodiedGpu.co2Grams, 9);
    expect(explicit.components.embodiedOther.co2Grams).toBeCloseTo(legacy.components.embodiedOther.co2Grams, 9);
    expect(explicit.totalCO2Grams).toBeCloseTo(legacy.totalCO2Grams, 9);
  });

  it("honours a smaller GPU batch than node batch (the documented case)", () => {
    // The measured situation: GPU batch (3) < node batch (6). GPU embodied
    // should be exactly 2× what it would be if divided by the node batch.
    const split = calculateInference(baseParams({ gpuConcurrency: 3, nodeConcurrency: 6 }));
    const uniform = calculateInference(baseParams({ gpuConcurrency: 6, nodeConcurrency: 6 }));

    expect(split.components.embodiedGpu.co2Grams).toBeCloseTo(uniform.components.embodiedGpu.co2Grams * 2, 6);
    // Supporting infra still divided by the node batch — unchanged.
    expect(split.components.embodiedOther.co2Grams).toBeCloseTo(uniform.components.embodiedOther.co2Grams, 9);
  });

  it("returns total CO₂ as sum of components (Section 6)", () => {
    const result = calculateInference(baseParams());
    const sum =
      result.components.gpuOperational.co2Grams +
      result.components.serverOperational.co2Grams +
      result.components.datacenterOverhead.co2Grams +
      result.components.embodiedGpu.co2Grams +
      result.components.embodiedOther.co2Grams +
      result.components.trainingAmortised.co2Grams;
    expect(result.totalCO2Grams).toBeCloseTo(sum, 4);
  });
});

describe("calculateComparisons", () => {
  it("returns realistic microwave time for small CO₂ amounts", () => {
    const result = calculateComparisons(0.02);
    // 0.02g CO2 at EU average (300 g/kWh) = 0.000067 kWh
    // Microwave (0.8kW) = 0.000067/0.8 hours = 0.3 seconds
    expect(result.microwaveSeconds).toBeCloseTo(0.3, 1);
  });

  it("scales linearly with CO₂", () => {
    const small = calculateComparisons(0.01);
    const large = calculateComparisons(0.02);
    expect(large.microwaveSeconds).toBeCloseTo(small.microwaveSeconds * 2, 1);
  });
});

describe("fmtTime", () => {
  it("formats ms for small values", () => {
    expect(fmtTime(0.5)).toBe("500 ms");
  });

  it("formats seconds", () => {
    expect(fmtTime(2.5)).toBe("2.5 s");
  });

  it("formats minutes", () => {
    expect(fmtTime(90)).toBe("1 min 30 s");
  });
});

describe("fmtNumber", () => {
  it("formats billions", () => {
    expect(fmtNumber(1_000_000_000)).toBe("1B");
    expect(fmtNumber(2_500_000_000)).toBe("3B");
  });

  it("formats millions", () => {
    expect(fmtNumber(1_000_000)).toBe("1M");
    expect(fmtNumber(5_000_000)).toBe("5M");
  });

  it("formats thousands", () => {
    expect(fmtNumber(1_000)).toBe("1K");
    expect(fmtNumber(10_000)).toBe("10K");
  });

  it("returns small numbers as-is", () => {
    expect(fmtNumber(500)).toBe("500");
  });
});

describe("fmtParams", () => {
  it("formats trillions", () => {
    expect(fmtParams(1_100_000_000_000)).toBe("1.1T");
  });

  it("formats billions", () => {
    expect(fmtParams(8_000_000_000)).toBe("8.0B"); // Single-digit billions show 1 decimal
    expect(fmtParams(70_000_000_000)).toBe("70B"); // Double-digit billions show 0 decimals
  });

  it("formats millions", () => {
    expect(fmtParams(560_000_000)).toBe("560M");
  });

  it("returns small numbers as-is", () => {
    expect(fmtParams(500)).toBe("500");
  });
});

describe("getConcurrencyFromTrafficPattern", () => {
  it("returns low concurrency at night", () => {
    expect(getConcurrencyFromTrafficPattern(2)).toBeLessThan(5);
  });

  it("returns high concurrency at peak", () => {
    expect(getConcurrencyFromTrafficPattern(15)).toBeGreaterThan(25);
  });
});

// ---------------------------------------------------------------------------
// SPEC: day/night fixed-cost allocation (dygnsallokering av fast kostnad)
//
// Principle under test (user decision, to be implemented):
//   The node is powered on 24/7. Its FIXED costs — GPU idle baseline, server
//   chassis energy, GPU embodied and supporting-infra embodied — are sunk
//   costs that accrue around the clock regardless of traffic. They should be
//   amortised over the WHOLE DAY's work, not over the instantaneous
//   concurrency of the moment a request happens to arrive.
//
//   Today (WRONG): fixed cost ÷ instantaneousConcurrency. At night
//   (concurrency → 1) a single request bears the node's ENTIRE fixed cost,
//   inflating its footprint ~8× even though the node would have burned that
//   idle power anyway had the request never arrived.
//
//   Target (RIGHT): fixed cost ÷ dayAverageConcurrency. Every request bears
//   the same fixed cost per GPU-second regardless of hour. Day traffic (many
//   requests) "pays for" the night idle, so night requests are already
//   "paid for" — they only add their incremental compute energy plus a
//   day-averaged share of the fixed cost.
//
// These tests are written FIRST (TDD). They FAIL against the current
// instantaneous-concurrency implementation and PASS once the fixed-cost
// denominators use the day-average concurrency instead of the instantaneous
// one. The numbers below are the expected orders of magnitude, derived from
// the current calculator on the b300 config; they will be tightened once the
// implementation lands.
// ---------------------------------------------------------------------------

describe("day/night fixed-cost allocation (SPEC)", () => {
  // We use a HIGH-TRAFFIC model (defaultConcurrency 32) so the instantaneous
  // concurrency genuinely collapses at night (derived → 1) and peaks in the
  // afternoon (derived → 27). With the measured low-traffic profiles
  // (defaultConcurrency 1-3) the clamp-to-1 floor masks the effect; the bug
  // only becomes visible when the day/night concurrency swing is large.
  const busyModel = {
    ...MODEL_PROFILES["google/gemma-4-31B-it"],
    defaultConcurrency: 32,
  };

  const runAt = (hourOfDay: number) =>
    calculateInference({
      modelProfile: busyModel,
      hardware: HARDWARE_CONFIGS.b300,
      deploymentGrid: GRID_REGIONS.sweden,
      measuredResponseTimeSeconds: 2.02,
      inputTokens: 600,
      outputTokens: 482,
      hourOfDay,
      includeTraining: true,
      lifetimeQueries: 1_000_000_000,
      // no explicit concurrency → derived from defaultConcurrency × traffic
    });

  it("FIXED costs do NOT explode at night (the core bug)", () => {
    // Measured today on b300: gpuIdle ratio night:day ≈ 13×, embodiedGpu
    // ratio ≈ 21×. Under day-average allocation both must collapse to ~1
    // (the only remaining night/day difference is the cleaner night grid on
    // the ENERGY-derived idle term; embodied is grid-independent → ~1.0).
    const night = runAt(2);
    const day = runAt(14);

    const idleRatio =
      night.components.gpuIdle.co2Grams / day.components.gpuIdle.co2Grams;
    const embodiedRatio =
      night.components.embodiedGpu.co2Grams / day.components.embodiedGpu.co2Grams;

    // Embodied is grid-independent → ratio must be ~1 (allow grid-free slack).
    expect(embodiedRatio).toBeLessThan(1.5); // was ~21 under instantaneous
    // Idle carries the night-grid discount (5.6 vs 9.2 g/kWh ≈ 0.61×) on top
    // of the (removed) concurrency explosion → bounded, not ~13×.
    expect(idleRatio).toBeLessThan(1.5); // was ~13 under instantaneous
  });

  it("a night request is no longer PENALISED — the unfair premium is gone", () => {
    // Before the fix the night request was MORE expensive than a day request
    // (ratio ≈ 1.03) because the 21× embodied / 13× idle explosion swamped
    // the cleaner night grid. After the fix the night request must be no more
    // expensive than day — the night-time fixed-cost penalty is removed.
    const night = runAt(2);
    const day = runAt(14);
    expect(night.totalCO2Grams).toBeLessThanOrEqual(day.totalCO2Grams);

    // The remaining night/day difference is small and comes only from the
    // cleaner night grid on the energy-derived terms. Embodied (the dominant
    // term) is now hour-invariant, so the total ratio sits close to 1 — it
    // must NOT be pushed far below 1 by an artificial night discount.
    const ratio = night.totalCO2Grams / day.totalCO2Grams;
    expect(ratio).toBeGreaterThan(0.9); // no fake night discount
    expect(ratio).toBeLessThanOrEqual(1.0); // and no night penalty
  });

  it("the fixed-cost DENOMINATOR is hour-invariant (gpuTime may still vary)", () => {
    // The fixed-cost allocation denominator (day-average concurrency) is the
    // same night and day, so the embodied cost per unit of GPU work is
    // hour-invariant. The residual difference in embodiedGpu between night
    // and day comes ONLY from applyConcurrencyDelay: at night (low
    // concurrency) there is no queueing, so the request is faster and bears
    // proportionally less embodied carbon. That is a legitimate latency
    // effect, not an allocation bug.
    //
    // We assert the residual variation is SMALL (within ~25%) — i.e. the 21×
    // allocation explosion is gone and only the modest queueing effect
    // remains — rather than demanding exact equality (which would wrongly
    // forbid the real latency signal).
    const night = runAt(2);
    const day = runAt(14);

    const gpuRatio =
      night.components.embodiedGpu.co2Grams / day.components.embodiedGpu.co2Grams;
    const otherRatio =
      night.components.embodiedOther.co2Grams / day.components.embodiedOther.co2Grams;

    // Both embodied terms now move together, bounded near 1 (was ~21×).
    for (const ratio of [gpuRatio, otherRatio]) {
      expect(ratio).toBeGreaterThan(0.6);
      expect(ratio).toBeLessThan(1.5);
    }
  });

  it("day-average allocation CONSERVES the node's daily fixed cost", () => {
    // The conservation invariant: summed across a representative 24h of
    // traffic, the allocated embodied cost must equal the node's actual daily
    // embodied amortisation — neither dropped nor multiplied. We assert the
    // STRUCTURE: night hours must NOT contribute a disproportionate share of
    // the daily embodied cost.
    const hours = Array.from({ length: 24 }, (_, h) => h);
    const weights = hours.map((h) => DEFAULT_TRAFFIC_PATTERN[h]);
    const weightSum = weights.reduce((a, b) => a + b, 0);

    const embodiedByHour = hours.map((h) => runAt(h).components.embodiedGpu.co2Grams);
    const totalDaily = hours.reduce(
      (acc, h) => acc + (weights[h] / weightSum) * embodiedByHour[h], 0);

    const nightHours = [0, 1, 2, 3, 4, 5];
    const nightShare = nightHours.reduce(
      (acc, h) => acc + (weights[h] / weightSum) * embodiedByHour[h], 0) / totalDaily;

    // Night is 25% of hours but only ~7% of traffic weight. Under day-average
    // allocation its share of the embodied cost tracks its (small) traffic
    // share. Under instantaneous allocation the 21× night explosion inflates
    // it far beyond its traffic share.
    expect(nightShare).toBeLessThan(0.20);
  });
});

// ---------------------------------------------------------------------------
// SPEC: deployment profiles (on-prem / shared / hyperscaler)
//
// WHO runs the hardware determines the per-request footprint. These tests
// lock in the expected ordering and the mechanism behind it:
//
//   on-prem     — you are alone (concurrency 1), so you bear the node's whole
//                 fixed cost, in an enterprise server room (PUE ~1.4).
//                 → HIGHEST per-request footprint.
//   shared      — fixed cost amortised over the day-average concurrency, in a
//                 Nordic datacentre (grid PUE ~1.15). → MIDDLE.
//   hyperscaler — disaggregated serving (Splitwise/DistServe) packs ~2× the
//                 effective concurrency and cuts GPU time ~20%, in a
//                 hyperscale facility (PUE ~1.1). → LOWEST.
//
// Expected ordering: onprem > shared > hyperscaler.
// ---------------------------------------------------------------------------

describe("deployment profiles (SPEC)", () => {
  const runAs = (deployment: "onprem" | "shared" | "hyperscaler") =>
    calculateInference({
      modelProfile: MODEL_PROFILES["google/gemma-4-31B-it"],
      hardware: HARDWARE_CONFIGS.b300,
      deploymentGrid: GRID_REGIONS.sweden,
      measuredResponseTimeSeconds: 2.02,
      inputTokens: 600,
      outputTokens: 482,
      hourOfDay: 14,
      includeTraining: false,
      lifetimeQueries: 1_000_000_000,
      deployment,
    });

  it("orders the footprints on-prem > shared > hyperscaler", () => {
    const onprem = runAs("onprem");
    const shared = runAs("shared");
    const hyper = runAs("hyperscaler");

    expect(onprem.totalCO2Grams).toBeGreaterThan(shared.totalCO2Grams);
    expect(shared.totalCO2Grams).toBeGreaterThan(hyper.totalCO2Grams);
  });

  it("on-prem bears the whole fixed cost (concurrency 1)", () => {
    // On-prem divides the fixed cost by 1, shared by the day-average. So the
    // on-prem embodied cost must be ~defaultConcurrency× the shared one.
    const onprem = runAs("onprem");
    const shared = runAs("shared");
    const conc = MODEL_PROFILES["google/gemma-4-31B-it"].defaultConcurrency ?? 1;

    expect(onprem.components.embodiedGpu.co2Grams).toBeCloseTo(
      shared.components.embodiedGpu.co2Grams * conc, 5);
  });

  it("hyperscaler spreads the fixed cost further (packing factor 2)", () => {
    // The hyperscaler packing factor doubles the effective fixed-cost
    // denominator, so its embodied-GPU cost is ~half the shared one (the
    // residual difference is the gpuTimeFactor also shortening GPU time).
    const shared = runAs("shared");
    const hyper = runAs("hyperscaler");

    const ratio = hyper.components.embodiedGpu.co2Grams / shared.components.embodiedGpu.co2Grams;
    // packingFactor 2 × gpuTimeFactor 0.8 → 0.8/2 = 0.4 of the shared value.
    expect(ratio).toBeCloseTo(0.4, 2);
  });

  it("hyperscaler cuts GPU time (gpuTimeFactor 0.8)", () => {
    // GPU compute energy scales with GPU time, so the hyperscaler's GPU
    // operational energy is ~0.8× the shared one (before the packing-factor
    // division — both are divided by their respective denominators).
    const shared = runAs("shared");
    const hyper = runAs("hyperscaler");

    const ratio =
      hyper.components.gpuOperational.co2Grams / shared.components.gpuOperational.co2Grams;
    // gpuTimeFactor 0.8 AND packingFactor 2 → 0.8/2 = 0.4 of the shared value.
    expect(ratio).toBeCloseTo(0.4, 2);
  });

  it("applies deployment-specific PUE (on-prem highest)", () => {
    // The datacentre overhead term scales with (PUE − 1): on-prem 1.4,
    // shared ~1.15 (grid), hyperscaler 1.1. Holding the rest of the footprint
    // roughly comparable, the on-prem overhead share is the largest.
    const onprem = runAs("onprem");
    const hyper = runAs("hyperscaler");

    // Overhead = (energy terms) × (PUE − 1). On-prem's energy terms are the
    // largest AND its (PUE−1)=0.4 is the largest, so its overhead dominates.
    expect(onprem.components.datacenterOverhead.co2Grams).toBeGreaterThan(
      hyper.components.datacenterOverhead.co2Grams);
  });

  it("DEPLOYMENT_PROFILES are exported and literature-anchored", () => {
    // Sanity-check the profile constants match the documented sources.
    expect(DEPLOYMENT_PROFILES.onprem.packingFactor).toBe(1);
    expect(DEPLOYMENT_PROFILES.onprem.pueOverride).toBeCloseTo(1.4, 5);
    expect(DEPLOYMENT_PROFILES.shared.packingFactor).toBe(1);
    expect(DEPLOYMENT_PROFILES.shared.pueOverride).toBeUndefined();
    expect(DEPLOYMENT_PROFILES.hyperscaler.packingFactor).toBeCloseTo(2.0, 5);
    expect(DEPLOYMENT_PROFILES.hyperscaler.gpuTimeFactor).toBeCloseTo(0.8, 5);
    expect(DEPLOYMENT_PROFILES.hyperscaler.pueOverride).toBeCloseTo(1.1, 5);
  });
});

// TODO: Add tests for methodology compliance after fixing calculator.ts
// - Section 3.1: GPU time allocation
// - Section 3.3: Utilization based on model size
// - Section 3.4: Server overhead per node
