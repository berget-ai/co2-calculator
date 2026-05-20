/**
 * Centralised configuration for all scientific assumptions and physical constants
 * used by the CO₂ emissions calculator.
 *
 * Every parameter is documented with its source, default value, and rationale.
 * Consumers can override any value by passing a partial `CalculatorConfig` to
 * the estimation functions, ensuring transparency and reproducibility.
 */

import {
  gramsCO2ePerKilowattHour,
  kilogramsCO2e,
  hours,
  architectureEfficiencyFactor,
  type KilogramsCO2e,
  type Hours,
  type GramsCO2ePerKilowattHour,
  type ArchitectureEfficiencyFactor,
} from "./units";

// ---------------------------------------------------------------------------
// Configuration interfaces
// ---------------------------------------------------------------------------

/**
 * Expected usage curve over a week and over a day.
 *
 * The `hourlyWeights` array has 24 entries (00:00–23:00) where
 * each entry is a relative multiplier for expected load at that
 * hour.  When a customer calls during a low-weight hour, the
 * calculator can report a lower periodFactor (cheaper / cleaner
 * effective CI) and allocate a smaller share of idle carbon.
 *
 * The `weekdayWeights` array has 7 entries (Monday=0 … Sunday=6).
 * Weekends often have lower baseline demand (batch jobs only).
 */
export interface UsageCurveConfig {
  /** Relative load weight per hour of day (24 entries, sum need not be 1). */
  hourlyWeights: number[]; // length 24

  /** Relative load weight per weekday (7 entries, Mon=0). */
  weekdayWeights: number[]; // length 7

  /** Threshold below which an hour is considered "low period". */
  lowPeriodThreshold: number; // e.g. 0.3

  /** Factor applied to CI during low periods (reward batching). */
  lowPeriodCIFactor: number; // e.g. 0.8

  /** Factor applied to CI during high periods. */
  highPeriodCIFactor: number; // e.g. 1.1

  /** Share of total idle carbon billed to low-period callers. */
  lowPeriodIdleShare: number; // e.g. 0.3

  /** Share of total idle carbon billed to peak-period callers. */
  highPeriodIdleShare: number; // e.g. 0.7
}

/**
 * Carbon accounting parameters.
 */
export interface CarbonConfig {
  /** Default grid carbon intensity when not specified by caller.
   *  Unit: g CO₂e / kWh.
   *  Default: 500 (IEA global average, 2023). */
  defaultCarbonIntensity: GramsCO2ePerKilowattHour;

  /** Embodied carbon for a single high-end datacenter GPU.
   *  Unit: kg CO₂e.
   *  Default: 1_600 (Li et al., 2023). */
  embodiedCarbonPerGpu: KilogramsCO2e;

  /** Assumed operational lifetime of a GPU.
   *  Unit: hours.
   *  Default: 43_800 (5 years × 24 h/day × 365 days). */
  gpuLifetimeHours: Hours;
}

/**
 * Model-profiling defaults used when explicit data is unavailable.
 */
export interface ModelDefaultsConfig {
  defaultParameters: number;
  defaultFlopsPerToken: number;
  defaultPowerWatts: number;
  defaultArchitectureEfficiencyFactor: ArchitectureEfficiencyFactor;
}

/**
 * Infrastructure-level defaults (racks, servers, network, storage).
 */
export interface InfrastructureDefaultsConfig {
  embodiedCarbon: {
    rack: number;
    server: number;
    network: number;
    storage: number;
    gpu: number;
  };
  lifespanYears: {
    rack: number;
    server: number;
    network: number;
    storage: number;
    gpu: number;
  };
  defaultPue: number;
  defaultCoolingEfficiency: number;

  /**
   * Refurbished hardware embodied-carbon discount factor.
   * 1.0 = same as new. 0.5 = half the embodied carbon.
   * Literature range: 0.4–0.7 (Keeble et al. 2023, Circular Computing).
   */
  refurbishedEmbodiedFactor: number;
}

/**
 * Complete calculator configuration.
 */
