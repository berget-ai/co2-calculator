import type { InferenceResult } from "./types.js";

/**
 * The published package version, used as the default `methodology_version`.
 * Kept as a source constant (bumped alongside package.json by the release
 * workflow) rather than a runtime package.json read, so the ESM/CJS/DTS builds
 * stay clean and bundler-friendly.
 */
export const CALCULATOR_VERSION = "1.0.0";

/**
 * The public, versioned shape we ask providers to return inside the OpenAI
 * `usage` object. Designed to align with the conventions the industry already
 * uses for per-request accounting metadata:
 *
 * - Placement: inside `usage` (where OpenRouter puts `cost`, Groq puts
 *   `*_time`, Perplexity and Mistral put their extensions). CO₂ is the same
 *   shape of derived, per-request accounting data as cost.
 * - `co2e_grams` (not `co2_grams`): the figure is CO₂-*equivalents*, the
 *   standard unit across SCI (gCO2eq), Climatiq (`co2e`) and EcoLogits
 *   (kgCO2eq). Grams, not kg, because a single inference is typically
 *   0.001–1 g and kg forces unreadable exponents.
 * - `energy_kwh` (not joules): SCI mandates kWh, and EcoLogits / CodeCarbon /
 *   Cloud Carbon Footprint all use kWh for accounting. Joules belong to
 *   Prometheus counters (Kepler `_joules_total`), not a JSON API. Keeping raw
 *   energy alongside CO₂ lets a consumer recompute with their own grid factor.
 * - `operational` / `embodied` split: the strongest structural convention in
 *   SCI (`O + M`), SCI-AI, EcoLogits (`usage`/`embodied`) and CCF.
 * - `grid.carbon_intensity_gco2e_per_kwh`: Electricity Maps' `carbonIntensity`
 *   is the de facto standard; recording the intensity used makes the figure
 *   reproducible.
 */
export interface ApiEmissions {
  /** Total CO₂-equivalent emissions for this request, in grams. */
  co2e_grams: number;
  /** Total energy consumed (operational), in kWh. */
  energy_kwh: number;
  /** Operational emissions (energy burned while serving the request). */
  operational: {
    co2e_grams: number;
    energy_kwh: number;
  };
  /** Embodied emissions (hardware manufacturing amortised onto this request). */
  embodied: {
    co2e_grams: number;
  };
  /** The grid the request ran on, and the intensity used in the calculation. */
  grid: {
    region: string;
    carbon_intensity_gco2e_per_kwh: number;
  };
  /** URL to the methodology, so consumers can check the boundary. */
  methodology: string;
  /** Version of the calculator that produced the figure. */
  methodology_version: string;
}

/** Canonical methodology URL, kept in one place. */
export const METHODOLOGY_URL =
  "https://github.com/berget-ai/co2-calculator/blob/main/METHODOLOGY.md";

/**
 * Map an internal {@link InferenceResult} to the public {@link ApiEmissions}
 * schema. The library owns this mapping so every consumer (the inference API,
 * the demo, third-party integrations) emits the identical, versioned shape.
 *
 * @param result  The calculator's internal result.
 * @param gridRegionKey  The grid region key used (e.g. "sweden", "germany").
 * @param version  The calculator package version. Defaults to the published
 *   package version, so consumers normally omit it.
 */
export function toApiEmissions(
  result: InferenceResult,
  gridRegionKey: string,
  version: string = CALCULATOR_VERSION
): ApiEmissions {
  const c = result.components;
  const operationalCo2 =
    c.gpuOperational.co2Grams +
    c.gpuIdle.co2Grams +
    c.serverOperational.co2Grams +
    c.datacenterOverhead.co2Grams;
  const embodiedCo2 = c.embodiedGpu.co2Grams + c.embodiedOther.co2Grams;

  return {
    co2e_grams: result.totalCO2Grams,
    energy_kwh: result.totalEnergyKwh,
    operational: {
      co2e_grams: operationalCo2,
      energy_kwh: result.totalEnergyKwh,
    },
    embodied: {
      co2e_grams: embodiedCo2,
    },
    grid: {
      region: gridRegionKey,
      carbon_intensity_gco2e_per_kwh: result.effectiveIntensityGPerKwh,
    },
    methodology: METHODOLOGY_URL,
    methodology_version: version,
  };
}
