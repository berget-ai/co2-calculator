import { describe, it, expect } from "vitest";
import {
  estimateCO2,
  estimateCO2FromTokens,
  estimateCO2FromEnergy,
  getModelCO2Profile,
  getAllModelCO2Profiles,
  setModelCO2Profile,
  MODEL_PROFILES,
} from "./calculator";
import {
  gramsCO2ePerKilowattHour,
  joules,
  gramsCO2e,
  kilogramsCO2e,
  hours,
  architectureEfficiencyFactor,
  modelParameters,
  flopsPerToken,
  watts,
} from "./units";
import { getCalculatorConfig } from "./config";
import type { ModelCO2Profile } from "./domain-types";

describe("CO2 Estimator — Business Logic", () => {
  describe("estimateCO2FromTokens", () => {
    it("should calculate operational + embodied carbon for a known model", () => {
      const result = estimateCO2FromTokens(
        1_000,
        "meta-llama/Llama-3.1-8B-Instruct",
        500,
      );

      expect(result.co2Grams).toBeGreaterThan(0);
      expect(result.co2PerToken).toBeGreaterThan(0);
      expect(result.method).toBe("token-estimate");
      expect(result.details.operationalCarbon).toBeGreaterThan(0);
      expect(result.details.embodiedCarbon).toBeGreaterThan(0);
      expect(result.details.totalCarbon).toBe(
        result.details.operationalCarbon + result.details.embodiedCarbon,
      );
    });

    it("should return zero for zero tokens (no computation)", () => {
      const result = estimateCO2FromTokens(
        0,
        "meta-llama/Llama-3.1-8B-Instruct",
      );

      expect(result.co2Grams).toBe(0);
      expect(result.co2PerToken).toBe(0);
      expect(result.details.operationalCarbon).toBe(0);
      expect(result.details.embodiedCarbon).toBe(0);
      expect(result.details.totalCarbon).toBe(0);
    });

    it("should use default carbon intensity when omitted", () => {
      const result = estimateCO2FromTokens(
        1_000,
        "meta-llama/Llama-3.1-8B-Instruct",
      );

      expect(result.co2Grams).toBeGreaterThan(0);
      // With default CI=500, should be identical to explicit CI=500
      const explicitResult = estimateCO2FromTokens(
        1_000,
        "meta-llama/Llama-3.1-8B-Instruct",
        500,
      );
      expect(result.co2Grams).toBe(explicitResult.co2Grams);
    });

    it("should scale linearly with carbon intensity (operational only)", () => {
      const resultCI200 = estimateCO2FromTokens(1_000, "meta-llama/Llama-3.1-8B-Instruct", 200);
      const resultCI500 = estimateCO2FromTokens(1_000, "meta-llama/Llama-3.1-8B-Instruct", 500);

      // Operational carbon should scale exactly with CI (embodied is constant)
      const ratio =
        resultCI500.details.operationalCarbon /
        resultCI200.details.operationalCarbon;
      expect(ratio).toBeCloseTo(2.5, 5);
    });

    it("should produce repeatable results for identical inputs", () => {
      const results = Array.from({ length: 5 }, () =>
        estimateCO2FromTokens(500, "meta-llama/Llama-3.1-8B-Instruct", 450),
      );

      const first = results[0];
      for (const result of results) {
        expect(result.co2Grams).toBe(first.co2Grams);
        expect(result.co2PerToken).toBe(first.co2PerToken);
        expect(result.details.operationalCarbon).toBe(first.details.operationalCarbon);
        expect(result.details.embodiedCarbon).toBe(first.details.embodiedCarbon);
      }
    });
  });

  describe("estimateCO2FromEnergy", () => {
    it("should tie operational carbon exactly to measured energy", () => {
      // 1 kWh = 3_600_000 joules at CI=500 → 500g operational
      const result = estimateCO2FromEnergy(
        3_600_000,
        1_000,
        "meta-llama/Llama-3.1-8B-Instruct",
        500,
      );

      expect(result.details.operationalCarbon).toBe(500);
      expect(result.energyKwh).toBe(1);
      expect(result.method).toBe("gpu-energy");
    });

    it("should amortise embodied carbon over duration, not energy", () => {
      // Use a model with known power to predict duration
      const profile = getModelCO2Profile("meta-llama/Llama-3.1-8B-Instruct")!;
      const powerWatts = profile.defaultPowerWatts; // 200W
      const energyJoules = 3_600_000; // 1 kWh
      const durationSeconds = energyJoules / powerWatts; // 18_000s = 5h

      const hardwareEmbodiedKg = 1600;
      const lifetimeHours = 43_800;
      const expectedEmbodiedGrams =
        (hardwareEmbodiedKg / lifetimeHours) * (durationSeconds / 3600) * 1000;

      const result = estimateCO2FromEnergy(
        energyJoules,
        1_000,
        "meta-llama/Llama-3.1-8B-Instruct",
        500,
      );

      expect(result.details.embodiedCarbon).toBeCloseTo(expectedEmbodiedGrams, 0);
      expect(result.details.totalCarbon).toBe(
        result.details.operationalCarbon + result.details.embodiedCarbon,
      );
    });

    it("should handle unknown model IDs with fallback to default", () => {
      const result = estimateCO2FromEnergy(
        50_000,
        1_000,
        "unknown/model",
        400,
      );

      expect(result.co2Grams).toBeGreaterThan(0);
      expect(result.co2PerToken).toBeGreaterThan(0);
    });
  });

  describe("estimateCO2 dispatch", () => {
    it("should prefer gpu-energy method when energyJoules provided", () => {
      const result = estimateCO2({
        tokenCount: 1_000,
        energyJoules: 50_000,
        modelId: "meta-llama/Llama-3.1-8B-Instruct",
        carbonIntensity: 450,
      });

      expect(result.method).toBe("gpu-energy");
      expect(result.energyKwh).toBeGreaterThan(0);
    });

    it("should fall back to token-estimate when no energy provided", () => {
      const result = estimateCO2({
        tokenCount: 1_000,
        modelId: "meta-llama/Llama-3.1-8B-Instruct",
      });

      expect(result.method).toBe("token-estimate");
    });

    it("should return zero for zero tokens regardless of energy", () => {
      const result = estimateCO2({
        tokenCount: 0,
        energyJoules: 50_000,
        modelId: "meta-llama/Llama-3.1-8B-Instruct",
      });

      expect(result.co2Grams).toBe(0);
    });
  });

  describe("model profile management", () => {
    it("should return undefined for unknown model IDs", () => {
      expect(getModelCO2Profile("totally_unknown_123")).toBeUndefined();
    });

    it("should return a clone, not the original mutable object", () => {
      const models = getAllModelCO2Profiles();
      delete (models as Record<string, unknown>)["meta-llama/Llama-3.1-8B-Instruct"];
      expect(getModelCO2Profile("meta-llama/Llama-3.1-8B-Instruct")).toBeDefined();
    });

    it("should allow adding custom model profiles", () => {
      const customModel: ModelCO2Profile = {
        modelId: "custom-org/custom-1B",
        parameters: modelParameters(1_000_000_000),
        flopsPerToken: flopsPerToken(2_000_000_000),
        defaultPowerWatts: watts(100),
        architectureEfficiencyFactor: architectureEfficiencyFactor(0.8),
      };

      setModelCO2Profile(customModel);
      const retrieved = getModelCO2Profile("custom-org/custom-1B");

      expect(retrieved).toEqual(customModel);
    });

    it("should include all pre-configured models", () => {
      const models = getAllModelCO2Profiles();
      const expectedModels = [
        "meta-llama/Llama-3.1-8B-Instruct",
        "meta-llama/Llama-3.3-70B-Instruct",
        "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
        "openai/gpt-oss-120b",
      ];

      for (const modelId of expectedModels) {
        expect(models[modelId]).toBeDefined();
      }
    });
  });

  describe("accuracy validation", () => {
    it("should produce physically plausible energy ranges for Llama-8B", () => {
      const result = estimateCO2FromTokens(1_000, "meta-llama/Llama-3.1-8B-Instruct", 500);

      // 8B model, ~16TFLOP/token, efficiency ~0.75
      // Estimated energy should be in a reasonable range for inference
      expect(result.energyKwh).toBeGreaterThan(0.001);
      expect(result.energyKwh).toBeLessThan(1);
    });

    it("should produce physically plausible CO2 per token", () => {
      const result = estimateCO2FromTokens(1_000, "meta-llama/Llama-3.1-8B-Instruct", 500);

      // Typical inference is in the micro-to-milligram range per token
      expect(result.co2PerToken).toBeGreaterThan(0.000_001);
      expect(result.co2PerToken).toBeLessThan(1);
    });

    it("should be approximately monotonic with model size", () => {
      const small = estimateCO2FromTokens(1_000, "intfloat/multilingual-e5-large", 500);
      const medium = estimateCO2FromTokens(1_000, "meta-llama/Llama-3.1-8B-Instruct", 500);
      const large = estimateCO2FromTokens(1_000, "meta-llama/Llama-3.3-70B-Instruct", 500);

      expect(medium.co2Grams).toBeGreaterThan(small.co2Grams);
      expect(large.co2Grams).toBeGreaterThan(medium.co2Grams);
    });
  });
});
