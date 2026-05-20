export * from "./inference";
export * from "./units";
export * from "./domain-types";
export * from "./config";
export {
  estimateCO2,
  estimateCO2FromEnergy,
  estimateCO2FromTokens,
  getAllModelCO2Profiles,
} from "./calculator";

// Infrastructure builder exports (needed by tests)
export {
  createInfrastructureConfig,
  createEstimationParams,
} from "./templates/infrastructure-templates";
export { calculateInfrastructureCO2 } from "./infrastructure-calculator";

// API compatibility: keep old exports
export { huggingFaceService } from "./huggingface";
