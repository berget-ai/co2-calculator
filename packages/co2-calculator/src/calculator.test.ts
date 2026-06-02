/**
 * Comprehensive tests for the inference calculator.
 */

import { describe, it, expect } from "vitest";
import { calculateInference, calculateComparisons, fmtTime, getConcurrencyFromTrafficPattern } from "./calculator.js";
import { MODEL_PROFILES } from "./models.js";
import { HARDWARE_CONFIGS } from "./hardware.js";
import { GRID_REGIONS } from "./grids.js";
import type { InferenceParams } from "./types.js";

const baseParams = (overrides: Partial<InferenceParams> = {}): InferenceParams => ({
  modelProfile: MODEL_PROFILES["meta-llama/Llama-3.1-8B-Instruct"],
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
  it("allocates 1 GPU for small models (≤10B)", () => {
    const result = calculateInference(baseParams());
    expect(result.gpusAllocated).toBe(1);
  });

  it("allocates 2 GPUs for mid-size models (10-40B)", () => {
    const mistral = baseParams({
      modelProfile: MODEL_PROFILES["mistralai/Mistral-Small-3.2-24B-Instruct-2506"],
    });
    expect(calculateInference(mistral).gpusAllocated).toBe(2);
  });

  it("allocates 4 GPUs for large models (40-100B)", () => {
    const llama70 = baseParams({
      modelProfile: MODEL_PROFILES["meta-llama/Llama-3.3-70B-Instruct"],
    });
    expect(calculateInference(llama70).gpusAllocated).toBe(4);
  });

  it("allocates 8 GPUs for very large models (>100B)", () => {
    const huge = baseParams({
      modelProfile: MODEL_PROFILES["moonshotai/Kimi-K2.6"],
    });
    expect(calculateInference(huge).gpusAllocated).toBe(8);
  });

  it("applies PUE overhead correctly (Section 3.5)", () => {
    const result = calculateInference(baseParams());
    const overhead = result.components.datacenterOverhead.co2Grams;
    const gpu = result.components.gpuOperational.co2Grams;
    const server = result.components.serverOperational.co2Grams;
    expect(overhead).toBeCloseTo((gpu + server) * 0.2, 6);
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
      result.components.embodied.co2Grams +
      result.components.trainingAmortised.co2Grams;
    expect(result.totalCO2Grams).toBeCloseTo(sum, 4);
  });
});

describe("calculateComparisons", () => {
  it("returns realistic microwave time for small CO₂ amounts", () => {
    const result = calculateComparisons(0.02, GRID_REGIONS.sweden);
    // 0.02g CO2 on Swedish grid (8g/kWh) = 0.0025 kWh
    // Microwave (0.8kW) = 0.0025/0.8 hours = 11.25 seconds
    expect(result.microwaveSeconds).toBeCloseTo(11.25, 1);
  });

  it("scales linearly with CO₂", () => {
    const small = calculateComparisons(0.01, GRID_REGIONS.sweden);
    const large = calculateComparisons(0.02, GRID_REGIONS.sweden);
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
