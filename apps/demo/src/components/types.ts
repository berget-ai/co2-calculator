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
  totalTrainingCO2Grams: number;
  trainingSource?: string;
  popularity?: { downloadsPerMonth: number };
};

export type ModelProfilesMap = Record<string, ModelProfile | undefined>;

export type GridRegion = {
  name: string;
  intensityGPerKwh: number;
};

export type InferenceComponents = {
  gpuOperational: { co2Grams: number; energyKwh: number };
  serverOperational: { co2Grams: number };
  datacenterOverhead: { co2Grams: number };
  embodiedGpu: { co2Grams: number };
  embodiedOther: { co2Grams: number };
  trainingAmortised: { co2Grams: number };
};

export type InferenceResult = {
  totalCO2Grams: number;
  waterLiters: number;
  components: InferenceComponents;
};

export interface ModelComparison {
  id: string;
  name: string;
  parameters: number;
  totalCO2: number;
  trainingCO2: number;
  popularity: string;
  popularityQueries: number;
  lifetimeQueries: number;
}

export interface CalculatorState {
  modelCategory: string;
  selectedModel: string;
  region: string;
  lifetimeQueries: number;
  gpuCondition: "new" | "refurbished";
  otherComputeCondition: "new" | "refurbished";
  concurrency: number;
  includeTraining: boolean;
}

export interface CalculatorActions {
  setModelCategory: (v: string) => void;
  setSelectedModel: (v: string) => void;
  setRegion: (v: string) => void;
  setLifetimeQueries: (v: number) => void;
  setGpuCondition: (v: "new" | "refurbished") => void;
  setOtherComputeCondition: (v: "new" | "refurbished") => void;
  setConcurrency: (v: number) => void;
  setIncludeTraining: (v: boolean) => void;
}

// Everything the guide/wizard sections need, computed once in App.
export interface CalculatorDerived {
  category: ModelCategoryDef;
  model: ModelProfile | undefined;
  grid: GridRegion | undefined;
  result: InferenceResult | null;
  modelComparisons: ModelComparison[];
  modelCategories: ModelCategories;
}
