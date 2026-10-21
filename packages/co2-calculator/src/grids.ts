/**
 * Grid regions with carbon intensity factors.
 * 
 * ⚠️  AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * 
 * Generated: 2026-10-21T06:52:38.689Z
 * Sources: IEA 2024, Hydro-Québec 2024, SEAI 2024, Ember 2024, EPA eGRID 2023
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
    // Last verified: 2026-10-21
    // Energy mix: hydro: 38%, nuclear: 29%, wind: 24%, bioenergy: 6%, solar: 2%
    // Climate: Cold, free-air cooling year-round
    // Water: No water used for cooling (free-air)
    name: "Sweden",
    fullLabel: "Sweden · 8 g/kWh",
    intensityGPerKwh: 8,
    countryCode: "SE",
    boundary: {"level": "country"},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.7,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1,
    typicalPue: 1.15,
    waterLitersPerKwh: 0,
  },
  norway: {
    // Source: IEA 2024
    // Last verified: 2026-10-21
    // Energy mix: hydro: 89%, wind: 9%
    // Climate: Cold, free-air cooling year-round
    // Water: No water used for cooling (free-air)
    name: "Norway",
    fullLabel: "Norway · 15 g/kWh",
    intensityGPerKwh: 15,
    countryCode: "NO",
    boundary: {"level": "country"},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.7,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1,
    typicalPue: 1.15,
    waterLitersPerKwh: 0,
  },
  france: {
    // Source: IEA 2024
    // Last verified: 2026-10-21
    // Energy mix: nuclear: 68%, hydro: 13%, wind: 8%, solar: 4%, gas: 3%
    // Climate: Temperate, some free-air cooling possible
    // Water: Minimal (mixed cooling)
    name: "France",
    fullLabel: "France · 30 g/kWh",
    intensityGPerKwh: 30,
    countryCode: "FR",
    boundary: {"level": "country"},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.3,
    typicalPue: 1.3,
    waterLitersPerKwh: 0.2,
  },
  quebec: {
    // Source: Hydro-Québec 2024
    // Last verified: 2026-10-21
    // Energy mix: hydro: 95%, wind: 4%, biomass: 1%
    // Climate: Cold, free-air cooling year-round
    // Water: No water used for cooling (free-air)
    name: "Quebec",
    fullLabel: "Quebec · 1.3 g/kWh",
    intensityGPerKwh: 1.3,
    countryCode: "CA",
    boundary: {"level": "sub-national", "market": "Hydro-Québec"},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.7,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1,
    typicalPue: 1.15,
    waterLitersPerKwh: 0,
  },
  ireland: {
    // Source: SEAI 2024
    // Last verified: 2026-10-21
    // Energy mix: gas: 49%, wind: 37%, solar: 4%, bioenergy: 3%, hydro: 2%, coal: 2%
    // Climate: Temperate maritime, moderate cooling needs
    // Water: Low (temperate climate)
    name: "Ireland",
    fullLabel: "Ireland · 224 g/kWh",
    intensityGPerKwh: 224,
    countryCode: "IE",
    boundary: {"level": "country"},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.2,
    typicalPue: 1.25,
    waterLitersPerKwh: 0.3,
  },
  germany: {
    // Source: Ember 2024
    // Last verified: 2026-10-21
    // Energy mix: wind: 29%, coal: 21%, gas: 16%, solar: 15%, bioenergy: 10%, hydro: 5%
    // Climate: Temperate, significant cooling in summer
    // Water: Moderate (cooling towers with recirculation)
    name: "Germany",
    fullLabel: "Germany · 337 g/kWh",
    intensityGPerKwh: 337,
    countryCode: "DE",
    boundary: {"level": "country"},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.2,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.4,
    typicalPue: 1.35,
    waterLitersPerKwh: 0.5,
  },
  usa: {
    // Source: EPA eGRID 2023
    // Last verified: 2026-10-21
    // Energy mix: gas: 43%, nuclear: 19%, coal: 16%, wind: 10%, hydro: 6%, solar: 4%
    // Climate: Mixed, hot summers in many regions
    // Water: Moderate-high (mechanical cooling)
    name: "US Average",
    fullLabel: "US Average · 348 g/kWh",
    intensityGPerKwh: 348,
    countryCode: "US",
    boundary: {"level": "country", "conservativeFallback": false},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.5,
    typicalPue: 1.5,
    waterLitersPerKwh: 0.8,
  },
  useast: {
    // Source: EPA eGRID 2023
    // Last verified: 2026-10-21
    // Energy mix: gas: 40%, nuclear: 33%, coal: 20%, renewables: 7%
    // Climate: Hot humid summers, significant cooling load
    // Water: High (cooling towers)
    name: "US East (PJM)",
    fullLabel: "US East (PJM) · 400 g/kWh",
    intensityGPerKwh: 400,
    countryCode: "US",
    boundary: {"level": "sub-national", "market": "PJM", "conservativeFallback": true},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.6,
    typicalPue: 1.6,
    waterLitersPerKwh: 1,
  },
  texas: {
    // Source: EPA eGRID 2023
    // Last verified: 2026-10-21
    // Energy mix: gas: 46%, wind: 24%, coal: 14%, solar: 9%, nuclear: 7%
    // Climate: Very hot, extreme cooling needs
    // Water: Very high (evaporative cooling in dry climate)
    name: "Texas (ERCOT)",
    fullLabel: "Texas (ERCOT) · 333 g/kWh",
    intensityGPerKwh: 333,
    countryCode: "US",
    boundary: {"level": "sub-national", "market": "ERCOT", "conservativeFallback": true},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.2,
    lowPeriodThreshold: 0.20,
    coolingFactor: 2,
    typicalPue: 1.8,
    waterLitersPerKwh: 1.5,
  },
  california: {
    // Source: EPA eGRID 2023
    // Last verified: 2026-10-21
    // Energy mix: gas: 36%, solar: 25%, hydro: 13%, nuclear: 9%, wind: 8%, imports: 9%
    // Climate: Warm, moderate cooling needs
    // Water: Moderate (coastal cooling possible)
    name: "California (CAISO)",
    fullLabel: "California (CAISO) · 194 g/kWh",
    intensityGPerKwh: 194,
    countryCode: "US",
    boundary: {"level": "sub-national", "market": "CAISO", "conservativeFallback": true},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.2,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.5,
    typicalPue: 1.5,
    waterLitersPerKwh: 0.7,
  },
  japan: {
    // Source: Ember 2024
    // Last verified: 2026-10-21
    // Energy mix: gas: 34%, coal: 32%, solar: 10%, nuclear: 8%, hydro: 8%, bioenergy: 4%
    // Climate: Temperate, hot humid summers
    // Water: Moderate-high (cooling towers)
    name: "Japan",
    fullLabel: "Japan · 484 g/kWh",
    intensityGPerKwh: 484,
    countryCode: "JP",
    boundary: {"level": "country"},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.6,
    typicalPue: 1.6,
    waterLitersPerKwh: 0.8,
  },
  india: {
    // Source: Ember 2024
    // Last verified: 2026-10-21
    // Energy mix: coal: 75%, hydro: 8%, solar: 7%, wind: 4%, gas: 3%, nuclear: 3%
    // Climate: Very hot, extreme cooling needs
    // Water: Very high (evaporative cooling, water scarcity issues)
    name: "India",
    fullLabel: "India · 700 g/kWh",
    intensityGPerKwh: 700,
    countryCode: "IN",
    boundary: {"level": "country"},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 2.5,
    typicalPue: 2,
    waterLitersPerKwh: 2,
  },
  poland: {
    // Source: Ember 2024
    // Last verified: 2026-10-21
    // Energy mix: coal: 54%, wind: 15%, gas: 12%, solar: 10%, bioenergy: 5%
    // Climate: Temperate, moderate cooling
    // Water: Moderate (cooling towers with recirculation)
    name: "Poland",
    fullLabel: "Poland · 608 g/kWh",
    intensityGPerKwh: 608,
    countryCode: "PL",
    boundary: {"level": "country"},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.4,
    typicalPue: 1.4,
    waterLitersPerKwh: 0.5,
  },
  china: {
    // Source: Ember 2024
    // Last verified: 2026-10-21
    // Energy mix: coal: 58%, hydro: 13%, wind: 10%, solar: 8%, nuclear: 4%, gas: 3%
    // Climate: Mixed, hot humid summers in east
    // Water: Moderate-high (cooling towers)
    name: "China",
    fullLabel: "China · 556 g/kWh",
    intensityGPerKwh: 556,
    countryCode: "CN",
    boundary: {"level": "country"},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.6,
    typicalPue: 1.6,
    waterLitersPerKwh: 1,
  },
  global: {
    // Source: Ember 2024
    // Last verified: 2026-10-21
    // Energy mix: coal: 34%, gas: 22%, hydro: 14%, nuclear: 9%, wind: 8%, solar: 7%, bioenergy: 3%, oil: 2%
    // Climate: Global average
    // Water: Moderate (global average)
    name: "Global Average",
    fullLabel: "Global Average · 472 g/kWh",
    intensityGPerKwh: 472,
    countryCode: "",
    boundary: {"level": "global", "country": ""},
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
    coolingFactor: 1.5,
    typicalPue: 1.5,
    waterLitersPerKwh: 0.8,
  },
};

// ─── Metadata ───
export const GRID_METADATA = {
  lastUpdated: "2026-10-21T06:52:38.689Z",
  sources: ["IEA 2024","Hydro-Québec 2024","SEAI 2024","Ember 2024","EPA eGRID 2023"],
  liveRegions: 0,
  version: "2026-10-21",
};
