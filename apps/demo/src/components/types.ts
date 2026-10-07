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
  /** SEI best practice: what an additional kWh causes (sourced per region). */
  marginal?: {
    gPerKwh: number;
    hourly?: number[];
    source: string;
    year: number;
  };
  /** ISO 3166-1 alpha-2 country code, e.g. "SE", "US". */
  countryCode?: string;
  /** Grid boundary granularity (e.g. "Texas (ERCOT)" is sub-national). */
  boundary?: {
    level: "country" | "sub-national" | "global";
    country?: string;
    market?: string;
  };
};

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
  /** Grid accounting metadata + marginal-impact result (see lib types). */
  accounting?: {
    method: "average" | "marginal";
    marginalAvailable: boolean;
    marginalFallbackReason?: "marginal-data-missing";
  };
  marginal?: {
    totalCO2Grams: number;
    effectiveIntensityGPerKwh: number;
    hourlyGPerKwhApplied?: number;
    source: string;
    year: number;
  };
};

export interface CalculatorState {
  modelCategory: string;
  selectedModel: string;
  region: string;
  /** Grid carbon accounting method (SEI best practice: marginal > average). */
  accounting: "average" | "marginal";
  gpuCondition: "new" | "refurbished";
  infraCondition: "new" | "refurbished";
  utilization: number;
  hourOfDay: number;
}

export interface CalculatorActions {
  setModelCategory: (v: string) => void;
  setSelectedModel: (v: string) => void;
  setRegion: (v: string) => void;
  setAccounting: (v: "average" | "marginal") => void;
  setGpuCondition: (v: "new" | "refurbished") => void;
  setInfraCondition: (v: "new" | "refurbished") => void;
  setUtilization: (v: number) => void;
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
