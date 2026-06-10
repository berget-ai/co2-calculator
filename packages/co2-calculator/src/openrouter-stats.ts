// Auto-generated from OpenRouter API
// Updated: 2026-06-10T08:19:55.058Z
// Market share assumption: OpenRouter = 10% of global API market

export interface OpenRouterStats {
  requestsPerDay: number;
  promptTokensPerDay: number;
  completionTokensPerDay: number;
  openRouterRequestsPerDay: number;
  estimatedGlobalRequestsPerDay: number;
  latestDate: string;
  daysOfData: number;
}

// Regional usage multipliers for models popular outside OpenRouter's core market
// OpenRouter is US/EU-centric, so Chinese models are underrepresented
const REGIONAL_MULTIPLIERS: Record<string, number> = {
  // Chinese models - massive domestic usage not captured by OpenRouter
  "zai-org/GLM-4.7": 50,      // Zhipu AI has huge domestic Chinese deployment
  "moonshotai/Kimi-K2.6": 20,  // Moonshot AI popular in China + SE Asia
  
  // Western models - OpenRouter captures most usage
  "google/gemma-4-31B-it": 1,
  "openai/gpt-oss-120b": 1,
  "mistralai/Mistral-Small-3.2-24B-Instruct-2506": 1,
  "mistralai/Mistral-Medium-3.5-128B": 1,
};

export const OPENROUTER_STATS: Record<string, OpenRouterStats> = {
  "google/gemma-4-31B-it": {
    "requestsPerDay": 5356667,
    "promptTokensPerDay": 25534650683,
    "completionTokensPerDay": 2129282254,
    "openRouterRequestsPerDay": 5356667,
    "estimatedGlobalRequestsPerDay": 53566667,
    "latestDate": "2026-06-10 00:00:00",
    "daysOfData": 31
  },
  "openai/gpt-oss-120b": {
    "requestsPerDay": 12267211,
    "promptTokensPerDay": 45796575179,
    "completionTokensPerDay": 5977908849,
    "openRouterRequestsPerDay": 12267211,
    "estimatedGlobalRequestsPerDay": 122672110,
    "latestDate": "2026-06-10 00:00:00",
    "daysOfData": 31
  },
  "mistralai/Mistral-Small-3.2-24B-Instruct-2506": {
    "requestsPerDay": 1365209,
    "promptTokensPerDay": 3593747368,
    "completionTokensPerDay": 351017507,
    "openRouterRequestsPerDay": 1365209,
    "estimatedGlobalRequestsPerDay": 13652090,
    "latestDate": "2026-06-10 00:00:00",
    "daysOfData": 31
  },
  "mistralai/Mistral-Medium-3.5-128B": {
    "requestsPerDay": 197282,
    "promptTokensPerDay": 676419959,
    "completionTokensPerDay": 67888796,
    "openRouterRequestsPerDay": 197282,
    "estimatedGlobalRequestsPerDay": 1972821,
    "latestDate": "2026-06-10 00:00:00",
    "daysOfData": 31
  },
  "moonshotai/Kimi-K2.6": {
    "requestsPerDay": 614438,
    "promptTokensPerDay": 1838086883,
    "completionTokensPerDay": 114551821,
    "openRouterRequestsPerDay": 614438,
    "estimatedGlobalRequestsPerDay": 6144383,
    "latestDate": "2026-06-10 00:00:00",
    "daysOfData": 31
  },
  "zai-org/GLM-4.7": {
    "requestsPerDay": 14196,
    "promptTokensPerDay": 184722405,
    "completionTokensPerDay": 6166455,
    "openRouterRequestsPerDay": 14196,
    "estimatedGlobalRequestsPerDay": 141957,
    "latestDate": "2026-06-10 00:00:00",
    "daysOfData": 31
  }
};

export function getEstimatedLifetimeQueries(modelId: string): number {
  const stats = OPENROUTER_STATS[modelId];
  if (!stats) return 100_000_000;
  
  // Apply regional multiplier for markets not well-captured by OpenRouter
  const regionalMultiplier = REGIONAL_MULTIPLIERS[modelId] || 1;
  
  // Use estimated global requests per day, project over 2 years
  const dailyQueries = stats.estimatedGlobalRequestsPerDay * regionalMultiplier;
  const lifetimeQueries = dailyQueries * 365 * 2;
  
  // Clamp between 10M and 100B
  return Math.max(10_000_000, Math.min(100_000_000_000, lifetimeQueries));
}
