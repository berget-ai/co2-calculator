/**
 * Client-side model data fetching
 * 
 * Fetches fresh data from:
 * - EcoLogits (GitHub): Model parameters for closed models
 * - OpenRouter: Real usage statistics
 * - HuggingFace: Open model popularity
 * 
 * Caches results in localStorage for 24h to avoid rate limits.
 */

import { useState, useEffect } from "react";

const CACHE_KEY = "co2-calculator-model-data";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface FetchedModelData {
  ecologitsModels: Record<string, any>;
  openRouterStats: Record<string, any>;
  lastUpdated: string;
}

async function fetchEcoLogitsModels(): Promise<Record<string, any>> {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/mlco2/ecologits/main/ecologits/data/models.json"
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const models: Record<string, any> = {};
    
    for (const m of data.models) {
      if (m.provider === "huggingface_hub") continue;
      
      const provider = m.provider === "openai" ? "openai" 
        : m.provider === "anthropic" ? "anthropic"
        : m.provider === "mistralai" ? "mistralai"
        : m.provider === "google_genai" ? "google"
        : m.provider;
      
      const modelId = `${provider}/${m.name}`;
      
      // Extract parameters
      const arch = m.architecture;
      let parameters = 0;
      
      if (typeof arch.parameters === "number") {
        parameters = arch.parameters * 1_000_000_000;
      } else if (arch.parameters?.total) {
        const total = arch.parameters.total;
        parameters = typeof total === "number" 
          ? total * 1_000_000_000
          : ((total.min + total.max) / 2) * 1_000_000_000;
      } else if (arch.parameters?.min) {
        parameters = ((arch.parameters.min + arch.parameters.max) / 2) * 1_000_000_000;
      }
      
      models[modelId] = {
        modelId,
        displayName: m.name,
        architecture: arch.type === "moe" ? "mixture-of-experts" : "dense-transformer",
        parameters: Math.round(parameters),
        modelSizeBytes: Math.round(parameters) * 2, // Assume FP16
        totalTrainingCO2Grams: estimateTrainingCO2(parameters),
        trainingSource: "EcoLogits estimate (github.com/mlco2/ecologits)",
        defaultInputTokens: 1000,
        defaultOutputTokens: 500,
        defaultResponseTimeSeconds: estimateResponseTime(m.deployment),
        ecologitsData: {
          provider: m.provider,
          warnings: m.warnings,
          sources: m.sources,
        },
      };
    }
    
    return models;
  } catch (error) {
    console.warn("Failed to fetch EcoLogits models:", error);
    return {};
  }
}

async function fetchOpenRouterStats(): Promise<Record<string, any>> {
  // OpenRouter models we care about
  const models = [
    "openai/gpt-4o-mini",
    "openai/gpt-4o",
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-opus",
    "mistralai/mistral-small",
    "mistralai/mistral-medium",
  ];
  
  const stats: Record<string, any> = {};
  
  for (const model of models) {
    try {
      const response = await fetch(
        `https://openrouter.ai/api/frontend/v1/stats/model-activity?permaslug=${encodeURIComponent(model)}`,
        { headers: { Accept: "application/json" } }
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const analytics = data.data?.analytics || [];
      
      if (analytics.length > 0) {
        const latest = analytics[analytics.length - 1];
        stats[model] = {
          requestsPerDay: latest.requests || 0,
          tokensPerDay: latest.tokens || 0,
          lastUpdated: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.warn(`Failed to fetch OpenRouter stats for ${model}:`, error);
    }
  }
  
  return stats;
}

function estimateTrainingCO2(parameters: number): number {
  // Rough estimate: ~0.05 kg CO2 per billion parameters for training
  // Based on scaling laws and public estimates
  const paramsInBillions = parameters / 1_000_000_000;
  return paramsInBillions * 0.05 * 1_000_000; // Convert to grams
}

function estimateResponseTime(deployment: any): number {
  if (!deployment) return 2.0;
  
  const ttft = deployment.ttft || 0.5;
  const tps = deployment.tps || 50;
  const outputTokens = 500;
  
  return Math.round((ttft + outputTokens / tps) * 10) / 10;
}

function getCachedData(): FetchedModelData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const age = Date.now() - new Date(data.timestamp).getTime();
    
    if (age > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

function setCachedData(data: FetchedModelData) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    ...data,
    timestamp: Date.now(),
  }));
}

export async function fetchAllModelData(): Promise<FetchedModelData> {
  // Check cache first
  const cached = getCachedData();
  if (cached) {
    console.log("Using cached model data (age:", 
      Math.round((Date.now() - new Date(cached.lastUpdated).getTime()) / 3600000), "h)");
    return cached;
  }
  
  console.log("Fetching fresh model data...");
  
  const [ecologitsModels, openRouterStats] = await Promise.all([
    fetchEcoLogitsModels(),
    fetchOpenRouterStats(),
  ]);
  
  const data: FetchedModelData = {
    ecologitsModels,
    openRouterStats,
    lastUpdated: new Date().toISOString(),
  };
  
  setCachedData(data);
  return data;
}

export function useModelData() {
  const [data, setData] = useState<FetchedModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchAllModelData()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  
  const refresh = async () => {
    setLoading(true);
    localStorage.removeItem(CACHE_KEY);
    try {
      const fresh = await fetchAllModelData();
      setData(fresh);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return { data, loading, error, refresh };
}

// Merge fetched data with static models
export function mergeModelData(
  staticModels: Record<string, any>,
  fetchedData: FetchedModelData | null
): Record<string, any> {
  if (!fetchedData) return staticModels;
  
  return {
    ...staticModels,
    ...fetchedData.ecologitsModels,
  };
}