export interface CalculatorConfig {
  carbon: CarbonConfig;
  modelDefaults: ModelDefaultsConfig;
  infrastructureDefaults: InfrastructureDefaultsConfig;
  usageCurve: UsageCurveConfig;
}

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

/**
 * Typical 24-hour demand curve for a European GPU-cloud:
 *   – Night batch jobs from 02–06 (moderate)
 *   – Morning ramp-up 08–12 (high)
 *   – Peak afternoon 13–18 (very high)
 *   – Evening tail-off 19–22 (moderate)
 *   – Late night 23–01 (low / batch window)
 */
const DEFAULT_HOURLY_WEIGHTS = [
  0.15, 0.10, 0.10, 0.10, 0.12, 0.15, // 00–05: low / batch window
  0.25, 0.45, 0.70, 0.85, 0.90, 0.95, // 06–11: morning ramp
  1.00, 1.00, 1.00, 1.00, 0.95, 0.90, // 12–17: peak
  0.80, 0.70, 0.60, 0.50, 0.35, 0.20, // 18–23: evening tail
];

/**
 * Typical weekday pattern: business-days higher than weekends.
 */
const DEFAULT_WEEKDAY_WEIGHTS = [
  0.85, // Monday
  0.90, // Tuesday
  0.95, // Wednesday
  0.90, // Thursday
  0.85, // Friday
  0.40, // Saturday (batch jobs only)
  0.35, // Sunday (batch jobs only)
];

export const DEFAULT_CONFIG: CalculatorConfig = {
  carbon: {
    defaultCarbonIntensity: gramsCO2ePerKilowattHour(500),
    embodiedCarbonPerGpu: kilogramsCO2e(1_600),
    gpuLifetimeHours: hours(43_800),
  },

  modelDefaults: {
    defaultParameters: 7_000_000_000,
    defaultFlopsPerToken: 14_000_000_000,
    defaultPowerWatts: 250,
    defaultArchitectureEfficiencyFactor: architectureEfficiencyFactor(0.75),
  },

  infrastructureDefaults: {
    embodiedCarbon: {
      rack: 2_000,
      server: 1_500,
      network: 200,
      storage: 300,
      gpu: 1_600,
    },
    lifespanYears: {
      rack: 20,
      server: 5,
      network: 7,
      storage: 5,
      gpu: 5,
    },
    defaultPue: 1.5,
    defaultCoolingEfficiency: 0.8,
    refurbishedEmbodiedFactor: 0.55,
  },

  usageCurve: {
    hourlyWeights: DEFAULT_HOURLY_WEIGHTS,
    weekdayWeights: DEFAULT_WEEKDAY_WEIGHTS,
    lowPeriodThreshold: 0.2,
    lowPeriodCIFactor: 0.7,
    highPeriodCIFactor: 1.15,
    lowPeriodIdleShare: 0.25,
    highPeriodIdleShare: 0.75,
  },
};

// ---------------------------------------------------------------------------
// Merging / overriding helpers
// ---------------------------------------------------------------------------

export function mergeConfig(
  overrides?: Partial<CalculatorConfig>,
  base: CalculatorConfig = DEFAULT_CONFIG,
): CalculatorConfig {
  if (!overrides) return base;

  return {
    carbon: { ...base.carbon, ...overrides.carbon },
    modelDefaults: { ...base.modelDefaults, ...overrides.modelDefaults },
    infrastructureDefaults: {
      ...base.infrastructureDefaults,
      ...overrides.infrastructureDefaults,
    },
    usageCurve: { ...base.usageCurve, ...overrides.usageCurve },
  };
}

let _activeConfig: CalculatorConfig = DEFAULT_CONFIG;

export function setCalculatorConfig(
  config: Partial<CalculatorConfig>,
): void {
  _activeConfig = mergeConfig(config, _activeConfig);
}

export function resetCalculatorConfig(): void {
  _activeConfig = DEFAULT_CONFIG;
}

export function getCalculatorConfig(): CalculatorConfig {
  return _activeConfig;
}
