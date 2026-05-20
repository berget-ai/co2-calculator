/**
 * Core CO₂ emissions calculator following the SCI-AI specification.
 *
 * Features added for Berget AI:
 *   – Model training-CO₂ amortisation
 *   – Time-of-day / usage-curve CO₂ factors
 *   – Full idle-cost allocation support
 */

import {
  joules,
  hours,
  gramsCO2e,
  gramsCO2ePerToken,
  gramsCO2ePerKilowattHour,
  joulesToKilowattHours,
  modelParameters,
  flopsPerToken,
  watts,
  architectureEfficiencyFactor,
  flops,
  seconds,
  type Joules,
  type GramsCO2e,
  type GramsCO2ePerToken,
  type GramsCO2ePerKilowattHour,
  type KilowattHours,
  type Seconds,
  type Hours,
  type Flops,
  type KilogramsCO2e,
} from "./units";
import {
  getCalculatorConfig,
  mergeConfig,
  type CalculatorConfig,
} from "./config";
import type {
  CO2EstimationParams,
  CO2EstimationResult,
  ModelCO2Profile,
} from "./domain-types";

const SECONDS_PER_HOUR = 3_600;

/* ------------------------------------------------------------------ */
/* Default profile                                                    */
/* ------------------------------------------------------------------ */

const DEFAULT_PROFILE: ModelCO2Profile = {
  modelId: "default",
  parameters: modelParameters(7_000_000_000),
  flopsPerToken: flopsPerToken(14_000_000_000),
  defaultPowerWatts: watts(250),
  architectureEfficiencyFactor: architectureEfficiencyFactor(0.75),
};

/* ------------------------------------------------------------------ */
/* Pre-configured model profiles with estimated training CO₂          */
/* ------------------------------------------------------------------ */

