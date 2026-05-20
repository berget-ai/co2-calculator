/**
 * Domain types for CO₂ estimation.
 *
 * Contrary to raw types.ts, these expose branded units so that
 * consumers of the library work directly with physical units.
 */

import type {
  Watts,
  FlopsPerToken,
  ArchitectureEfficiencyFactor,
  ModelParameters,
} from "./units";
import type { CalculatorConfig } from "./config";

export interface CO2EstimationParams {
  tokenCount: number;
  energyJoules?: number;
  modelParameters?: number;
  flopsPerToken?: number;
  energyEfficiency?: number;
  carbonIntensity?: number;
  modelId?: string;
  /** Optional configuration overrides for this estimation call. */
  config?: Partial<CalculatorConfig>;
  /** Expected lifetime inference count for training CO₂ amortisation.
   *  If omitted, training CO₂ is reported as a one-off value in
   *  `details.trainingCarbon` but NOT added to `co2Grams`. */
  expectedLifetimeInferences?: number;
}

export interface CO2EstimationResult {
  co2Grams: number;
  co2PerToken: number;
  co2PerFlop?: number;
  co2PerParameter?: number;
  energyKwh?: number;
  method: "gpu-energy" | "token-estimate" | "hybrid";
  details: {
    operationalCarbon: number;      // GPU / infrastructure energy
    embodiedCarbon: number;         // Hardware manufacturing
    trainingCarbon: number;         // Model training (amortised)
    totalCarbon: number;            // Sum of all three
  };
  /** Timing information for time-of-day reporting. */
  timing?: {
    hourOfDay?: number;             // 0–23, when inference ran
    isLowPeriod?: boolean;         // true if during off-peak
    periodFactor?: number;         // CI multiplier (< 1 = cleaner)
  };
}

export interface ModelCO2Profile {
  modelId: string;
  parameters: ModelParameters;
  flopsPerToken: FlopsPerToken;
  defaultPowerWatts: Watts;
  architectureEfficiencyFactor: ArchitectureEfficiencyFactor;
  /** Total training CO₂ in grams, as reported by model card or literature.
   *  When absent the library estimates from parameter count:
   *    trainingCO2Grams ≈ 1.2 × params (billion).
   *  Set to 0 for inference-only models or when no training burden applies. */
  totalTrainingCO2Grams?: number;
}

export interface HuggingFaceModelInfo {
  modelId: string;
  pipelineTag?: string;
  tags?: string[];
  siblings?: {
    rfilename: string;
  }[];
  config?: {
    hidden_size?: number;
    num_hidden_layers?: number;
    num_attention_heads?: number;
    vocab_size?: number;
    max_position_embeddings?: number;
    model_type?: string;
    architectures?: string[];
    num_parameters?: number;
  };
  safetensors?: {
    parameters?: number;
  };
  cardData?: {
    license?: string;
    tags?: string[];
    datasets?: string[];
    co2_eq_emissions?: {
      emissions?: number;
      source?: string;
      training_type?: string;
      geographical_location?: string;
      hardware_used?: string;
    };
  };
}

export interface CarbonIntensityData {
  location: string;
  carbonIntensity: number;
  timestamp: Date;
  renewablePercentage: number;
  source: string;
}
