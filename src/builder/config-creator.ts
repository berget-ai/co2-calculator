/**
 * ConfigCreator assembles machine configs, model configs, usage patterns,
 * and region data into a complete `CalculatorConfig` that the library
 * can consume.
 */

import type { ComputeInfrastructure, CO2EstimationWithInfrastructure } from "../infrastructure-types";
import type { CalculatorConfig, UsageCurveConfig } from "../config";
import type { CO2EstimationResult } from "../domain-types";
import { calculateInfrastructureCO2 } from "../infrastructure-calculator";
import { estimateCO2FromTokens } from "../calculator";
import {
  gramsCO2ePerKilowattHour,
  kilogramsCO2e,
  hours,
  architectureEfficiencyFactor,
} from "../units";

export interface ConfigCreatorOptions {
  /** Grid carbon intensity in g CO₂/kWh. */
  carbonIntensity?: number;
  /** Region identifier for reporting. */
  region?: string;
  /** Renewable energy percentage (0–100). */
  renewablePercentage?: number;
  /** Cloud provider, if applicable. */
  cloudProvider?: "aws" | "gcp" | "azure" | "other";
}

import { GPU, Server, NetworkSwitch, Storage } from "./machines";
import type { HardwareComponent } from "../infrastructure-types";
import type { ModelConfig } from "./models";
import type { UsagePattern } from "./usage";

type MachineBuilder = GPU | Server | NetworkSwitch | Storage;

export class ConfigCreator {
  constructor(
    private machines: MachineBuilder[],
    private model: ModelConfig,
    private usage: UsagePattern,
    private options: ConfigCreatorOptions = {},
  ) {}

  /** Convert the fluent builders into a CalculatorConfig. */
  build(): { infrastructure: ComputeInfrastructure; config: CalculatorConfig } {
    const gpus: ComputeInfrastructure["gpus"] = [];
    const servers: HardwareComponent[] = [];
    const network: (HardwareComponent & { tier: string })[] = [];
    const storage: HardwareComponent[] = [];

    for (const m of this.machines) {
      if (m instanceof GPU) {
        gpus.push(m.build());
      } else if (m instanceof Server) {
        servers.push(m.build());
      } else if (m instanceof NetworkSwitch) {
        network.push(m.build());
      } else if (m instanceof Storage) {
        storage.push(m.build());
      }
    }

    const infrastructure: ComputeInfrastructure = {
      deploymentType: "cloud",
      cloudProvider: this.options.cloudProvider ?? "aws",
      region: this.options.region ?? "eu-north-1",
      carbonIntensityGCO2PerKWh: this.options.carbonIntensity ?? 200,
      renewableEnergyPercentage: this.options.renewablePercentage ?? 95,
      gpus,
      servers,
      network: network as any,
      storage,
      datacenterOverhead: {
        coolingEfficiency: 0.9,
        pue: 1.2,
      },
    };

    const config: CalculatorConfig = {
      carbon: {
        defaultCarbonIntensity: gramsCO2ePerKilowattHour(this.options.carbonIntensity ?? 200),
        embodiedCarbonPerGpu: kilogramsCO2e(1600),
        gpuLifetimeHours: hours(43800),
      },
      modelDefaults: {
        defaultParameters: this.model.parameters,
        defaultFlopsPerToken: this.model.parameters * 2,
        defaultPowerWatts: 250,
        defaultArchitectureEfficiencyFactor: architectureEfficiencyFactor(0.75),
      },
      infrastructureDefaults: {
        embodiedCarbon: {
          rack: 2000,
          server: 1500,
          network: 200,
          storage: 300,
          gpu: 1600,
        },
        lifespanYears: {
          rack: 20,
          server: 5,
          network: 7,
          storage: 5,
          gpu: 5,
        },
        defaultPue: 1.2,
        defaultCoolingEfficiency: 0.9,
        refurbishedEmbodiedFactor: 0.55,
      },
      usageCurve: {
        hourlyWeights: this.usage.hourlyWeights,
        weekdayWeights: this.usage.weekdayWeights,
        lowPeriodThreshold: this.usage.lowPeriodThreshold,
        lowPeriodCIFactor: this.usage.lowPeriodCIFactor,
        highPeriodCIFactor: this.usage.highPeriodCIFactor,
        lowPeriodIdleShare: 0.25,
        highPeriodIdleShare: 0.75,
      } as UsageCurveConfig,
    };

    return { infrastructure, config };
  }

  /** Convenience: run the full infrastructure calculation in one call. */
  estimateCO2(params: {
    tokenCount: number;
    hourOfDay?: number;
    expectedLifetimeInferences?: number;
  }): CO2EstimationResult {
    const { infrastructure, config } = this.build();

    const infraParams: CO2EstimationWithInfrastructure = {
      tokenCount: params.tokenCount,
      infrastructure,
      includeOperationalCarbon: true,
      includeEmbodiedCarbon: true,
      includeDatacenterOverhead: true,
      allocationMethod: "proportional",
      config,
    };

    const infraResult = calculateInfrastructureCO2(infraParams);

    // Also run the simple token estimate for comparison
    const tokenResult = estimateCO2FromTokens(
      params.tokenCount,
      this.model.modelId,
      undefined,
      config,
      {
        hourOfDay: params.hourOfDay,
        expectedLifetimeInferences: params.expectedLifetimeInferences,
      },
    );

    // Merge: use infrastructure total, add training from token estimate
    return {
      ...infraResult,
      co2Grams: infraResult.co2Grams + tokenResult.details.trainingCarbon,
      co2PerToken:
        (infraResult.co2Grams + tokenResult.details.trainingCarbon) /
        params.tokenCount,
      details: {
        ...infraResult.details,
        trainingCarbon: tokenResult.details.trainingCarbon,
        totalCarbon:
          infraResult.details.totalCarbon + tokenResult.details.trainingCarbon,
      },
      timing: tokenResult.timing,
    };
  }
}

// Re-export builders so consumers can do:
//   import { a100, generic1U, NetworkSwitch, ModelConfig } from "./builder";
export { GPU, Server, NetworkSwitch, Storage } from "./machines";
export { ModelConfig } from "./models";
export { UsagePattern } from "./usage";