export const MODEL_PROFILES: Record<string, ModelCO2Profile> = {
  "openai/gpt-oss-120b": {
    modelId: "openai/gpt-oss-120b",
    parameters: modelParameters(120_000_000_000),
    flopsPerToken: flopsPerToken(240_000_000_000),
    defaultPowerWatts: watts(700),
    architectureEfficiencyFactor: architectureEfficiencyFactor(0.85),
    totalTrainingCO2Grams: 14_400_000,
  },
  "meta-llama/Llama-3.3-70B-Instruct": {
    modelId: "meta-llama/Llama-3.3-70B-Instruct",
    parameters: modelParameters(70_000_000_000),
    flopsPerToken: flopsPerToken(140_000_000_000),
    defaultPowerWatts: watts(500),
    architectureEfficiencyFactor: architectureEfficiencyFactor(0.8),
    totalTrainingCO2Grams: 8_400_000,
  },
  "meta-llama/Llama-3.1-8B-Instruct": {
    modelId: "meta-llama/Llama-3.1-8B-Instruct",
    parameters: modelParameters(8_000_000_000),
    flopsPerToken: flopsPerToken(16_000_000_000),
    defaultPowerWatts: watts(200),
    architectureEfficiencyFactor: architectureEfficiencyFactor(0.75),
    totalTrainingCO2Grams: 8,
  },
  "mistralai/Mistral-Small-3.2-24B-Instruct-2506": {
    modelId: "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
    parameters: modelParameters(24_000_000_000),
    flopsPerToken: flopsPerToken(48_000_000_000),
    defaultPowerWatts: watts(300),
    architectureEfficiencyFactor: architectureEfficiencyFactor(0.78),
    totalTrainingCO2Grams: 24,
  },
  "zai-org/GLM-4.7": {
    modelId: "zai-org/GLM-4.7",
    parameters: modelParameters(47_000_000_000),
    flopsPerToken: flopsPerToken(94_000_000_000),
    defaultPowerWatts: watts(400),
    architectureEfficiencyFactor: architectureEfficiencyFactor(0.82),
    totalTrainingCO2Grams: 47,
  },
  "deepseek-ai/DeepSeek-OCR": {
    modelId: "deepseek-ai/DeepSeek-OCR",
    parameters: modelParameters(3_200_000_000),
    flopsPerToken: flopsPerToken(6_400_000_000),
    defaultPowerWatts: watts(150),
    architectureEfficiencyFactor: architectureEfficiencyFactor(0.7),
    totalTrainingCO2Grams: 10, // OCR models: more training per param
  },
  "intfloat/multilingual-e5-large-instruct": {
    modelId: "intfloat/multilingual-e5-large-instruct",
    parameters: modelParameters(560_000_000),
    flopsPerToken: flopsPerToken(1_120_000_000),
    defaultPowerWatts: watts(100),
    architectureEfficiencyFactor: architectureEfficiencyFactor(0.65),
    totalTrainingCO2Grams: 3,
  },
  "intfloat/multilingual-e5-large": {
    modelId: "intfloat/multilingual-e5-large",
    parameters: modelParameters(560_000_000),
    flopsPerToken: flopsPerToken(1_120_000_000),
    defaultPowerWatts: watts(100),
    architectureEfficiencyFactor: architectureEfficiencyFactor(0.65),
    totalTrainingCO2Grams: 3,
  },
  "BAAI/bge-reranker-v2-m3": {
    modelId: "BAAI/bge-reranker-v2-m3",
    parameters: modelParameters(278_000_000),
    flopsPerToken: flopsPerToken(556_000_000),
    defaultPowerWatts: watts(80),
    architectureEfficiencyFactor: architectureEfficiencyFactor(0.68),
    totalTrainingCO2Grams: 2,
  },
  "KBLab/kb-whisper-large": {
    modelId: "KBLab/kb-whisper-large",
    parameters: modelParameters(1_550_000_000),
    flopsPerToken: flopsPerToken(3_100_000_000),
    defaultPowerWatts: watts(120),
    architectureEfficiencyFactor: architectureEfficiencyFactor(0.72),
    totalTrainingCO2Grams: 5,
  },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function getModelProfile(modelId?: string): ModelCO2Profile {
  if (!modelId) return DEFAULT_PROFILE;
  return MODEL_PROFILES[modelId] ?? DEFAULT_PROFILE;
}

/** Estimate training CO₂ from parameter count when not explicitly set.
 *  Strubell et al. heuristic: ~1.2 g training-CO₂ per billion params. */
function estimateTrainingCO2(parameters: number): number {
  return (parameters / 1_000_000_000) * 1.2;
}

/** Apply usage-curve factors to shift CI based on time-of-day. */
function applyUsageCurve(
  ci: GramsCO2ePerKilowattHour,
  hourOfDay: number,
  cfg: CalculatorConfig,
): { adjustedCI: GramsCO2ePerKilowattHour; isLowPeriod: boolean; factor: number } {
  const curve = cfg.usageCurve;
  const weight = curve.hourlyWeights[Math.max(0, Math.min(23, hourOfDay))] ?? 0.5;

  const isLowPeriod = weight <= curve.lowPeriodThreshold;
  const factor = isLowPeriod ? curve.lowPeriodCIFactor : curve.highPeriodCIFactor;

  return {
    adjustedCI: gramsCO2ePerKilowattHour(ci * factor),
    isLowPeriod,
    factor,
  };
}

function calculateTrainingCarbon(
  profile: ModelCO2Profile,
  expectedLifetimeInferences?: number,
): { amortisedPerInference: number; fullTrainingCO2: number } {
  const totalTrainingCO2 =
    profile.totalTrainingCO2Grams ?? estimateTrainingCO2(profile.parameters);

  if (expectedLifetimeInferences && expectedLifetimeInferences > 0) {
    return {
      amortisedPerInference: totalTrainingCO2 / expectedLifetimeInferences,
      fullTrainingCO2: totalTrainingCO2,
    };
  }

  // Not amortised → reported as full training CO₂ in details, but not
  // added to the per-inference total so it doesn't explode per-token.
  return {
    amortisedPerInference: 0,
    fullTrainingCO2: totalTrainingCO2,
  };
}

function calculateOperationalCarbon(
  energyKwh: KilowattHours,
  carbonIntensity: GramsCO2ePerKilowattHour,
): GramsCO2e {
  return gramsCO2e(energyKwh * carbonIntensity);
}

function calculateEmbodiedCarbon(
  hardwareEmbodied: KilogramsCO2e,
  hardwareLifetime: Hours,
  usageDuration: Hours,
  numGPUs = 1,
): GramsCO2e {
  const embodiedPerHour = hardwareEmbodied / hardwareLifetime;
  const totalKilograms = embodiedPerHour * usageDuration * numGPUs;
  return gramsCO2e(totalKilograms * 1_000);
}

function deriveDuration(energyJoules: Joules, powerWatts: number): Seconds {
  if (powerWatts <= 0) return seconds(0);
  return seconds(energyJoules / powerWatts);
}

function resolveConfig(
  explicitOverrides?: Partial<CalculatorConfig>,
): CalculatorConfig {
  if (!explicitOverrides) return getCalculatorConfig();
  return mergeConfig(explicitOverrides, getCalculatorConfig());
}

/* ------------------------------------------------------------------ */
/* Result builder                                                     */
/* ------------------------------------------------------------------ */

function toApiResult(
  co2Grams: GramsCO2e,
  co2PerToken: GramsCO2ePerToken,
  energyKwh: KilowattHours,
  method: CO2EstimationResult["method"],
  operationalCarbon: GramsCO2e,
  embodiedCarbon: GramsCO2e,
  trainingCarbon: number,
  totalFlops?: Flops,
  totalParameters?: number,
  timing?: CO2EstimationResult["timing"],
): CO2EstimationResult {
  const result: CO2EstimationResult = {
    co2Grams: Number(co2Grams),
    co2PerToken: Number(co2PerToken),
    energyKwh: Number(energyKwh),
    method,
    details: {
      operationalCarbon: Number(operationalCarbon),
      embodiedCarbon: Number(embodiedCarbon),
      trainingCarbon: Number(trainingCarbon),
      totalCarbon: Number(co2Grams),
    },
    timing,
  };

  if (totalFlops !== undefined && totalFlops > 0) {
    result.co2PerFlop = Number((co2Grams / totalFlops) * 1e15);
  }

  if (totalParameters !== undefined && totalParameters > 0) {
    result.co2PerParameter = Number((co2Grams / totalParameters) * 1e9);
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

export function estimateCO2FromEnergy(
  energyJoules: number,
  tokenCount: number,
  modelId: string,
  carbonIntensity?: number,
  configOverrides?: Partial<CalculatorConfig>,
  timingParams?: { hourOfDay?: number; expectedLifetimeInferences?: number },
): CO2EstimationResult {
  if (tokenCount <= 0) {
    return createZeroResult();
  }

  const cfg = resolveConfig(configOverrides);
  const profile = getModelProfile(modelId);

  // Resolve carbon intensity + usage-curve adjustment
  const rawCI = carbonIntensity
    ? gramsCO2ePerKilowattHour(carbonIntensity)
    : cfg.carbon.defaultCarbonIntensity;

  const { adjustedCI, isLowPeriod, factor } = timingParams?.hourOfDay !== undefined
    ? applyUsageCurve(rawCI, timingParams.hourOfDay, cfg)
    : { adjustedCI: rawCI, isLowPeriod: false, factor: 1 };

  // Training carbon
  const { amortisedPerInference } = calculateTrainingCarbon(
    profile,
    timingParams?.expectedLifetimeInferences,
  );

  const eJ = joules(energyJoules);
  const nTok = tokenCount;
  const nGPUs = 1;

  const energyKwh = joulesToKilowattHours(eJ);
  const operationalCarbon = calculateOperationalCarbon(energyKwh, adjustedCI);

  const durationSeconds = deriveDuration(eJ, profile.defaultPowerWatts);
  const durationHours = hours(durationSeconds / SECONDS_PER_HOUR);

  const embodiedCarbon = calculateEmbodiedCarbon(
    cfg.carbon.embodiedCarbonPerGpu,
    cfg.carbon.gpuLifetimeHours,
    durationHours,
    nGPUs,
  );

  const totalFlops: Flops = flops(profile.flopsPerToken * nTok);

  const totalCarbon = gramsCO2e(
    operationalCarbon + embodiedCarbon + amortisedPerInference * nTok,
  );

  return toApiResult(
    totalCarbon,
    gramsCO2ePerToken(totalCarbon / nTok),
    energyKwh,
    "gpu-energy",
    operationalCarbon,
    embodiedCarbon,
    amortisedPerInference * nTok,
    totalFlops,
    profile.parameters,
    {
      hourOfDay: timingParams?.hourOfDay,
      isLowPeriod,
      periodFactor: factor,
    },
  );
}

export function estimateCO2FromTokens(
  tokenCount: number,
  modelId: string,
  carbonIntensity?: number,
  configOverrides?: Partial<CalculatorConfig>,
  timingParams?: { hourOfDay?: number; expectedLifetimeInferences?: number },
): CO2EstimationResult {
  if (tokenCount <= 0) {
    return createZeroResult();
  }

  const cfg = resolveConfig(configOverrides);
  const profile = getModelProfile(modelId);

  const rawCI = carbonIntensity
    ? gramsCO2ePerKilowattHour(carbonIntensity)
    : cfg.carbon.defaultCarbonIntensity;

  const { adjustedCI, isLowPeriod, factor } = timingParams?.hourOfDay !== undefined
    ? applyUsageCurve(rawCI, timingParams.hourOfDay, cfg)
    : { adjustedCI: rawCI, isLowPeriod: false, factor: 1 };

  const { amortisedPerInference } = calculateTrainingCarbon(
    profile,
    timingParams?.expectedLifetimeInferences,
  );

  const nTok = tokenCount;
  const nGPUs = 1;

  const estimatedFlops: Flops = flops(profile.flopsPerToken * nTok);
  const estimatedEnergyJoules = joules(
    estimatedFlops /
      (profile.architectureEfficiencyFactor * 1_000_000_000),
  );

  const energyKwh = joulesToKilowattHours(estimatedEnergyJoules);
  const operationalCarbon = calculateOperationalCarbon(energyKwh, adjustedCI);

  const durationSeconds = deriveDuration(
    estimatedEnergyJoules,
    profile.defaultPowerWatts,
  );
  const durationHours = hours(durationSeconds / SECONDS_PER_HOUR);

  const embodiedCarbon = calculateEmbodiedCarbon(
    cfg.carbon.embodiedCarbonPerGpu,
    cfg.carbon.gpuLifetimeHours,
    durationHours,
    nGPUs,
  );

  const totalCarbon = gramsCO2e(
    operationalCarbon + embodiedCarbon + amortisedPerInference * nTok,
  );

  return toApiResult(
    totalCarbon,
    gramsCO2ePerToken(totalCarbon / nTok),
    energyKwh,
    "token-estimate",
    operationalCarbon,
    embodiedCarbon,
    amortisedPerInference * nTok,
    estimatedFlops,
    profile.parameters,
    {
      hourOfDay: timingParams?.hourOfDay,
      isLowPeriod,
      periodFactor: factor,
    },
  );
}

export function estimateCO2(params: CO2EstimationParams): CO2EstimationResult {
  const {
    tokenCount,
    energyJoules,
    carbonIntensity,
    modelId,
    config: configOverrides,
    expectedLifetimeInferences,
  } = params;

  if (tokenCount <= 0) {
    return createZeroResult();
  }

  const resolvedModelId = modelId || "default";

  // Extract hourOfDay from config if present
  const timingParams = {
    expectedLifetimeInferences,
  };

  if (energyJoules !== undefined && energyJoules > 0) {
    return estimateCO2FromEnergy(
      energyJoules,
      tokenCount,
      resolvedModelId,
      carbonIntensity,
      configOverrides,
      timingParams,
    );
  }

  return estimateCO2FromTokens(
    tokenCount,
    resolvedModelId,
    carbonIntensity,
    configOverrides,
    timingParams,
  );
}

function createZeroResult(): CO2EstimationResult {
  return {
    co2Grams: 0,
    co2PerToken: 0,
    method: "token-estimate",
    details: {
      operationalCarbon: 0,
      embodiedCarbon: 0,
      trainingCarbon: 0,
      totalCarbon: 0,
    },
  };
}

export function getModelCO2Profile(
  modelId: string,
): ModelCO2Profile | undefined {
  return MODEL_PROFILES[modelId];
}

export function getAllModelCO2Profiles(): Record<string, ModelCO2Profile> {
  return { ...MODEL_PROFILES };
}

export function setModelCO2Profile(profile: ModelCO2Profile): void {
  MODEL_PROFILES[profile.modelId] = profile;
}
