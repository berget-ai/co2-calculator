// Re-export all branded unit helpers and types so consumers can
// work with physical units directly if they wish.
export * from "./units";

export type {
  CO2EstimationParams,
  CO2EstimationResult,
  ModelCO2Profile,
  HuggingFaceModelInfo,
  CarbonIntensityData,
} from "./domain-types";

export type {
  HardwareType,
  HardwareCondition,
  DeploymentType,
  NetworkTier,
  HardwareComponent,
  GPUNode,
  ComputeInfrastructure,
  CO2EstimationWithInfrastructure,
  InfrastructureCO2Result,
} from "./infrastructure-types";

export {
  estimateCO2,
  estimateCO2FromEnergy,
  estimateCO2FromTokens,
  getModelCO2Profile,
  getAllModelCO2Profiles,
  setModelCO2Profile,
  MODEL_PROFILES,
} from "./calculator";

export { calculateInfrastructureCO2 } from "./infrastructure-calculator";

export {
  infrastructureTemplates,
  createInfrastructureConfig,
  createEstimationParams,
} from "./templates/infrastructure-templates";

export { HuggingFaceService, huggingFaceService } from "./huggingface";

export {
  DEFAULT_CONFIG,
  mergeConfig,
  setCalculatorConfig,
  resetCalculatorConfig,
  getCalculatorConfig,
} from "./config";

export type { CalculatorConfig } from "./config";

export { version } from "../package.json";

// ---------------------------------------------------------------------------
// Fluent builder API (for interactive tools)
// ---------------------------------------------------------------------------

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
} from "./builder/machines";

export { ModelConfig } from "./builder/models";
export { UsagePattern } from "./builder/usage";
export { ConfigCreator } from "./builder/config-creator";
export type { ConfigCreatorOptions } from "./builder/config-creator";
