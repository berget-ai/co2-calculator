import type { HuggingFaceModelInfo, ModelCO2Profile } from "./domain-types";
import {
  flopsPerToken as makeFlopsPerToken,
  watts,
  architectureEfficiencyFactor as makeEfficiencyFactor,
  modelParameters as makeModelParameters,
  type ModelParameters,
  type FlopsPerToken,
} from "./units";

const HF_API_BASE = "https://huggingface.co/api/models";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1_000; // 24 hours

interface CacheEntry {
  data: HuggingFaceModelInfo;
  timestamp: number;
}

const modelInfoCache = new Map<string, CacheEntry>();

export class HuggingFaceService {
  private static instance: HuggingFaceService | null = null;

  private constructor() {}

  static getInstance(): HuggingFaceService {
    if (!HuggingFaceService.instance) {
      HuggingFaceService.instance = new HuggingFaceService();
    }
    return HuggingFaceService.instance;
  }

  async fetchModelInfo(
    modelId: string,
    useCache: boolean = true,
  ): Promise<HuggingFaceModelInfo | null> {
    if (useCache) {
      const cached = modelInfoCache.get(modelId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${HF_API_BASE}/${modelId}`, {
        headers: {
          "User-Agent": "@berget/co2-emissions-calculator/1.0",
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as HuggingFaceModelInfo;
      modelInfoCache.set(modelId, { data, timestamp: Date.now() });
      return data;
    } catch {
      return null;
    }
  }

  estimateParametersFromConfig(
    config: HuggingFaceModelInfo["config"],
  ): ModelParameters | null {
    if (!config) return null;

    if (config.num_parameters) {
      return makeModelParameters(config.num_parameters);
    }

    const { hidden_size, num_hidden_layers, num_attention_heads, vocab_size } =
      config;

    if (hidden_size && num_hidden_layers && num_attention_heads && vocab_size) {
      const embeddingParams = vocab_size * hidden_size;
      const attentionParams =
        num_hidden_layers * (4 * hidden_size * hidden_size);
      const ffnParams = num_hidden_layers * (8 * hidden_size * hidden_size);
      const layerNormParams = num_hidden_layers * (4 * hidden_size);

      const totalParams =
        embeddingParams + attentionParams + ffnParams + layerNormParams;
      return makeModelParameters(Math.round(totalParams));
    }

    return null;
  }

  /**
   * Estimate FLOPs per token using a heuristic architecture factor.
   *
   * The heuristic is based on the observation that in a forward pass
   * each parameter is typically involved in ~2 FLOPs (multiply-add).
   * The architecture factor scales this down for more efficient
   * architectures that use fused operations, grouped attention, etc.
   *
   * @param parameters        Total model parameter count
   * @param modelTypeHint     e.g. "llama", "mistral" — influences the factor
   * @returns Estimated FLOPs per token
   */
  estimateFlopsPerToken(
    parameters: ModelParameters,
    modelTypeHint?: string,
  ): FlopsPerToken {
    const BASE_FLOPS_PER_PARAM = 2;

    // Architecture efficiency: higher = more efficient (fewer actual FLOPs)
    //   e.g. Mistral's grouped-query attention is more efficient than
    //   standard multi-head attention in early Llama.
    const factor = resolveArchitectureFactor(modelTypeHint);

    return makeFlopsPerToken(
      Math.round(parameters * BASE_FLOPS_PER_PARAM * factor),
    );
  }

  estimatePowerWatts(parameters: number): number {
    if (parameters < 1_000_000_000) return 80;
    if (parameters < 5_000_000_000) return 150;
    if (parameters < 10_000_000_000) return 200;
    if (parameters < 50_000_000_000) return 400;
    if (parameters < 100_000_000_000) return 700;
    return 1200;
  }

  estimateEfficiencyFactor(
    parameters: number,
    modelTypeHint?: string,
  ): number {
    let baseFactor = resolveArchitectureFactor(modelTypeHint);

    if (parameters > 100_000_000_000) {
      baseFactor += 0.05;
    } else if (parameters > 50_000_000_000) {
      baseFactor += 0.03;
    }

    return Math.min(baseFactor, 0.95);
  }

  async calculateCO2Profile(modelId: string): Promise<ModelCO2Profile | null> {
    const modelInfo = await this.fetchModelInfo(modelId);

    if (!modelInfo) {
      return null;
    }

    let parameters: number | null = null;

    if (modelInfo.safetensors?.parameters) {
      parameters = modelInfo.safetensors.parameters;
    } else {
      parameters = this.estimateParametersFromConfig(modelInfo.config);
    }

    if (!parameters || parameters === 0) {
      return null;
    }

    const safeParameters = makeModelParameters(parameters);

    const modelType =
      modelInfo.config?.model_type || modelInfo.config?.architectures?.[0];
    const flopsPerToken = this.estimateFlopsPerToken(
      safeParameters,
      modelType,
    );
    const estimatedPowerWatts = watts(this.estimatePowerWatts(parameters));
    const efficiencyFactor = makeEfficiencyFactor(
      this.estimateEfficiencyFactor(parameters, modelType),
    );

    // Try to read training CO₂ from model card
    let totalTrainingCO2Grams: number | undefined;
    const co2Data = modelInfo.cardData?.co2_eq_emissions;
    if (co2Data && typeof co2Data.emissions === "number" && co2Data.emissions > 0) {
      totalTrainingCO2Grams = co2Data.emissions; // HF stores in grams
    }

    return {
      modelId,
      parameters: safeParameters,
      flopsPerToken,
      defaultPowerWatts: estimatedPowerWatts,
      architectureEfficiencyFactor: efficiencyFactor,
      totalTrainingCO2Grams,
    };
  }

  async preloadModelInfo(modelIds: string[]): Promise<void> {
    const promises = modelIds.map(async (modelId) => {
      try {
        await this.fetchModelInfo(modelId, false);
      } catch {
        // intentionally swallow so that other preloads are not blocked
      }
    });

    await Promise.allSettled(promises);
  }

  clearCache(modelId?: string): void {
    if (modelId) {
      modelInfoCache.delete(modelId);
    } else {
      modelInfoCache.clear();
    }
  }
}

/**
 * Map a model-type string hint to an architecture efficiency factor.
 *
 * Factor range: 0.65 – 0.95
 * Higher = more efficient architecture (fewer actual FLOPs per parameter).
 */
function resolveArchitectureFactor(modelTypeHint?: string): number {
  const type = (modelTypeHint || "").toLowerCase();

  if (type.includes("llama")) return 0.85;
  if (type.includes("mistral")) return 0.88;
  if (type.includes("qwen")) return 0.87;
  if (type.includes("glm")) return 0.82;
  if (type.includes("e5")) return 0.9;
  if (type.includes("whisper")) return 0.75;
  if (type.includes("bge")) return 0.88;

  return 0.75; // default
}

export const huggingFaceService = HuggingFaceService.getInstance();
