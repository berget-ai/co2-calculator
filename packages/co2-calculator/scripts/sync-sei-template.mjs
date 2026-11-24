#!/usr/bin/env node
/**
 * Copies the grid baseline from GRID_REGIONS (src/grids.ts) into
 * data/sei-marginal-factors.template.json, so SEI reviews the figures the
 * calculator actually uses.
 *
 * Per region it sets `average`, `country`, `boundary` and `market`. The
 * marginal fields (`marginal`, `marginalHourly`, `marginalSource`,
 * `marginalYear`) are never touched. A region missing from the template is
 * added with empty marginal fields. A region in the template but not in
 * GRID_REGIONS stops the script without writing, as it may already hold
 * SEI's data.
 *
 * src/sei-template.test.ts fails when the two drift apart.
 *
 * Usage:
 *   pnpm sync-sei-template
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { GRID_REGIONS } from "../dist/index.js";

const TEMPLATE_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "sei-marginal-factors.template.json",
);

const template = JSON.parse(readFileSync(TEMPLATE_FILE, "utf8"));

const unknown = Object.keys(template.regions).filter((id) => !(id in GRID_REGIONS));
if (unknown.length > 0) {
  console.error(
    `Not in GRID_REGIONS: ${unknown.join(", ")}. ` +
      "Add them to src/grids.ts, or move them to boundaries.proposed. Nothing written.",
  );
  process.exit(1);
}

const changes = [];
for (const [id, grid] of Object.entries(GRID_REGIONS)) {
  const entry = template.regions[id] ?? {
    average: null,
    marginal: null,
    marginalHourly: null,
    marginalSource: null,
    marginalYear: null,
  };
  if (entry.average !== grid.intensityGPerKwh) {
    changes.push(`${id}: ${entry.average} -> ${grid.intensityGPerKwh}`);
  }
  entry.average = grid.intensityGPerKwh;
  if (grid.boundary?.level) entry.boundary = grid.boundary.level;
  else delete entry.boundary;
  if (grid.boundary?.market) entry.market = grid.boundary.market;
  else delete entry.market;
  entry.country = grid.countryCode ?? "";
  template.regions[id] = entry;
}

writeFileSync(TEMPLATE_FILE, JSON.stringify(template, null, 2) + "\n");
console.log(
  changes.length > 0
    ? `Updated ${changes.length} region(s):\n  ${changes.join("\n  ")}`
    : "Template already matches GRID_REGIONS.",
);
