import { describe, it, expect } from "vitest";
import template from "../data/sei-marginal-factors.template.json" with { type: "json" };
import { calculateInference } from "./calculator.js";
import { GRID_REGIONS as AVERAGE_GRID_REGIONS } from "./grids.js";
import { HARDWARE_CONFIGS } from "./hardware.js";
import {
  GRID_REGIONS,
  parseMarginalEntry,
  withMarginalFactors,
  type MarginalTemplateEntry,
} from "./marginal-factors.js";
import { MODEL_PROFILES } from "./models.js";
import type { InferenceParams } from "./types.js";

const empty: MarginalTemplateEntry = {
  marginal: null,
  marginalHourly: null,
  marginalSource: null,
  marginalYear: null,
};
const filled: MarginalTemplateEntry = {
  marginal: 620,
  marginalHourly: Array.from({ length: 24 }, (_, h) => (h < 6 ? 2000 : 600)),
  marginalSource: "SEI 2026 (test fixture)",
  marginalYear: 2026,
};

describe("parseMarginalEntry", () => {
  it("gives no factor and no problems for an empty entry", () => {
    expect(parseMarginalEntry(empty)).toEqual({ problems: [] });
    expect(parseMarginalEntry({})).toEqual({ problems: [] });
  });

  it("turns a complete entry into a MarginalIntensity", () => {
    expect(parseMarginalEntry(filled)).toEqual({
      marginal: {
        gPerKwh: 620,
        hourly: filled.marginalHourly,
        source: "SEI 2026 (test fixture)",
        year: 2026,
      },
      problems: [],
    });
    expect(parseMarginalEntry({ ...filled, marginalHourly: null }).marginal).toEqual({
      gPerKwh: 620,
      source: "SEI 2026 (test fixture)",
      year: 2026,
    });
  });

  it("rejects a factor without a source or year", () => {
    expect(parseMarginalEntry({ ...filled, marginalSource: " " })).toEqual({
      problems: ["marginalSource is required when marginal is set"],
    });
    expect(parseMarginalEntry({ ...filled, marginalYear: undefined })).toEqual({
      problems: ["marginalYear is required when marginal is set"],
    });
  });

  it("rejects an hourly profile that is not 24 numbers >= 0", () => {
    expect(parseMarginalEntry({ ...filled, marginalHourly: Array(23).fill(600) })).toEqual({
      problems: ["marginalHourly must have 24 entries (hour 0-23)"],
    });
    const negativeHour = [...Array(23).fill(600), -1];
    expect(parseMarginalEntry({ ...filled, marginalHourly: negativeHour })).toEqual({
      problems: ["marginalHourly entries must be numbers >= 0"],
    });
  });

  it("rejects a negative factor and half-filled entries", () => {
    expect(parseMarginalEntry({ ...filled, marginal: -5 }).problems).toEqual([
      "marginal must be a number >= 0",
    ]);
    expect(parseMarginalEntry({ ...empty, marginalSource: "SEI 2026" }).problems).toEqual([
      "marginalHourly, marginalSource or marginalYear is set but marginal is empty",
    ]);
  });
});

describe("withMarginalFactors", () => {
  const regions = withMarginalFactors(AVERAGE_GRID_REGIONS, {
    germany: filled,
    france: { ...filled, marginalSource: null },
    atlantis: filled,
  });

  it("attaches complete entries and leaves every other region as it was", () => {
    expect(regions.germany.marginal?.source).toBe("SEI 2026 (test fixture)");
    expect(regions.germany.intensityGPerKwh).toBe(AVERAGE_GRID_REGIONS.germany.intensityGPerKwh);
    expect(regions.france).toBe(AVERAGE_GRID_REGIONS.france); // incomplete entry
    expect(regions.sweden).toBe(AVERAGE_GRID_REGIONS.sweden); // no entry
    expect(Object.keys(regions)).toEqual(Object.keys(AVERAGE_GRID_REGIONS)); // no "atlantis"
  });

  it("does not modify the regions it is given", () => {
    expect(AVERAGE_GRID_REGIONS.germany.marginal).toBeUndefined();
  });

  it("reaches the calculator result", () => {
    const params: InferenceParams = {
      modelProfile: MODEL_PROFILES["mistralai/Mistral-Small-3.2-24B-Instruct-2506"],
      hardware: HARDWARE_CONFIGS.h200,
      deploymentGrid: regions.germany,
      measuredResponseTimeSeconds: 1.2,
      inputTokens: 800,
      outputTokens: 400,
      hourOfDay: 14,
      includeTraining: false,
      lifetimeQueries: 0,
    };
    const res = calculateInference(params);
    expect(res.accounting.marginalAvailable).toBe(true);
    expect(res.marginal?.source).toBe("SEI 2026 (test fixture)");
    expect(res.marginal?.year).toBe(2026);
    // 600 g/kWh at 14:00 is well above Germany's average, so the marginal total is higher.
    expect(res.marginal!.totalCO2Grams).toBeGreaterThan(res.totalCO2Grams);
  });
});

describe("SEI marginal-factors template", () => {
  const entries = template.regions as Record<string, MarginalTemplateEntry>;

  it.each(Object.entries(entries))("%s is empty or complete", (_id, entry) => {
    expect(parseMarginalEntry(entry).problems).toEqual([]);
  });

  it("only names GRID_REGIONS regions, so no filled-in data is ignored", () => {
    expect(Object.keys(entries).filter((id) => !(id in AVERAGE_GRID_REGIONS))).toEqual([]);
  });

  it("exported GRID_REGIONS keeps every region and its average baseline", () => {
    expect(Object.keys(GRID_REGIONS)).toEqual(Object.keys(AVERAGE_GRID_REGIONS));
    for (const [id, region] of Object.entries(GRID_REGIONS)) {
      expect(region.intensityGPerKwh).toBe(AVERAGE_GRID_REGIONS[id].intensityGPerKwh);
    }
  });
});
