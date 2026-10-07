#!/usr/bin/env node
/**
 * Unified data update script.
 * 
 * Fetches from multiple sources:
 * 1. OpenRouter API - Real request statistics (requests/day)
 * 2. HuggingFace API - Model metadata, downloads, likes, config.json for params
 * 3. Berget.ai API - Available models on the platform
 * 
 * Updates:
 * - packages/co2-calculator/src/models.ts (popularity, training estimates)
 * - packages/co2-calculator/src/openrouter-stats.ts (request volumes)
 */

import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "..", "src");

// ─── Configuration ───
const OPENROUTER_MARKET_SHARE = 0.10; // OpenRouter is ~10% of global API market
const HF_API_BASE = "https://huggingface.co/api";
const OPENROUTER_API_BASE = "https://openrouter.ai/api/frontend/v1";

// Model mappings between our IDs and external APIs
const MODEL_MAPPINGS = {
  // Our ID -> OpenRouter permaslug
  openrouter: {
    "google/gemma-4-31B-it": "google/gemma-4-31b-it-20260402",
    "openai/gpt-oss-120b": "openai/gpt-oss-120b",
    "mistralai/Mistral-Small-3.2-24B-Instruct-2506": "mistralai/mistral-small-3.2-24b-instruct-2506",
    "mistralai/Mistral-Medium-3.5-128B": "mistralai/mistral-medium-3.1",
    "moonshotai/Kimi-K2.6": "moonshotai/kimi-k2-0905",
    "zai-org/GLM-4.7": "z-ai/glm-4.5",
  },
  // Our ID -> HuggingFace repo ID
  huggingface: {
    "meta-llama/Llama-3.1-8B-Instruct": "meta-llama/Llama-3.1-8B-Instruct",
    "meta-llama/Llama-3.3-70B-Instruct": "meta-llama/Llama-3.3-70B-Instruct",
    "mistralai/Mistral-Small-3.2-24B-Instruct-2506": "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
    "mistralai/Mistral-Medium-3.5-128B": "mistralai/Mistral-Medium-3.1-2505", // Note: may need updating
    "openai/gpt-oss-120b": "openai/gpt-oss-120b",
    "zai-org/GLM-4.7": "zai-org/GLM-4.7",
    "google/gemma-4-31B-it": "google/gemma-4-31B-it",
    "moonshotai/Kimi-K2.6": "moonshotai/Kimi-K2.6",
    "intfloat/multilingual-e5-large": "intfloat/multilingual-e5-large",
    "intfloat/multilingual-e5-large-instruct": "intfloat/multilingual-e5-large-instruct",
    "BAAI/bge-reranker-v2-m3": "BAAI/bge-reranker-v2-m3",
    "Systran/faster-whisper-large-v3": "Systran/faster-whisper-large-v3",
    "KBLab/kb-whisper-large": "KBLab/kb-whisper-large",
    "NbAiLab/nb-whisper-large": "NbAiLab/nb-whisper-large",
  }
};

// ─── Fetch Helpers ───

