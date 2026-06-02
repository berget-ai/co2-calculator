/**
 * Comprehensive tests for the inference calculator.
 *
 * These validate every formula that emerged from iterative calibration
 * against production data. If any calculation changes, this suite
 * should fail loudly.
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
    const result = calculateInference(mistral);
    expect(result.gpusAllocated).toBe(2);
  });

  it("allocates 4 GPUs for large models (40-100B)", () => {
    const llama70 = baseParams({
      modelProfile: MODEL_PROFILES["meta-llama/Llama-3.3-70B-Instruct"],
    });
    const result = calculateInference(llama70);
    expect(result.gpusAllocated).toBe(4);
  });

  it("allocates 8 GPUs for very large models (>100B)", () => {
    const huge = baseParams({
      modelProfile: MODEL_PROFILES["moonshotai/Kimi-K2.6"],
    });
    const result = calculateInference(huge);
    expect(result.gpusAllocated).toBe(8);
  });

  it("calculates GPU operational energy based on response time", () => {
    const fast = calculateInference(baseParams({ measuredResponseTimeSeconds: 0.5 }));
    const slow = calculateInference(baseParams({ measuredResponseTimeSeconds: 5.0 }));
    expect(slow.components.gpuOperational.co2Grams).toBeGreaterThan(
      fast.components.gpuOperational.co2Grams
    );
  });

  it("applies PUE overhead correctly", () => {
    const result = calculateInference(baseParams());
    const overhead = result.components.datacenterOverhead.co2Grams;
    const gpu = result.components.gpuOperational.co2Grams;
    const server = result.components.serverOperational.co2Grams;
    // PUE 1.2 means 20% overhead on (gpu + server)
    expect(overhead).toBeCloseTo((gpu + server) * 0.2, 6);
  });

  it("amortises training CO₂ over lifetime queries", () => {
    const result1B = calculateInference(baseParams({ lifetimeQueries: 1_000_000_000 }));
    const result10B = calculateInference(baseParams({ lifetimeQueries: 10_000_000_000 }));
    expect(result10B.components.trainingAmortised.co2Grams).toBeCloseTo(
      result1B.components.trainingAmortised.co2Grams / 10, 6
    );
  });

  it("shared server overhead decreases with higher concurrency", () => {
    const single = calculateInference(baseParams({ concurrency: 1 }));
    const shared = calculateInference(baseParams({ concurrency: 20 }));
    
    // Per-request server cost should be lower with higher concurrency
    // (but not exactly 1/20 because response time increases with load)
    expect(shared.components.serverOperational.co2Grams)
      .toBeLessThan(single.components.serverOperational.co2Grams);
    
    // Should be roughly 1/10th (not 1/20th due to increased response time)
    expect(shared.components.serverOperational.co2Grams)
      .toBeLessThan(single.components.serverOperational.co2Grams / 5);
  });

  it("embodied scales with GPU time", () => {
    const fast = calculateInference(baseParams({ measuredResponseTimeSeconds: 0.5 }));
    const slow = calculateInference(baseParams({ measuredResponseTimeSeconds: 5.0 }));
    expect(slow.components.embodied.co2Grams).toBeCloseTo(
      fast.components.embodied.co2Grams * 10, 4
    );
  });

  it("returns total CO₂ as sum of components", () => {
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
  it("returns realistic comparisons for small CO₂ amounts", () => {
    const result = calculateComparisons(0.02, GRID_REGIONS.sweden);
    // 0.02g CO2 on Swedish grid (8g/kWh) = 0.0025 kWh
    // Microwave (0.8kW) = 0.0025/0.8 hours = 11.25 seconds
    expect(result.microwaveSeconds).toBeCloseTo(11.25, 1);
    expect(result.microwaveSeconds).toBeGreaterThan(5);
    expect(result.microwaveSeconds).toBeLessThan(30);
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

  it("formats hours", () => {
    expect(fmtTime(3_600)).toBe("1 hr 0 min");
  });
});

describe("getConcurrencyFromTrafficPattern", () => {
  it("returns low concurrency at night (02:00)", () => {
    expect(getConcurrencyFromTrafficPattern(2)).toBeLessThan(5);
  });

  it("returns medium concurrency in morning (10:00)", () => {
    const c = getConcurrencyFromTrafficPattern(10);
    expect(c).toBeGreaterThan(20);
    expect(c).toBeLessThan(40);
  });

  it("returns high concurrency at peak (15:00)", () => {
    const c = getConcurrencyFromTrafficPattern(15);
    expect(c).toBeGreaterThan(25);
  });

  it("returns reasonable concurrency at 14:00", () => {
    const c = getConcurrencyFromTrafficPattern(14);
    expect(c).toBeGreaterThan(25);
    expect(c).toBeLessThan(35);
  });
});
