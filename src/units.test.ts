import { describe, it, expect } from "vitest";
import {
  joules,
  kilowattHours,
  watts,
  gramsCO2e,
  gramsCO2ePerKilowattHour,
  architectureEfficiencyFactor,
  joulesToKilowattHours,
  kilowattHoursToJoules,
  secondsToHours,
  hoursToSeconds,
  addGramsCO2e,
  divideGramsCO2e,
} from "./units";

describe("Branded Units", () => {
  describe("energy conversions", () => {
    it("should convert joules to kilowatt-hours", () => {
      const j = joules(3_600_000);
      const kwh = joulesToKilowattHours(j);
      expect(kwh).toBe(1);
    });

    it("should convert kilowatt-hours to joules", () => {
      const kwh = kilowattHours(1);
      const j = kilowattHoursToJoules(kwh);
      expect(j).toBe(3_600_000);
    });

    it("should round-trip conversion", () => {
      const original = joules(1_234_567);
      const kwh = joulesToKilowattHours(original);
      const back = kilowattHoursToJoules(kwh);
      expect(back).toBeCloseTo(original, 0);
    });
  });

  describe("time conversions", () => {
    it("should convert seconds to hours", () => {
      expect(secondsToHours(3600)).toBe(1);
      expect(secondsToHours(7200)).toBe(2);
    });

    it("should convert hours to seconds", () => {
      expect(hoursToSeconds(1)).toBe(3600);
      expect(hoursToSeconds(0.5)).toBe(1800);
    });
  });

  describe("carbon operations", () => {
    it("should add grams CO2e", () => {
      const a = gramsCO2e(100);
      const b = gramsCO2e(200);
      expect(addGramsCO2e(a, b)).toBe(300);
    });

    it("should divide grams CO2e", () => {
      const total = gramsCO2e(1000);
      expect(divideGramsCO2e(total, 10)).toBe(100);
    });
  });

  describe("architecture efficiency factor validation", () => {
    it("should accept valid factors", () => {
      expect(architectureEfficiencyFactor(0)).toBe(0);
      expect(architectureEfficiencyFactor(0.5)).toBe(0.5);
      expect(architectureEfficiencyFactor(1)).toBe(1);
    });

    it("should reject negative factors", () => {
      expect(() => architectureEfficiencyFactor(-0.1)).toThrow();
    });

    it("should reject factors greater than 1", () => {
      expect(() => architectureEfficiencyFactor(1.1)).toThrow();
    });
  });

  describe("type safety", () => {
    it("should allow arithmetic on branded types", () => {
      const energy = joules(3_600_000);
      const doubled = energy * 2;
      expect(doubled).toBe(7_200_000);
    });

    it("should preserve brand at compile time", () => {
      const energy: joules = joules(100);
      const power: watts = watts(50);

      // This should compile (runtime doesn't enforce brand)
      // but TypeScript structurally matches the intersection type
      const sum = energy + power;
      expect(sum).toBe(150);
    });
  });

  describe("forward formula: Energy = Power × Time", () => {
    it("should hold for basic physics relationship", () => {
      const power = watts(1000); // 1 kW
      const time = secondsToHours(3600); // 1 hour

      const energyJoules = joules(power * time * 3600);
      const energyKwh = joulesToKilowattHours(energyJoules);

      expect(energyKwh).toBe(1);
    });
  });

  describe("carbon intensity formula: CO2 = Energy × CI", () => {
    it("should calculate 1 kWh at 500g/kWh = 500g CO2e", () => {
      const energy = kilowattHours(1);
      const ci = gramsCO2ePerKilowattHour(500);

      const carbon = gramsCO2e(energy * ci);
      expect(carbon).toBe(500);
    });

    it("should calculate 2.5 kWh at 200g/kWh = 500g CO2e", () => {
      const energy = kilowattHours(2.5);
      const ci = gramsCO2ePerKilowattHour(200);

      const carbon = gramsCO2e(energy * ci);
      expect(carbon).toBe(500);
    });
  });
});
