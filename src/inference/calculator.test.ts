/**
 * Comprehensive tests for the inference calculator.
 *
 * These validate every formula that emerged from iterative calibration
 * against production data. If any calculation changes, this suite
 * should fail loudly.
 */

import { describe, it, expect } from "vitest";
import { calculateInference, calculateComparisons, fmtTime } from "./calculator";
import { MODEL_PROFILES } from "./models";
import { HARDWARE_CONFIGS } from "./hardware";
import { GRID_REGIONS } from "./grids";
import type { InferenceParams } from "./types";

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

  it("allocates all node GPUs for huge models (>100B)", () => {
    const kimi = baseParams({
      modelProfile: MODEL_PROFILES["moonshotai/Kimi-K2.6"],
    });
    const result = calculateInference(kimi);
    expect(result.gpusAllocated).toBe(8);
  });

  it("adjusts CI by peak-period factor at 14:00", () => {
    const result = calculateInference(baseParams());
    expect(result.effectiveIntensityGPerKwh).toBeCloseTo(8 * 1.15, 1);
    expect(result.timing.periodFactor).toBe(1.15);
    expect(result.timing.isLowPeriod).toBe(false);
  });

  it("adjusts CI by low-period factor at 03:00", () => {
    const result = calculateInference(baseParams({ hourOfDay: 3 }));
    expect(result.effectiveIntensityGPerKwh).toBeCloseTo(8 * 0.70, 1);
    expect(result.timing.periodFactor).toBe(0.70);
    expect(result.timing.isLowPeriod).toBe(true);
  });

  it("excludes training CO₂ when includeTraining is false", () => {
    const withTraining = calculateInference(baseParams());
    const without = calculateInference(baseParams({ includeTraining: false }));
    expect(without.components.trainingAmortised.co2Grams).toBe(0);
    expect(withTraining.components.trainingAmortised.co2Grams).toBeGreaterThan(0);
  });

  it("amortises training over lifetime requests", () => {
    const result1B = calculateInference(baseParams({ lifetimeQueries: 1_000_000_000 }));
    const result10B = calculateInference(baseParams({ lifetimeQueries: 10_000_000_000 }));
    expect(result10B.components.trainingAmortised.co2Grams).toBeCloseTo(
      result1B.components.trainingAmortised.co2Grams / 10, 6
    );
  });

  it("shared server overhead decreases with higher concurrency", () => {
    const single = calculateInference(baseParams({ concurrency: 1 }));
    const shared = calculateInference(baseParams({ concurrency: 20 }));
    expect(shared.components.serverOperational.co2Grams).toBe(
      single.components.serverOperational.co2Grams / 20
    );
  });

  it("embodied scales with GPU time", () => {
    const fast = calculateInference(baseParams({ measuredResponseTimeSeconds: 0.5 }));
    const slow = calculateInference(baseParams({ measuredResponseTimeSeconds: 5.0 }));
    expect(slow.components.embodied.co2Grams).toBeCloseTo(
      fast.components.embodied.co2Grams * 10, 4
    );
  });

  it("produces reasonable total for Llama 8B on Sweden H200", () => {
    const result = calculateInference(baseParams());
    // Should be in the ~0.01–0.1g range (not 0.69g like the old bug!)
    expect(result.totalCO2Grams).toBeGreaterThan(0);
    expect(result.totalCO2Grams).toBeLessThan(0.2);
  });

  it("produces higher total for same model on Texas vs Sweden", () => {
    const sweden = calculateInference(baseParams({ deploymentGrid: GRID_REGIONS.sweden }));
    const texas = calculateInference(baseParams({ deploymentGrid: GRID_REGIONS.texas }));
    expect(texas.totalCO2Grams).toBeGreaterThan(sweden.totalCO2Grams);
  });

  it("total equals sum of components", () => {
    const r = calculateInference(baseParams());
    const sum =
      r.components.gpuOperational.co2Grams +
      r.components.serverOperational.co2Grams +
      r.components.datacenterOverhead.co2Grams +
      r.components.embodied.co2Grams +
      r.components.trainingAmortised.co2Grams;
    expect(r.totalCO2Grams).toBeCloseTo(sum, 4);
  });
});

describe("calculateComparisons", () => {
  it("microwave seconds scale with reference grid intensity", () => {
    // 0.1g CO₂ on Sweden (8 g/kWh) → more energy than on Texas (420 g/kWh)
    const onSweden = calculateComparisons(0.1, GRID_REGIONS.sweden);
    const onTexas = calculateComparisons(0.1, GRID_REGIONS.texas);
    expect(onSweden.microwaveSeconds).toBeGreaterThan(onTexas.microwaveSeconds);
  });

  it("car km are grid-independent", () => {
    const onSweden = calculateComparisons(0.1, GRID_REGIONS.sweden);
    const onTexas = calculateComparisons(0.1, GRID_REGIONS.texas);
    expect(onSweden.carKm).toBe(onTexas.carKm);
  });

  it("flight permille is proportional to CO₂", () => {
    const half = calculateComparisons(0.05, GRID_REGIONS.sweden);
    const full = calculateComparisons(0.1, GRID_REGIONS.sweden);
    expect(full.flightPermille).toBe(half.flightPermille * 2);
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
