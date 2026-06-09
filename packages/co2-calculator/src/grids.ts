/**
 * Grid regions with carbon intensity factors.
 * 
 * ⚠️  AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * 
 * Generated: 2026-06-05T15:47:06.548Z
 * Sources: IEA 2024, Hydro-Québec 2024, EPA eGRID 2023
 * Live data: 0 regions
 * 
 * To update this file, run:
 *   npm run update-grid-data
 * 
 * Data sources:
 *   - IEA: https://www.iea.org/data-and-statistics
 *   - EPA eGRID: https://www.epa.gov/egrid
 *   - EEA: https://www.eea.europa.eu/data-and-maps
 *   - Electricity Maps: https://app.electricitymaps.com
 *   - Ember: https://ember-climate.org
 *   - Our World in Data: https://github.com/owid/energy-data
 */

import type { GridRegion } from "./types.js";
import { DEFAULT_DEMAND_CURVE } from "./hardware.js";

export const GRID_REGIONS: Record<string, GridRegion> = {
  sweden: {
    // Source: IEA 2024
    // Last verified: 2026-06-05
    // Energy mix: hydro: 45%, wind: 40%, nuclear: 10%, solar: 5%
    // Climate: Cold, free-air cooling year-round
    name: "Sweden",
    fullLabel: "Sweden · 8 g/kWh",
    intensityGPerKwh: 8,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.7,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.0,
    typicalPue: 1.15,
  },
  norway: {
    // Source: IEA 2024
    // Last verified: 2026-06-05
    // Energy mix: hydro: 88%, wind: 8%, fossil: 4%
    // Climate: Cold, free-air cooling year-round
    name: "Norway",
    fullLabel: "Norway · 15 g/kWh",
    intensityGPerKwh: 15,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.7,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.0,
    typicalPue: 1.15,
  },
  france: {
    // Source: IEA 2024
    // Last verified: 2026-06-05
    // Energy mix: nuclear: 70%, hydro: 12%, wind: 10%, solar: 5%, fossil: 3%
    // Climate: Temperate, some free-air cooling possible
    name: "France",
    fullLabel: "France · 30 g/kWh",
    intensityGPerKwh: 30,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.3,
    typicalPue: 1.30,
  },
  quebec: {
    // Source: Hydro-Québec 2024
    // Last verified: 2026-06-05
    // Energy mix: hydro: 95%, wind: 4%, biomass: 1%
    // Climate: Cold, free-air cooling year-round
    name: "Quebec",
    fullLabel: "Quebec · 40 g/kWh",
    intensityGPerKwh: 40,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.7,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.0,
    typicalPue: 1.15,
  },
  ireland: {
    // Source: IEA 2024
    // Last verified: 2026-06-05
    // Energy mix: gas: 45%, wind: 35%, coal: 15%, oil: 5%
    // Climate: Temperate maritime, moderate cooling needs
    name: "Ireland",
    fullLabel: "Ireland · 150 g/kWh",
    intensityGPerKwh: 150,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.2,
    typicalPue: 1.25,
  },
  germany: {
    // Source: IEA 2024
    // Last verified: 2026-06-05
    // Energy mix: coal: 30%, wind: 25%, solar: 12%, gas: 18%, biomass: 10%, hydro: 5%
    // Climate: Temperate, significant cooling in summer
    name: "Germany",
    fullLabel: "Germany · 280 g/kWh",
    intensityGPerKwh: 280,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.2,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.4,
    typicalPue: 1.35,
  },
  usa: {
    // Source: EPA eGRID 2023
    // Last verified: 2026-06-05
    // Energy mix: gas: 40%, coal: 20%, nuclear: 20%, wind: 10%, solar: 6%, hydro: 4%
    // Climate: Mixed, hot summers in many regions
    name: "US Average",
    fullLabel: "US Average · 380 g/kWh",
    intensityGPerKwh: 380,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.5,
    typicalPue: 1.50,
  },
  useast: {
    // Source: EPA eGRID 2023
    // Last verified: 2026-06-05
    // Energy mix: gas: 45%, coal: 25%, nuclear: 20%, renewables: 10%
    // Climate: Hot humid summers, significant cooling load
    name: "US East (PJM)",
    fullLabel: "US East (PJM) · 400 g/kWh",
    intensityGPerKwh: 400,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.6,
    typicalPue: 1.60,
  },
  texas: {
    // Source: EPA eGRID 2023
    // Last verified: 2026-06-05
    // Energy mix: gas: 50%, wind: 25%, coal: 15%, solar: 8%, nuclear: 2%
    // Climate: Very hot, extreme cooling needs
    name: "Texas (ERCOT)",
    fullLabel: "Texas (ERCOT) · 420 g/kWh",
    intensityGPerKwh: 420,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.2,
    lowPeriodThreshold: 0.20,
    coolingFactor: 2.0,
    typicalPue: 1.80,
  },
  california: {
    // Source: EPA eGRID 2023
    // Last verified: 2026-06-05
    // Energy mix: gas: 40%, solar: 20%, wind: 12%, nuclear: 10%, hydro: 10%, imports: 8%
    // Climate: Warm, moderate cooling needs
    name: "California (CAISO)",
    fullLabel: "California (CAISO) · 450 g/kWh",
    intensityGPerKwh: 450,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.2,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.5,
    typicalPue: 1.50,
  },
  japan: {
    // Source: IEA 2024
    // Last verified: 2026-06-05
    // Energy mix: coal: 30%, gas: 35%, oil: 5%, nuclear: 10%, renewables: 20%
    // Climate: Temperate, hot humid summers
    name: "Japan",
    fullLabel: "Japan · 550 g/kWh",
    intensityGPerKwh: 550,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.6,
    typicalPue: 1.60,
  },
  india: {
    // Source: IEA 2024
    // Last verified: 2026-06-05
    // Energy mix: coal: 75%, solar: 10%, wind: 8%, hydro: 5%, gas: 2%
    // Climate: Very hot, extreme cooling needs
    name: "India",
    fullLabel: "India · 700 g/kWh",
    intensityGPerKwh: 700,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 2.5,
    typicalPue: 2.00,
  },
  poland: {
    // Source: IEA 2024
    // Last verified: 2026-06-05
    // Energy mix: coal: 70%, gas: 10%, wind: 12%, solar: 5%, biomass: 3%
    // Climate: Temperate, moderate cooling
    name: "Poland",
    fullLabel: "Poland · 750 g/kWh",
    intensityGPerKwh: 750,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.4,
    typicalPue: 1.40,
  },
  china: {
    // Source: IEA 2024
    // Last verified: 2026-06-05
    // Energy mix: coal: 60%, hydro: 15%, wind: 10%, solar: 8%, gas: 5%, nuclear: 2%
    // Climate: Mixed, hot humid summers in east
    name: "China",
    fullLabel: "China · 850 g/kWh",
    intensityGPerKwh: 850,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.6,
    typicalPue: 1.60,
  },
  global: {
    // Source: IEA 2024
    // Last verified: 2026-06-05
    // Energy mix: coal: 35%, gas: 25%, hydro: 15%, nuclear: 10%, wind: 8%, solar: 5%, oil: 2%
    // Climate: Global average
    name: "Global Average",
    fullLabel: "Global Average · 500 g/kWh",
    intensityGPerKwh: 500,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.5,
    typicalPue: 1.50,
  },
};

// ─── Metadata ───
export const GRID_METADATA = {
  lastUpdated: "2026-06-05T15:47:06.548Z",
  sources: ["IEA 2024","Hydro-Québec 2024","EPA eGRID 2023"],
  liveRegions: 0,
  version: "2026-06-05",
};
