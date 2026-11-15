/**
 * The SEI marginal-factors template must carry the same grid baseline as
 * GRID_REGIONS, so SEI reviews the figures the calculator actually uses.
 * Fix drift with `pnpm sync-sei-template`.
 */

import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import { GRID_REGIONS } from "./grids.js";

interface TemplateEntry {
  average: number | null;
  boundary?: string;
  market?: string;
  country?: string;
}

const template = JSON.parse(
  readFileSync(new URL("../data/sei-marginal-factors.template.json", import.meta.url), "utf8"),
) as { regions: Record<string, TemplateEntry> };

describe("SEI marginal-factors template", () => {
  it("lists exactly the regions in GRID_REGIONS", () => {
    expect(Object.keys(template.regions).sort()).toEqual(Object.keys(GRID_REGIONS).sort());
  });

  it.each(Object.keys(GRID_REGIONS))(
    "%s carries the GRID_REGIONS baseline (run `pnpm sync-sei-template`)",
    (id) => {
      const grid = GRID_REGIONS[id];
      const entry = template.regions[id];
      expect({
        average: entry?.average,
        country: entry?.country,
        boundary: entry?.boundary,
        market: entry?.market,
      }).toEqual({
        average: grid.intensityGPerKwh,
        country: grid.countryCode ?? "",
        boundary: grid.boundary?.level,
        market: grid.boundary?.market,
      });
    },
  );
});
