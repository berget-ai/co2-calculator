import { describe, it, expect } from "vitest";

// We will import from yet-to-be-written modules.
// The tests below describe the desired public API.

describe("Machine builders", () => {
  describe("GPU presets", () => {
    it("a100() creates an A100 GPU with correct defaults", () => {
      const gpu = a100(4).build();
      expect(gpu.manufacturer).toBe("NVIDIA");
      expect(gpu.model).toBe("A100");
      expect(gpu.count).toBe(4);
      expect(gpu.powerRatingWattsPerGPU).toBe(400);
      expect(gpu.embodiedCarbonKgCO2e).toBe(1600);
    });

    it("h100() creates an H100 with higher power draw", () => {
      const gpu = h100(2).build();
      expect(gpu.model).toBe("H100");
      expect(gpu.powerRatingWattsPerGPU).toBe(700);
      expect(gpu.embodiedCarbonKgCO2e).toBe(2000);
    });

    it("allows chaining overrides on a preset", () => {
      const gpu = a100(8).condition("refurbished").utilizationRate(0.9).build();
      expect(gpu.count).toBe(8);
      expect(gpu.condition).toBe("refurbished");
      expect(gpu.utilizationRate).toBe(0.9);
    });

    it("supports shared GPU allocation", () => {
      const gpu = a100(4)
        .shared(8, 4, ["team-a", "team-b"])
        .build();
      expect(gpu.shared).toEqual({
        totalGPUs: 8,
        allocatedGPUs: 4,
        sharedWith: ["team-a", "team-b"],
      });
    });
  });

  describe("Server builders", () => {
    it("generic1U() creates a standard 1U server", () => {
      const s = generic1U().build();
      expect(s.type).toBe("server");
      expect(s.powerRatingWatts).toBe(500);
      expect(s.embodiedCarbonKgCO2e).toBe(1500);
    });

    it("allows full customisation", () => {
      const s = new Server()
        .cpus(128, 2)
        .ram(2048)
        .powerWatts(1000)
        .condition("refurbished")
        .ageYears(2)
        .build();
      expect(s.powerRatingWatts).toBe(1000);
      expect(s.condition).toBe("refurbished");
      expect(s.ageYears).toBe(2);
    });
  });

  describe("Network and storage", () => {
    it("genericSwitch() creates a 48-port switch", () => {
      const sw = genericSwitch().build();
      expect(sw.type).toBe("network");
      expect(sw.powerRatingWatts).toBe(50);
    });

    it("genericStorage() creates NVMe storage", () => {
      const st = genericStorage().build();
      expect(st.type).toBe("storage");
      expect(st.powerRatingWatts).toBe(30);
    });
  });
});

describe("ModelConfig builder", () => {
  it("creates a model config from Hugging Face ID", () => {
    const m = new ModelConfig("meta-llama/Llama-3.1-8B-Instruct");
    expect(m.modelId).toBe("meta-llama/Llama-3.1-8B-Instruct");
  });

  it("allows overriding training CO₂", () => {
    const m = new ModelConfig("custom-model").withTrainingCO2(5000);
    expect(m.totalTrainingCO2Grams).toBe(5000);
  });

  it("provides default estimates when not overridden", () => {
    const m = new ModelConfig("tiny-test").withParameters(1_000_000_000);
    // Training CO₂ heuristic: 1.2 g per billion params
    expect(m.estimateTrainingCO2()).toBeCloseTo(1.2, 3);
  });
});

describe("UsagePattern builder", () => {
  it("creates a 24-hour usage curve", () => {
    const up = new UsagePattern()
      .withHourlyWeights([
        0.1, 0.1, 0.1, 0.1, 0.1, 0.1, // 00-05
        0.3, 0.6, 0.9, 1.0, 1.0, 0.9, // 06-11
        0.8, 0.8, 0.8, 0.8, 0.7, 0.6, // 12-17
        0.5, 0.4, 0.3, 0.2, 0.15, 0.1, // 18-23
      ])
      .withWeekdayWeights([0.9, 0.95, 1.0, 0.95, 0.9, 0.4, 0.3]);

    expect(up.hourlyWeights).toHaveLength(24);
    expect(up.weekdayWeights).toHaveLength(7);
  });

  it("classifies hours as low or peak period", () => {
    const up = new UsagePattern()
      .withHourlyWeights(Array(24).fill(0).map((_, i) => (i >= 2 && i <= 5 ? 0.1 : 0.8)))
      .withLowPeriodThreshold(0.2);

    expect(up.isLowPeriod(3)).toBe(true);
    expect(up.isLowPeriod(14)).toBe(false);
  });
});

describe("ConfigCreator (end-to-end)", () => {
  it("assembles machines, model and usage into a CalculatorConfig", () => {
    const machines = [
      a100(8),
      generic1U(),
      genericSwitch(),
      genericStorage().condition("refurbished"),
    ];

    const model = new ModelConfig("meta-llama/Llama-3.1-8B-Instruct");

    const usage = new UsagePattern()
      .withHourlyWeights([
        0.1, 0.1, 0.1, 0.1, 0.1, 0.1, // low
        0.3, 0.6, 0.9, 1.0, 1.0, 0.9,
        0.8, 0.8, 0.8, 0.8, 0.7, 0.6,
        0.5, 0.4, 0.3, 0.2, 0.15, 0.1,
      ])
      .withWeekdayWeights([0.9, 0.95, 1.0, 0.95, 0.9, 0.4, 0.3]);

    const creator = new ConfigCreator(machines, model, usage, {
      carbonIntensity: 200,
      region: "eu-north-1",
    });

    const config = creator.build();

    // Infrastructure
    expect(config.infrastructure.gpus).toHaveLength(1);
    expect(config.infrastructure.gpus[0].count).toBe(8);
    expect(config.infrastructure.servers).toHaveLength(1);
    expect(config.infrastructure.network).toHaveLength(1);
    expect(config.infrastructure.storage).toHaveLength(1);

    // Carbon intensity
    expect(config.infrastructure.carbonIntensityGCO2PerKWh).toBe(200);

    // Usage curve
    expect(config.config.usageCurve.hourlyWeights).toHaveLength(24);
    expect(config.config.usageCurve.weekdayWeights).toHaveLength(7);
  });

  it("calculates CO₂ from the assembled config", () => {
    const machines = [a100(4).condition("refurbished"), generic1U()];
    const model = new ModelConfig("meta-llama/Llama-3.1-8B-Instruct");
    const usage = new UsagePattern()
      .withHourlyWeights([
        0.1, 0.1, 0.1, 0.1, 0.1, 0.1,
        0.3, 0.6, 0.9, 1.0, 1.0, 0.9,
        0.8, 0.8, 0.8, 0.8, 0.7, 0.6,
        0.5, 0.4, 0.3, 0.2, 0.15, 0.1,
      ]);

    const creator = new ConfigCreator(machines, model, usage, {
      carbonIntensity: 250,
    });

    // Simulate inference at 03:00 (low period)
    const result = creator.estimateCO2({
      tokenCount: 1000,
      hourOfDay: 3,
    });

    expect(result.co2Grams).toBeGreaterThan(0);
    expect(result.timing?.isLowPeriod).toBe(true);
    expect(result.timing?.periodFactor).toBeLessThan(1);
  });
});

// Placeholder imports so TypeScript doesn't complain yet.
// These will be implemented next.
import {
  a100,
  h100,
  generic1U,
  genericSwitch,
  genericStorage,
  Server,
} from "./builder/machines";
import { ModelConfig } from "./builder/models";
import { UsagePattern } from "./builder/usage";
import { ConfigCreator } from "./builder/config-creator";
