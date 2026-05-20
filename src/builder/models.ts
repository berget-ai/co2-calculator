/**
 * Fluent builder for AI model configurations.
 *
 * Encapsulates model selection, training-CO₂ capture, and parameter
 * estimation in one ergonomic class.
 *
 * Example:
 * ```typescript
 * const model = new ModelConfig("meta-llama/Llama-3.1-8B-Instruct")
 *   .withTrainingCO2(8_000_000); // 8 kg total training CO₂
 * ```
 */

export class ModelConfig {
  /** Hugging Face model identifier. */
  modelId: string;

  /** Total parameters (inferred from model card or set explicitly). */
  parameters = 7_000_000_000;

  /** Total training CO₂ in grams.
   *  Source: Hugging Face `co2_eq_emissions` field or literature estimate.
   *  Set to 0 for inference-only / fine-tuned variants. */
  totalTrainingCO2Grams?: number;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  /** Set the total training CO₂ in grams. */
  withTrainingCO2(grams: number): ModelConfig {
    this.totalTrainingCO2Grams = grams;
    return this;
  }

  /** Override parameter count when not using a known HF model. */
  withParameters(params: number): ModelConfig {
    this.parameters = params;
    return this;
  }

  /** Estimate training CO₂ from parameter count when no explicit value is set.
   *  Heuristic: 1.2 g training CO₂ per billion parameters (Strubell et al.). */
  estimateTrainingCO2(): number {
    if (this.totalTrainingCO2Grams !== undefined) {
      return this.totalTrainingCO2Grams;
    }
    return (this.parameters / 1_000_000_000) * 1.2;
  }
}
