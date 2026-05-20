import { describe, it, expect } from "vitest";
import {
  a100,
  h100,
  l40s,
  rtx4090,
  mi300x,
  generic1U,
  generic2U,
  genericSwitch,
  genericStorage,
  ModelConfig,
  UsagePattern,
  ConfigCreator,
} from "./index";

describe("Builder index exports", () => {
  it("exports all GPU presets", () => {
    expect(a100(1).build().model).toBe("A100");
    expect(h100(1).build().model).toBe("H100");
    expect(l40s(1).build().model).toBe("L40S");
    expect(rtx4090(1).build().model).toBe("RTX 4090");
    expect(mi300x(1).build().model).toBe("MI300X");
  });

  it("exports all machine presets", () => {
    expect(generic1U().build().type).toBe("server");
    expect(generic2U().build().type).toBe("server");
    expect(genericSwitch().build().type).toBe("network");
    expect(genericStorage().build().type).toBe("storage");
  });

  it("exports ModelConfig", () => {
    const m = new ModelConfig("test").withTrainingCO2(100);
    expect(m.estimateTrainingCO2()).toBe(100);
  });

  it("exports UsagePattern", () => {
    const u = new UsagePattern().withLowPeriodThreshold(0.15);
    expect(u.lowPeriodThreshold).toBe(0.15);
  });

  it("exports ConfigCreator", () => {
    const c = new ConfigCreator([], new ModelConfig("x"), new UsagePattern());
    expect(c).toBeDefined();
  });
});
