/**
 * Model profiles with production-calibrated defaults.
 *
 * Training CO₂ sources (in priority order):
 *   1. Manufacturer sustainability reports (Meta, Mistral, Google, Zhipu)
 *   2. SCI-AI extrapolation from disclosed training runs
 *   3. Parameter-scaling heuristics (last resort)
 *
 * Measured defaults calibrated from vLLM production histograms
 * (berget-gpu and berget-gpu-6gai-direct clusters).
 */

import type { ModelProfile } from "./types.js";

export const MODEL_PROFILES: Record<string, ModelProfile> = {
  // -----------------------------------------------------------------------
  // Text Generation
  // -----------------------------------------------------------------------
  "meta-llama/Llama-3.1-8B-Instruct": {
    modelId: "meta-llama/Llama-3.1-8B-Instruct",
    displayName: "Llama 3.1 8B",
    architecture: "dense-transformer",
    parameters: 8_000_000_000,
    totalTrainingCO2Grams: 1_700_000,
    trainingSource: "Meta sustainability report (HF: N/A)",
    defaultInputTokens: 800,
    defaultOutputTokens: 400,
    defaultResponseTimeSeconds: 1.2,
  },
  "meta-llama/Llama-3.3-70B-Instruct": {
    modelId: "meta-llama/Llama-3.3-70B-Instruct",
    displayName: "Llama 3.3 70B",
    architecture: "dense-transformer",
    parameters: 70_000_000_000,
    totalTrainingCO2Grams: 9_300_000,
    trainingSource: "Meta sustainability report (HF: N/A)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 500,
    defaultResponseTimeSeconds: 12.0,
  },
  "mistralai/Mistral-Small-3.2-24B-Instruct-2506": {
    modelId: "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
    displayName: "Mistral Small 24B",
    architecture: "dense-transformer",
    parameters: 24_000_000_000,
    totalTrainingCO2Grams: 3_200_000,
    trainingSource: "Mistral AI env. report (HF: N/A)",
    defaultInputTokens: 800,
    defaultOutputTokens: 500,
    defaultResponseTimeSeconds: 8.0,
  },
  "mistralai/Mistral-Medium-3.5-128B": {
    modelId: "mistralai/Mistral-Medium-3.5-128B",
    displayName: "Mistral Medium 128B",
    architecture: "dense-transformer",
    parameters: 128_000_000_000,
    totalTrainingCO2Grams: 17_000_000,
    trainingSource: "SCI-AI extrapolation (HF: N/A)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 800,
    defaultResponseTimeSeconds: 20.0,
  },
  "openai/gpt-oss-120b": {
    modelId: "openai/gpt-oss-120b",
    displayName: "GPT-OSS 120B",
    architecture: "dense-transformer",
    parameters: 120_000_000_000,
    totalTrainingCO2Grams: 16_000_000,
    trainingSource: "SCI-AI extrapolation (HF: N/A)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 800,
    defaultResponseTimeSeconds: 18.0,
  },
  "zai-org/GLM-4.7": {
    modelId: "zai-org/GLM-4.7",
    displayName: "GLM 4.7 47B",
    architecture: "dense-transformer",
    parameters: 47_000_000_000,
    totalTrainingCO2Grams: 6_300_000,
    trainingSource: "Zhipu AI training logs (est. HF: N/A)",
    defaultInputTokens: 800,
    defaultOutputTokens: 600,
    defaultResponseTimeSeconds: 10.0,
  },
  "google/gemma-4-31B-it": {
    modelId: "google/gemma-4-31B-it",
    displayName: "Gemma 4 31B",
    architecture: "dense-transformer",
    parameters: 31_000_000_000,
    totalTrainingCO2Grams: 4_100_000,
    trainingSource: "Google DeepMind sustain. (est. HF: N/A)",
    defaultInputTokens: 600,
    defaultOutputTokens: 400,
    defaultResponseTimeSeconds: 6.0,
  },
  "moonshotai/Kimi-K2.6": {
    modelId: "moonshotai/Kimi-K2.6",
    displayName: "Kimi K2.6 (1.1T INT4)",
    architecture: "mixture-of-experts",
    parameters: 1_100_000_000_000,
    totalTrainingCO2Grams: 50_000_000,
    trainingSource: "MoE 1.1T parameter scaling estimate",
    defaultInputTokens: 5_000,
    defaultOutputTokens: 200,
    defaultResponseTimeSeconds: 20.0,
  },

  // -----------------------------------------------------------------------
  // Embeddings & Reranking
  // -----------------------------------------------------------------------
  "intfloat/multilingual-e5-large": {
    modelId: "intfloat/multilingual-e5-large",
    displayName: "E5 Embedding",
    architecture: "embedding",
    parameters: 560_000_000,
    totalTrainingCO2Grams: 280_000,
    trainingSource: "Microsoft Research",
    defaultInputTokens: 300,
    defaultOutputTokens: 1,
    defaultResponseTimeSeconds: 0.3,
  },
  "intfloat/multilingual-e5-large-instruct": {
    modelId: "intfloat/multilingual-e5-large-instruct",
    displayName: "E5 Instruct",
    architecture: "embedding",
    parameters: 560_000_000,
    totalTrainingCO2Grams: 320_000,
    trainingSource: "Microsoft Research (instruct)",
    defaultInputTokens: 300,
    defaultOutputTokens: 1,
    defaultResponseTimeSeconds: 0.3,
  },
  "BAAI/bge-reranker-v2-m3": {
    modelId: "BAAI/bge-reranker-v2-m3",
    displayName: "BGE Reranker",
    architecture: "reranker",
    parameters: 278_000_000,
    totalTrainingCO2Grams: 150_000,
    trainingSource: "BAAI training infrastructure (estimated)",
    defaultInputTokens: 200,
    defaultOutputTokens: 1,
    defaultResponseTimeSeconds: 0.2,
  },

  // -----------------------------------------------------------------------
  // Speech-to-Text
  // -----------------------------------------------------------------------
  "Systran/faster-whisper-large-v3": {
    modelId: "Systran/faster-whisper-large-v3",
    displayName: "Whisper Large v3",
    architecture: "speech",
    parameters: 1_550_000_000,
    totalTrainingCO2Grams: 1_200_000,
    trainingSource: "OpenAI GPU-day estimates",
    defaultInputTokens: 60,
    defaultOutputTokens: 1,
    defaultResponseTimeSeconds: 60.0,
  },
  "KBLab/kb-whisper-large": {
    modelId: "KBLab/kb-whisper-large",
    displayName: "KB Whisper (Swedish)",
    architecture: "speech",
    parameters: 1_550_000_000,
    totalTrainingCO2Grams: 400_000,
    trainingSource: "KBLab fine-tuning run (estimated)",
    defaultInputTokens: 60,
    defaultOutputTokens: 1,
    defaultResponseTimeSeconds: 60.0,
  },
  "NbAiLab/nb-whisper-large": {
    modelId: "NbAiLab/nb-whisper-large",
    displayName: "NB Whisper (Norwegian)",
    architecture: "speech",
    parameters: 1_550_000_000,
    totalTrainingCO2Grams: 400_000,
    trainingSource: "NbAiLab fine-tuning run (estimated)",
    defaultInputTokens: 60,
    defaultOutputTokens: 1,
    defaultResponseTimeSeconds: 60.0,
  },
};

/** Return a sorted display list grouped by architecture */
export function getModelsByCategory(): {
  text: ModelProfile[];
  embedding: ModelProfile[];
  reranker: ModelProfile[];
  speech: ModelProfile[];
} {
  const all = Object.values(MODEL_PROFILES);
  return {
    text: all.filter((m) => m.architecture === "dense-transformer" || m.architecture === "mixture-of-experts"),
    embedding: all.filter((m) => m.architecture === "embedding"),
    reranker: all.filter((m) => m.architecture === "reranker"),
    speech: all.filter((m) => m.architecture === "speech"),
  };
}
