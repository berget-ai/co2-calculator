/**
 * Inference calculator module – production-calibrated CO₂ estimation.
 *
 * This module replaces the token-based estimates in `../calculator.ts`
 * with real inference accounting based on:
 *   - Measured response time (from production vLLM histograms)
 *   - Dynamic GPU allocation by model size
 *   - Shared server overhead by concurrency
 *   - Dual-grid comparisons (deployment vs reference)
 */

export * from "./types";
export * from "./calculator";
export { MODEL_PROFILES, getModelsByCategory } from "./models";
export { HARDWARE_CONFIGS } from "./hardware";
export { GRID_REGIONS } from "./grids";