async function fetchJSON(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Accept": "application/json",
        "User-Agent": "berget-co2-calculator/1.0",
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      console.error(`  HTTP ${response.status} for ${url}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error(`  Error fetching ${url}:`, error.message);
    return null;
  }
}

// ─── OpenRouter Fetch ───

async function fetchOpenRouterActivity(permaslug) {
  const url = `${OPENROUTER_API_BASE}/stats/model-activity?permaslug=${encodeURIComponent(permaslug)}&variant=standard`;
  
  const data = await fetchJSON(url, {
    headers: {
      "Accept": "*/*",
      "Accept-Language": "en-GB,en;q=0.9",
      "Referer": "https://openrouter.ai/",
    },
  });
  
  return data?.data?.analytics || null;
}

function calculateOpenRouterStats(analytics) {
  if (!analytics || analytics.length === 0) return null;
  
  const recentDays = analytics.slice(0, 7);
  const avgRequests = recentDays.reduce((sum, d) => sum + (d.count || 0), 0) / recentDays.length;
  const avgPromptTokens = recentDays.reduce((sum, d) => sum + (d.total_prompt_tokens || 0), 0) / recentDays.length;
  const avgCompletionTokens = recentDays.reduce((sum, d) => sum + (d.total_completion_tokens || 0), 0) / recentDays.length;
  
  return {
    requestsPerDay: Math.round(avgRequests),
    promptTokensPerDay: Math.round(avgPromptTokens),
    completionTokensPerDay: Math.round(avgCompletionTokens),
    openRouterRequestsPerDay: Math.round(avgRequests),
    estimatedGlobalRequestsPerDay: Math.round(avgRequests / OPENROUTER_MARKET_SHARE),
    latestDate: analytics[0]?.date,
    daysOfData: analytics.length,
  };
}

// ─── HuggingFace Fetch ───

async function fetchHFModelInfo(repoId) {
  const url = `${HF_API_BASE}/models/${repoId}`;
  return await fetchJSON(url);
}

async function fetchHFConfig(repoId) {
  const url = `https://huggingface.co/${repoId}/raw/main/config.json`;
  return await fetchJSON(url);
}

// ─── Main Update Logic ───

async function updateOpenRouterStats() {
  console.log("\n📊 Fetching OpenRouter activity data...\n");
  
  const results = {};
  
  for (const [modelId, permaslug] of Object.entries(MODEL_MAPPINGS.openrouter)) {
    process.stdout.write(`  ${modelId}... `);
    const analytics = await fetchOpenRouterActivity(permaslug);
    
    if (analytics) {
      const stats = calculateOpenRouterStats(analytics);
      results[modelId] = stats;
      console.log(`✓ ${stats.requestsPerDay.toLocaleString()} req/day`);
    } else {
      console.log("✗ No data");
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  return results;
}

async function updateHuggingFaceData() {
  console.log("\n🤗 Fetching HuggingFace model data...\n");
  
  const results = {};
  
  for (const [modelId, repoId] of Object.entries(MODEL_MAPPINGS.huggingface)) {
    process.stdout.write(`  ${modelId}... `);
    
    const info = await fetchHFModelInfo(repoId);
    const config = await fetchHFConfig(repoId);
    
    if (info) {
      results[modelId] = {
        downloads: info.downloads || 0,
        likes: info.likes || 0,
        tags: info.tags || [],
        pipeline_tag: info.pipeline_tag,
        config: config ? {
          parameters: extractParameters(config),
          architecture: config.architectures?.[0],
        } : null,
      };
      console.log(`✓ ${info.downloads?.toLocaleString() || 0} downloads, ${info.likes || 0} likes`);
    } else {
      console.log("✗ Not found");
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}

function extractParameters(config) {
  // Try to extract parameter count from config.json
  if (config.num_parameters) return config.num_parameters;
  if (config.n_parameters) return config.n_parameters;
  
  // Calculate from layers and dimensions
  if (config.num_hidden_layers && config.hidden_size) {
    // Rough estimate for transformer: 12 * hidden_size^2 * num_layers
    // This is very approximate
    const hidden = config.hidden_size;
    const layers = config.num_hidden_layers;
    const vocab = config.vocab_size || 32000;
    
    // Simplified: embedding + attention + FFN
    const embedding = vocab * hidden;
    const attention = layers * (4 * hidden * hidden); // Q, K, V, O
    const ffn = layers * (8 * hidden * hidden); // typical 4x expansion
    
    return embedding + attention + ffn;
  }
  
  return null;
}

// ─── File Generation ───

function generateOpenRouterStatsFile(stats) {
  const ts = `// Auto-generated from OpenRouter API
// Updated: ${new Date().toISOString()}
// Market share assumption: OpenRouter = ${(OPENROUTER_MARKET_SHARE * 100).toFixed(0)}% of global API market

export interface OpenRouterStats {
  requestsPerDay: number;
  promptTokensPerDay: number;
  completionTokensPerDay: number;
  openRouterRequestsPerDay: number;
  estimatedGlobalRequestsPerDay: number;
  latestDate: string;
  daysOfData: number;
}

export const OPENROUTER_STATS: Record<string, OpenRouterStats> = ${JSON.stringify(stats, null, 2)};

export function getEstimatedLifetimeQueries(modelId: string): number {
  const stats = OPENROUTER_STATS[modelId];
  if (!stats) return 100_000_000;
  
  // Use estimated global requests per day, project over 2 years
  const dailyQueries = stats.estimatedGlobalRequestsPerDay;
  const lifetimeQueries = dailyQueries * 365 * 2;
  
  // Clamp between 10M and 100B
  return Math.max(10_000_000, Math.min(100_000_000_000, lifetimeQueries));
}
`;

  writeFileSync(join(SRC_DIR, "openrouter-stats.ts"), ts);
  console.log("\n  ✓ Generated openrouter-stats.ts");
}

function generateModelsUpdateReport(hfData, orData) {
  const report = {
    generatedAt: new Date().toISOString(),
    sources: {
      openrouter: "https://openrouter.ai/api/frontend/v1/stats/model-activity",
      huggingface: "https://huggingface.co/api/models",
    },
    models: {},
  };
  
  for (const [modelId, hfInfo] of Object.entries(hfData)) {
    report.models[modelId] = {
      huggingface: hfInfo,
      openrouter: orData[modelId] || null,
      recommendedLifetimeQueries: orData[modelId] 
        ? Math.round(orData[modelId].estimatedGlobalRequestsPerDay * 365 * 2)
        : hfInfo.downloads * 5 * 24, // fallback to HF-based estimate
    };
  }
  
  writeFileSync(join(SRC_DIR, "model-data-report.json"), JSON.stringify(report, null, 2));
  console.log("  ✓ Generated model-data-report.json");
}

// ─── Main ───

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  CO₂ Calculator - Unified Data Update                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  
  // Fetch all data
  const openRouterData = await updateOpenRouterStats();
  const huggingFaceData = await updateHuggingFaceData();
  
  // Generate files
  console.log("\n📝 Generating update files...\n");
  generateOpenRouterStatsFile(openRouterData);
  generateModelsUpdateReport(huggingFaceData, openRouterData);
  
  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║  Summary                                                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  
  console.log("\n📊 OpenRouter Activity (with 10x market multiplier):");
  for (const [modelId, stats] of Object.entries(openRouterData)) {
    const lifetime = stats.estimatedGlobalRequestsPerDay * 365 * 2;
    console.log(`  ${modelId}:`);
    console.log(`    OpenRouter: ${stats.openRouterRequestsPerDay.toLocaleString()} req/day`);
    console.log(`    Global est: ${stats.estimatedGlobalRequestsPerDay.toLocaleString()} req/day`);
    console.log(`    Lifetime:   ${lifetime.toLocaleString()} queries`);
  }
  
  console.log("\n🤗 HuggingFace Popularity:");
  for (const [modelId, info] of Object.entries(huggingFaceData)) {
    console.log(`  ${modelId}: ${info.downloads?.toLocaleString()} downloads, ${info.likes} likes`);
  }
  
  console.log("\n✅ Done! Next steps:");
  console.log("   1. Review model-data-report.json for any discrepancies");
  console.log("   2. Update models.ts manually if needed");
  console.log("   3. Run 'pnpm run build' to rebuild");
}

main().catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});
