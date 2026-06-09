/**
 * Fluent builder API for CO₂ estimation.
 *
 * Provides ergonomic classes to describe:
 *   – Compute infrastructure (GPUs, servers, network, storage)
 *   – AI models and their training carbon footprint
 *   – Usage patterns (24-hour + 7-day demand curves)
 *   – Region-specific grid carbon intensity
 *
 * These builders are designed for **interactive tools** (web calculators,
 * CLI wizards) where end users drag sliders or pick from dropdowns.
 *
 * Example:
 * ```typescript
 * import { a100, generic1U, ModelConfig, UsagePattern, ConfigCreator } from "./builder";
 *
 * const machines = [a100(8).condition("refurbished"), generic1U()];
 * const model  = new ModelConfig("meta-llama/Llama-3.1-8B-Instruct");
 * const usage  = new UsagePattern().withHourlyWeights([...]);
 *
 * const creator = new ConfigCreator(machines, model, usage, { carbonIntensity: 200 });
 * const result = creator.estimateCO2({ tokenCount: 1000, hourOfDay: 3 });
 *
 * console.log(`CO₂: ${result.co2Grams.toFixed(3)} g`);
 * console.log(`Low period: ${result.timing?.isLowPeriod ? "yes (cheaper!)" : "no"}`);
 * ```
 */

export {
  GPU,
  Server,
  NetworkSwitch,
  Storage,
  a100,
  h100,
  l40s,
  rtx4090,
  mi300x,
  generic1U,
  generic2U,
  genericSwitch,
  genericStorage,
} from "./machines";

export { ModelConfig } from "./models";
export { UsagePattern } from "./usage";
export { ConfigCreator } from "./config-creator";
