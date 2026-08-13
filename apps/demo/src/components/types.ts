import type React from "react";
import type { LucideIcon } from "lucide-react";

export interface ModelEntry {
  id: string;
  name: string;
}

export interface ModelCategoryDef {
  label: string;
  description: string;
  icon: LucideIcon;
  models: ModelEntry[];
  defaultModel: string;
  responseTime: number;
}

export type ModelCategories = Record<string, ModelCategoryDef>;

// Loose structural types matching the library's profiles/results.
// We avoid importing the library's internal types to keep the demo decoupled.
export type ModelProfile = {
  displayName: string;
  parameters: number;
  defaultInputTokens: number;
  defaultOutputTokens: number;
  /** Measured p50 GPU time per request (queue excluded), used by the calculator. */
  defaultResponseTimeSeconds?: number;
  /** Measured GPU concurrency (Little's Law), shown as an operating-point datapoint. */
  defaultConcurrency?: number;
  popularity?: { downloadsPerMonth: number };
};

export type ModelProfilesMap = Record<string, ModelProfile | undefined>;

export type GridRegion = {
  name: string;
  intensityGPerKwh: number;
};

/** Which serving deployment the request runs on (who runs the hardware). */
export type DeploymentProfile = "onprem" | "shared" | "hyperscaler";

export type InferenceComponents = {
  gpuOperational: { co2Grams: number; energyKwh: number };
  gpuIdle: { co2Grams: number; energyKwh: number };
  serverOperational: { co2Grams: number };
  datacenterOverhead: { co2Grams: number };
  embodiedGpu: { co2Grams: number };
  embodiedOther: { co2Grams: number };
};

export type InferenceResult = {
  totalCO2Grams: number;
  waterLiters: number;
  components: InferenceComponents;
  /** Number of GPUs the selected model is spread across (memory-bound). */
  gpusAllocated: number;
};

export interface CalculatorState {
  modelCategory: string;
  selectedModel: string;
  region: string;
  gpuCondition: "new" | "refurbished";
  infraCondition: "new" | "refurbished";
  deployment: DeploymentProfile;
  hourOfDay: number;
}

export interface CalculatorActions {
  setModelCategory: (v: string) => void;
  setSelectedModel: (v: string) => void;
  setRegion: (v: string) => void;
  setGpuCondition: (v: "new" | "refurbished") => void;
  setInfraCondition: (v: "new" | "refurbished") => void;
  setDeployment: (v: DeploymentProfile) => void;
  setHourOfDay: (v: number) => void;
}

// Everything the guide/wizard sections need, computed once in App.
export interface CalculatorDerived {
  category: ModelCategoryDef;
  model: ModelProfile | undefined;
  grid: GridRegion | undefined;
  result: InferenceResult | null;
  modelCategories: ModelCategories;
}
