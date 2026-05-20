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

// API compatibility: keep old exports
export { huggingFaceService } from "./huggingface";
