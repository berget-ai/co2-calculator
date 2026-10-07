#!/usr/bin/env node
/**
 * Fetch real request statistics from OpenRouter API
 * and update model popularity data.
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Model permalugs on OpenRouter (may differ from HF IDs)
const OPENROUTER_MODELS = {
  "google/gemma-4-31B-it": "google/gemma-4-31b-it-20260402",
  "openai/gpt-oss-120b": "openai/gpt-oss-120b",
  "mistralai/Mistral-Small-3.2-24B-Instruct-2506": "mistralai/mistral-small-3.2-24b-instruct-2506",
  "mistralai/Mistral-Medium-3.5-128B": "mistralai/mistral-medium-3.1",
  "moonshotai/Kimi-K2.6": "moonshotai/kimi-k2-0905",
  "zai-org/GLM-4.7": "z-ai/glm-4.5",
};

async function fetchModelActivity(permaslug) {
  const url = `https://openrouter.ai/api/frontend/v1/stats/model-activity?permaslug=${encodeURIComponent(permaslug)}&variant=standard`;
  
  try {
    const response = await fetch(url, {
      headers: {
        "Accept": "*/*",
        "Accept-Language": "en-GB,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        "Referer": "https://openrouter.ai/",
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${permaslug}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    return data.data?.analytics || [];
  } catch (error) {
    console.error(`Error fetching ${permaslug}:`, error.message);
    return null;
  }
}

function calculateStats(analytics) {
  if (!analytics || analytics.length === 0) return null;
  
  // Get latest day
  const latest = analytics[0];
  
  // Calculate 7-day average
  const recentDays = analytics.slice(0, 7);
  const avgRequests = recentDays.reduce((sum, d) => sum + d.count, 0) / recentDays.length;
  const avgPromptTokens = recentDays.reduce((sum, d) => sum + d.total_prompt_tokens, 0) / recentDays.length;
  const avgCompletionTokens = recentDays.reduce((sum, d) => sum + d.total_completion_tokens, 0) / recentDays.length;
  
  return {
    requestsPerDay: Math.round(avgRequests),
    promptTokensPerDay: Math.round(avgPromptTokens),
    completionTokensPerDay: Math.round(avgCompletionTokens),
    latestDate: latest.date,
    daysOfData: analytics.length,
  };
}

async function main() {
  console.log("Fetching OpenRouter activity data...\n");
  
  const results = {};
  
  for (const [modelId, permaslug] of Object.entries(OPENROUTER_MODELS)) {
    process.stdout.write(`Fetching ${modelId}... `);
    const analytics = await fetchModelActivity(permaslug);
    
    if (analytics) {
      const stats = calculateStats(analytics);
      results[modelId] = stats;
      console.log(`✓ ${stats.requestsPerDay.toLocaleString()} requests/day`);
    } else {
      console.log("✗ No data");
    }
    
    // Rate limiting - be nice to their API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Save results
  const outputPath = join(__dirname, "..", "src", "openrouter-stats.json");
  
  // Apply 10x multiplier since OpenRouter is ~10% of global API market
  const MARKET_MULTIPLIER = 10;
  
  const output = {
    fetchedAt: new Date().toISOString(),
    source: "OpenRouter API (api/frontend/v1/stats/model-activity)",
    note: `OpenRouter represents ~10% of global API market. Multiplied requests by ${MARKET_MULTIPLIER}x for total market estimate.`,
    marketMultiplier: MARKET_MULTIPLIER,
    models: {},
  };
  
  for (const [modelId, stats] of Object.entries(results)) {
    output.models[modelId] = {
      ...stats,
      openRouterRequestsPerDay: stats.requestsPerDay,
      estimatedGlobalRequestsPerDay: stats.requestsPerDay * MARKET_MULTIPLIER,
    };
  }
  
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✓ Saved to ${outputPath}`);
  
  // Print summary
  console.log("\n=== Summary (with 10x market multiplier) ===");
  for (const [modelId, stats] of Object.entries(results)) {
    const globalRequestsPerDay = stats.requestsPerDay * MARKET_MULTIPLIER;
    const lifetimeEstimate = globalRequestsPerDay * 365 * 2; // 2 years
    console.log(`${modelId}:`);
    console.log(`  OpenRouter requests/day: ${stats.requestsPerDay.toLocaleString()}`);
    console.log(`  Est. global requests/day: ${globalRequestsPerDay.toLocaleString()}`);
    console.log(`  Est. lifetime queries: ${lifetimeEstimate.toLocaleString()}`);
  }
}

main().catch(console.error);
