/**
 * Comprehensive tests for the inference calculator.
 */

import { describe, it, expect } from "vitest";
import { calculateInference, calculateComparisons, fmtTime, fmtNumber, fmtParams, getConcurrencyFromTrafficPattern } from "./calculator.js";
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

  it("allocates 2 GPUs for large models that need more memory", () => {
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
    const server = result.components.serverOperational.co2Grams;
    // Sweden has PUE 1.15 (free-air cooling), so overhead = 15%
    expect(overhead).toBeCloseTo((gpu + server) * 0.15, 6);
  });

  it("uses higher PUE for hot climates", () => {
    const texas = baseParams({ deploymentGrid: GRID_REGIONS.texas });
    const result = calculateInference(texas);
    // Texas has PUE 1.80, so overhead = 80%
    const overhead = result.components.datacenterOverhead.co2Grams;
    const gpu = result.components.gpuOperational.co2Grams;
    const server = result.components.serverOperational.co2Grams;
    expect(overhead).toBeCloseTo((gpu + server) * 0.80, 5);
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

// TODO: Add tests for methodology compliance after fixing calculator.ts
// - Section 3.1: GPU time allocation
// - Section 3.3: Utilization based on model size
// - Section 3.4: Server overhead per node
