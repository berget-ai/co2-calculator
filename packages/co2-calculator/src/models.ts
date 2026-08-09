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
  "mistralai/Mistral-Small-3.2-24B-Instruct-2506": {
    modelId: "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
    displayName: "Mistral Small 24B",
    architecture: "dense-transformer",
    parameters: 24_000_000_000,
    modelSizeBytes: 24_000_000_000 * 2, // BF16: ~48GB
    totalTrainingCO2Grams: 3_200_000_000, // 3,200 tons (Mistral env. report estimate)
    trainingSource: "Mistral AI env. report (HF: 538K+ downloads/month)",
    defaultInputTokens: 800,
    defaultOutputTokens: 133, // Measured mean output tokens/req (30d) via Prometheus
    defaultResponseTimeSeconds: 0.24, // Measured p50 GPU time, queue excluded (30d) via Prometheus vllm
    defaultConcurrency: 1, // Measured ~0.02 via Little's Law (30d); rounds to ~1 concurrent request
    cachedPromptFraction: 0.67, // Measured: 67% of prompt tokens from KV cache (30d, vLLM)
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
    modelSizeBytes: 128_000_000_000 * 1, // FP8: ~128GB
    totalTrainingCO2Grams: 17_000_000_000, // 17,000 tons (SCI-AI extrapolation)
    trainingSource: "SCI-AI extrapolation (Berget AI OpenRouter metadata: 128B dense, FP8)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 64, // Measured mean output tokens/req (30d) via Prometheus
    defaultResponseTimeSeconds: 0.23, // Measured p50 GPU time, queue excluded (30d) via Prometheus vllm
    defaultConcurrency: 1, // Measured ~0.01 via Little's Law (30d); node sits mostly idle
    cachedPromptFraction: 0, // Measured: prefix cache not hit (30d, vLLM)
    popularity: {
      downloadsPerMonth: 390_474,
      hfLikes: 349,
    },
  },
  "zai-org/GLM-5.2": {
    modelId: "zai-org/GLM-5.2",
    displayName: "GLM 5.2 (753B MoE)",
    architecture: "mixture-of-experts",
    parameters: 753_000_000_000, // 753B total params (MoE)
    modelSizeBytes: 753_000_000_000 * 1, // FP8: ~753GB
    totalTrainingCO2Grams: 52_000_000_000, // parameter-scaling estimate (Zhipu AI undisclosed)
    trainingSource: "Parameter-scaling estimate (Berget AI OpenRouter metadata, 753B MoE, FP8)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 392, // Measured mean output tokens/req (30d) via Prometheus
    defaultResponseTimeSeconds: 6.29, // Measured p50 GPU time, queue excluded (30d) via Prometheus sglang
    defaultConcurrency: 1, // Measured ~0.9 via Little's Law (30d)
    cachedPromptFraction: 0, // Prefix cache disabled on the SGLang B300 deployment
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
    defaultOutputTokens: 482, // Measured mean output tokens/req (30d) via Prometheus
    defaultResponseTimeSeconds: 2.02, // Measured p50 GPU time, queue excluded (30d) via Prometheus vllm
    defaultConcurrency: 3, // Measured ~2.5 via Little's Law (30d) — rounds to ~3 concurrent requests
    cachedPromptFraction: 0.33, // Measured: 33% of prompt tokens from KV cache (30d, vLLM)
    popularity: {
      downloadsPerMonth: 10_131_972,
      hfLikes: 2950,
    },
  },
  "moonshotai/Kimi-K3": {
    modelId: "moonshotai/Kimi-K3",
    displayName: "Kimi K3 (2.8T MoE)",
    architecture: "mixture-of-experts",
    parameters: 2_800_000_000_000, // 2.8T total params (104B active)
    modelSizeBytes: 2_800_000_000_000 * 0.5, // INT4: ~1.4TB
    totalTrainingCO2Grams: 140_000_000_000, // parameter-scaling estimate (Moonshot AI undisclosed)
    trainingSource: "Parameter-scaling estimate (Berget AI OpenRouter metadata, 2.8T MoE / 104B active, INT4)",
    defaultInputTokens: 5_000,
    defaultOutputTokens: 387, // Measured mean output tokens/req (30d) via Prometheus
    defaultResponseTimeSeconds: 6.65, // Measured p50 GPU time, queue excluded (30d) via Prometheus sglang
    defaultConcurrency: 3, // Measured ~2.7 via Little's Law (30d)
    cachedPromptFraction: 0, // Prefix cache disabled on the SGLang B300 deployment
  },

  // -----------------------------------------------------------------------
  // Frontier / Closed Models
  //
  // Parameter counts are EcoLogits estimates (github.com/mlco2/ecologits).
  // Closed providers do not disclose sizes, so these are midpoints of the
  // published min/max ranges; MoE figures are total parameters.
  // -----------------------------------------------------------------------
  "anthropic/claude-opus-4-5": {
    modelId: "anthropic/claude-opus-4-5",
    displayName: "Claude Opus 4.5",
    architecture: "mixture-of-experts",
    parameters: 670_000_000_000, // EcoLogits total (MoE)
    modelSizeBytes: 670_000_000_000 * 0.5, // ~335GB quantised
    totalTrainingCO2Grams: 33_500_000_000, // parameter-scaling estimate (undisclosed)
    trainingSource: "EcoLogits parameter estimate (Anthropic undisclosed)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 800,
    defaultResponseTimeSeconds: 18.0,
  },
  "anthropic/claude-sonnet-4-5": {
    modelId: "anthropic/claude-sonnet-4-5",
    displayName: "Claude Sonnet 4.5",
    architecture: "mixture-of-experts",
    parameters: 440_000_000_000, // EcoLogits total (MoE)
    modelSizeBytes: 440_000_000_000 * 0.5, // ~220GB quantised
    totalTrainingCO2Grams: 22_000_000_000, // parameter-scaling estimate (undisclosed)
    trainingSource: "EcoLogits parameter estimate (Anthropic undisclosed)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 800,
    defaultResponseTimeSeconds: 12.0,
  },
  "openai/gpt-5": {
    modelId: "openai/gpt-5",
    displayName: "GPT-5",
    architecture: "mixture-of-experts",
    parameters: 300_000_000_000, // EcoLogits total (MoE)
    modelSizeBytes: 300_000_000_000 * 0.5, // ~150GB quantised
    totalTrainingCO2Grams: 15_000_000_000, // parameter-scaling estimate (undisclosed)
    trainingSource: "EcoLogits parameter estimate (OpenAI undisclosed)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 800,
    defaultResponseTimeSeconds: 10.0,
  },
  "openai/gpt-5-pro": {
    modelId: "openai/gpt-5-pro",
    displayName: "GPT-5 Pro",
    architecture: "mixture-of-experts",
    parameters: 3_600_000_000_000, // EcoLogits total (MoE)
    modelSizeBytes: 3_600_000_000_000 * 0.5, // ~1.8TB quantised
    totalTrainingCO2Grams: 180_000_000_000, // parameter-scaling estimate (undisclosed)
    trainingSource: "EcoLogits parameter estimate (OpenAI undisclosed)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 800,
    defaultResponseTimeSeconds: 30.0,
  },
  "google/gemini-2.5-pro": {
    modelId: "google/gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    architecture: "mixture-of-experts",
    parameters: 2_000_000_000_000, // EcoLogits total (MoE)
    modelSizeBytes: 2_000_000_000_000 * 0.5, // ~1TB quantised
    totalTrainingCO2Grams: 100_000_000_000, // parameter-scaling estimate (undisclosed)
    trainingSource: "EcoLogits parameter estimate (Google undisclosed)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 800,
    defaultResponseTimeSeconds: 20.0,
  },
  "google/gemini-3-pro": {
    modelId: "google/gemini-3-pro",
    displayName: "Gemini 3 Pro",
    architecture: "mixture-of-experts",
    parameters: 1_200_000_000_000, // EcoLogits total (MoE)
    modelSizeBytes: 1_200_000_000_000 * 0.5, // ~600GB quantised
    totalTrainingCO2Grams: 60_000_000_000, // parameter-scaling estimate (undisclosed)
    trainingSource: "EcoLogits parameter estimate (Google undisclosed)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 800,
    defaultResponseTimeSeconds: 16.0,
  },
  "mistralai/mistral-large-2512": {
    modelId: "mistralai/mistral-large-2512",
    displayName: "Mistral Large 123B",
    architecture: "dense-transformer",
    parameters: 123_000_000_000, // EcoLogits (dense)
    modelSizeBytes: 123_000_000_000 * 2, // FP16: ~246GB
    totalTrainingCO2Grams: 16_000_000_000, // Mistral env. report extrapolation
    trainingSource: "EcoLogits / Mistral AI env. report (123B dense)",
    defaultInputTokens: 1_000,
    defaultOutputTokens: 800,
    defaultResponseTimeSeconds: 18.0,
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
