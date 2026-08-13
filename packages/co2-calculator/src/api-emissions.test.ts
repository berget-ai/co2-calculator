/**
 * Tests for the public ApiEmissions schema mapping.
 */

import { describe, it, expect } from "vitest";
import { calculateInference } from "./calculator.js";
import { toApiEmissions, METHODOLOGY_URL } from "./api-emissions.js";
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
  includeTraining: false,
  lifetimeQueries: 0,
  ...overrides,
});

describe("toApiEmissions", () => {
  it("maps the total and the operational/embodied split", () => {
    const result = calculateInference(baseParams());
    const api = toApiEmissions(result, "sweden", "1.0.0");

    const c = result.components;
    const expectedOperational =
      c.gpuOperational.co2Grams +
      c.gpuIdle.co2Grams +
      c.serverOperational.co2Grams +
      c.datacenterOverhead.co2Grams;
    const expectedEmbodied = c.embodiedGpu.co2Grams + c.embodiedOther.co2Grams;

    expect(api.co2e_grams).toBe(result.totalCO2Grams);
    expect(api.energy_kwh).toBe(result.totalEnergyKwh);
    expect(api.operational.co2e_grams).toBeCloseTo(expectedOperational, 9);
    expect(api.embodied.co2e_grams).toBeCloseTo(expectedEmbodied, 9);
  });

  it("operational + embodied equals the total (when training is excluded)", () => {
    const result = calculateInference(baseParams());
    const api = toApiEmissions(result, "sweden", "1.0.0");
    expect(api.operational.co2e_grams + api.embodied.co2e_grams).toBeCloseTo(api.co2e_grams, 6);
  });

  it("records the grid region and the effective intensity used", () => {
    const result = calculateInference(baseParams({ deploymentGrid: GRID_REGIONS.germany }));
    const api = toApiEmissions(result, "germany", "1.0.0");
    expect(api.grid.region).toBe("germany");
    expect(api.grid.carbon_intensity_gco2e_per_kwh).toBe(result.effectiveIntensityGPerKwh);
  });

  it("carries the methodology URL and version", () => {
    const result = calculateInference(baseParams());
    const api = toApiEmissions(result, "sweden", "9.9.9");
    expect(api.methodology).toBe(METHODOLOGY_URL);
    expect(api.methodology_version).toBe("9.9.9");
  });

  it("uses grams and kWh (readable magnitudes at per-request scale)", () => {
    const result = calculateInference(baseParams());
    const api = toApiEmissions(result, "sweden", "1.0.0");
    // A single inference is a fraction of a gram and a tiny kWh — both must be
    // plain decimals, never scientific-notation-prone kg or joules.
    expect(api.co2e_grams).toBeGreaterThan(0);
    expect(api.co2e_grams).toBeLessThan(1);
    expect(api.energy_kwh).toBeGreaterThan(0);
    expect(api.energy_kwh).toBeLessThan(0.01);
  });
});
