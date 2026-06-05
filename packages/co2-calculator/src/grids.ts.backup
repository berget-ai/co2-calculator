/**
 * Grid regions with IEA electricity emission factors.
 *
 * Sources:
 *   - IEA Electricity Emission Factors (most recent year available per country)
 *   - European Environment Agency (EEA) for EU countries
 *   - US EPA eGRID for US regions
 *
 * Time-of-day curves are simplified: low-period = night/early morning,
 * peak = business hours. Actual curves vary by region (solar-heavy grids
 * peak differently) but these defaults are reasonable for illustration.
 */

import type { GridRegion } from "./types.js";
import { DEFAULT_DEMAND_CURVE } from "./hardware.js";

export const GRID_REGIONS: Record<string, GridRegion> = {
  sweden: {
    name: "Sweden",
    fullLabel: "Sweden · 8 g/kWh (hydro, nuclear, wind)",
    intensityGPerKwh: 8,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.70,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
  },
  norway: {
    name: "Norway",
    fullLabel: "Norway · 15 g/kWh (hydro-dominant)",
    intensityGPerKwh: 15,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.75,
    peakPeriodFactor: 1.10,
    lowPeriodThreshold: 0.20,
  },
  france: {
    name: "France",
    fullLabel: "France · 30 g/kWh (nuclear-dominant)",
    intensityGPerKwh: 30,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.80,
    peakPeriodFactor: 1.10,
    lowPeriodThreshold: 0.20,
  },
  quebec: {
    name: "Quebec",
    fullLabel: "Quebec · 40 g/kWh (hydro)",
    intensityGPerKwh: 40,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.80,
    peakPeriodFactor: 1.10,
    lowPeriodThreshold: 0.20,
  },
  ireland: {
    name: "Ireland",
    fullLabel: "Ireland · 150 g/kWh (55% renewable)",
    intensityGPerKwh: 150,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.80,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
  },
  germany: {
    name: "Germany",
    fullLabel: "Germany · 280 g/kWh (20% renewable)",
    intensityGPerKwh: 280,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.80,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
  },
  usa: {
    name: "US Average",
    fullLabel: "US Average · 380 g/kWh (mixed)",
    intensityGPerKwh: 380,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.10,
    lowPeriodThreshold: 0.20,
  },
  useast: {
    name: "US East (PJM)",
    fullLabel: "US East (PJM) · 400 g/kWh (gas + nuclear + coal)",
    intensityGPerKwh: 400,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.10,
    lowPeriodThreshold: 0.20,
  },
  texas: {
    name: "Texas (ERCOT)",
    fullLabel: "Texas (ERCOT) · 420 g/kWh (wind + gas + solar)",
    intensityGPerKwh: 420,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.80,
    peakPeriodFactor: 1.20,
    lowPeriodThreshold: 0.20,
  },
  california: {
    name: "California (CAISO)",
    fullLabel: "California (CAISO) · 450 g/kWh (gas + solar + imports)",
    intensityGPerKwh: 450,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.80,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
  },
  japan: {
    name: "Japan",
    fullLabel: "Japan · 550 g/kWh (gas + coal + nuclear)",
    intensityGPerKwh: 550,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.10,
    lowPeriodThreshold: 0.20,
  },
  india: {
    name: "India",
    fullLabel: "India · 700 g/kWh (coal-dominant)",
    intensityGPerKwh: 700,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.90,
    peakPeriodFactor: 1.05,
    lowPeriodThreshold: 0.20,
  },
  poland: {
    name: "Poland",
    fullLabel: "Poland · 750 g/kWh (coal)",
    intensityGPerKwh: 750,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.90,
    peakPeriodFactor: 1.05,
    lowPeriodThreshold: 0.20,
  },
  china: {
    name: "China",
    fullLabel: "China · 850 g/kWh (coal + hydro + wind)",
    intensityGPerKwh: 850,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.85,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
  },
  global: {
    name: "Global Average",
    fullLabel: "Global Average · 500 g/kWh",
    intensityGPerKwh: 500,
    demandCurve: DEFAULT_DEMAND_CURVE,
    lowPeriodFactor: 0.80,
    peakPeriodFactor: 1.15,
    lowPeriodThreshold: 0.20,
  },
};
