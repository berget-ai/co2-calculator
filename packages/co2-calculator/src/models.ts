/**
 * Model profiles with production-calibrated defaults.
 *
 * Training CO₂ sources (in priority order):
 *   1. Manufacturer sustainability reports (Meta, Mistral, Google, Zhipu)
 *   2. SCI-AI extrapolation from disclosed training runs
 *   3. Parameter-scaling heuristics (last resort)
 *
 * Popularity data from Hugging Face (downloads last month, as of June 2026)
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
    modelSizeBytes: 8_000_000_000 * 2, // FP16: ~16GB
    totalTrainingCO2Grams: 420_000_000, // 420 tons CO2eq (Meta sustainability report)
    trainingSource: "Meta sustainability report (HF: 10M+ downloads/month)",
    defaultInputTokens: 800,
    defaultOutputTokens: 400,
    defaultResponseTimeSeconds: 1.2,
    popularity: {
      downloadsPerMonth: 10_031_112,
      hfLikes: 6039,
    },
  },
  "meta-llama/Llama-3.3-70B-Instruct": {
    modelId: "meta-llama/Llama-3.3-70B-Instruct",
    displayName: "Llama 3.3 70B",
    architecture: "dense-transformer",
    parameters: 70_000_000_000,
    modelSizeBytes: 70_000_000_000 * 2, // FP16: ~140GB
    totalTrainingCO2Grams: 2_040_000_000, // 2,040 tons CO2eq (Meta sustainability report)
    trainingSource: "Meta sustainability report (HF: 691K+ downloads/month)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 500,
    defaultResponseTimeSeconds: 12.0,
    popularity: {
      downloadsPerMonth: 691_453,
      hfLikes: 2810,
    },
  },
  "mistralai/Mistral-Small-3.2-24B-Instruct-2506": {
    modelId: "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
    displayName: "Mistral Small 24B",
    architecture: "dense-transformer",
    parameters: 24_000_000_000,
    modelSizeBytes: 24_000_000_000 * 2, // FP16: ~48GB
    totalTrainingCO2Grams: 3_200_000_000, // 3,200 tons (Mistral env. report estimate)
    trainingSource: "Mistral AI env. report (HF: 538K+ downloads/month)",
    defaultInputTokens: 800,
    defaultOutputTokens: 500,
    defaultResponseTimeSeconds: 8.0,
    popularity: {
      downloadsPerMonth: 537_956,
      hfLikes: 593,
    },
  },
  "mistralai/Mistral-Medium-3.5-128B": {
    modelId: "mistralai/Mistral-Medium-3.5-128B",
    displayName: "Mistral Medium 128B",
    architecture: "dense-transformer",
    parameters: 128_000_000_000,
    modelSizeBytes: 128_000_000_000 * 2, // FP16: ~256GB
    totalTrainingCO2Grams: 17_000_000_000, // 17,000 tons (SCI-AI extrapolation)
    trainingSource: "SCI-AI extrapolation (HF: 390K+ downloads/month)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 800,
    defaultResponseTimeSeconds: 20.0,
    popularity: {
      downloadsPerMonth: 390_474,
      hfLikes: 349,
    },
  },
  "openai/gpt-oss-120b": {
    modelId: "openai/gpt-oss-120b",
    displayName: "GPT-OSS 117B",
    architecture: "mixture-of-experts",
    parameters: 117_000_000_000, // 117B total params (MoE with 128 experts, 4 active per token, 5.1B active)
    modelSizeBytes: 117_000_000_000 * 0.5, // MXFP4: ~58GB (fits on single 80GB GPU)
    totalTrainingCO2Grams: 15_000_000_000, // 15,000 tons (OpenAI estimate for 117B MoE)
    trainingSource: "OpenAI MoE training estimate (HF: 4M+ downloads/month, 117B params)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 800,
    defaultResponseTimeSeconds: 18.0,
    popularity: {
      downloadsPerMonth: 4_012_993,
      hfLikes: 4870,
    },
  },
  "zai-org/GLM-4.7": {
    modelId: "zai-org/GLM-4.7",
    displayName: "GLM 4.7 358B",
    architecture: "mixture-of-experts",
    parameters: 358_000_000_000, // 358B total params (MoE with 160 experts, 8 active per token)
    modelSizeBytes: 358_000_000_000 * 0.5, // INT4/FP8: ~179GB
    totalTrainingCO2Grams: 25_000_000_000, // 25,000 tons (Zhipu AI estimate for 358B MoE)
    trainingSource: "Zhipu AI training logs (HF: 66K+ downloads/month, 358B params)",
    defaultInputTokens: 800,
    defaultOutputTokens: 600,
    defaultResponseTimeSeconds: 10.0,
    popularity: {
      downloadsPerMonth: 65_674,
      hfLikes: 2040,
    },
  },
  "google/gemma-4-31B-it": {
    modelId: "google/gemma-4-31B-it",
    displayName: "Gemma 4 31B",
    architecture: "dense-transformer",
    parameters: 30_700_000_000, // 30.7B params (dense, 60 layers)
    modelSizeBytes: 30_700_000_000 * 2, // FP16: ~61GB
    totalTrainingCO2Grams: 4_100_000_000, // 4,100 tons (Google DeepMind estimate)
    trainingSource: "Google DeepMind sustain. (HF: 10M+ downloads/month, 30.7B params)",
    defaultInputTokens: 600,
    defaultOutputTokens: 400,
    defaultResponseTimeSeconds: 6.0,
    popularity: {
      downloadsPerMonth: 10_131_972,
      hfLikes: 2950,
    },
  },
  "moonshotai/Kimi-K2.6": {
    modelId: "moonshotai/Kimi-K2.6",
    displayName: "Kimi K2.6 (1.1T MoE)",
    architecture: "mixture-of-experts",
    parameters: 1_100_000_000_000,
    modelSizeBytes: 1_100_000_000_000 * 0.5, // INT4: ~550GB (MoE, sparse)
    totalTrainingCO2Grams: 50_000_000_000, // 50,000 tons (MoE 1.1T parameter scaling estimate)
    trainingSource: "MoE 1.1T parameter scaling estimate (HF: 2.9M+ downloads/month)",
    defaultInputTokens: 5_000,
    defaultOutputTokens: 200,
    defaultResponseTimeSeconds: 20.0,
    popularity: {
      downloadsPerMonth: 2_880_537,
      hfLikes: 1430,
    },
  },

  // -----------------------------------------------------------------------
  // Embeddings & Reranking
  // -----------------------------------------------------------------------
  "intfloat/multilingual-e5-large": {
    modelId: "intfloat/multilingual-e5-large",
    displayName: "E5 Embedding",
    architecture: "embedding",
    parameters: 560_000_000,
    modelSizeBytes: 560_000_000 * 2, // FP16: ~1.1GB
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
    modelSizeBytes: 560_000_000 * 2, // FP16: ~1.1GB
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
    modelSizeBytes: 278_000_000 * 2, // FP16: ~556MB
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
    modelSizeBytes: 1_550_000_000 * 2, // FP16: ~3.1GB
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
    modelSizeBytes: 1_550_000_000 * 2, // FP16: ~3.1GB
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
    modelSizeBytes: 1_550_000_000 * 2, // FP16: ~3.1GB
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
