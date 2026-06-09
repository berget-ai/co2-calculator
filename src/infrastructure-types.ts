import type { CO2EstimationParams, CO2EstimationResult } from "./domain-types";

type HardwareType = "rack" | "server" | "network" | "storage" | "gpu";

type HardwareCondition = "new" | "refurbished" | "existing";

type DeploymentType = "cloud" | "on-premise" | "hybrid" | "third-party";

type NetworkTier = "edge" | "core" | "datacenter";

export interface HardwareComponent {
  type: HardwareType;
  condition: HardwareCondition;
  ageYears?: number;
  manufacturer?: string;
  model?: string;
  powerRatingWatts: number;
  utilizationRate: number;
  operationalHoursPerDay: number;
  embodiedCarbonKgCO2e?: number;
  lifespanYears?: number;
}

export interface GPUNode {
  id: string;
  manufacturer: string;
  model: string;
  count: number;
  powerRatingWattsPerGPU: number;
  utilizationRate: number;
  operationalHoursPerDay: number;
  condition: HardwareCondition;
  ageYears?: number;
  embodiedCarbonKgCO2e?: number;
  shared?: {
    totalGPUs: number;
    allocatedGPUs: number;
    sharedWith?: string[];
  };
}

export interface ComputeInfrastructure {
  deploymentType: DeploymentType;
  cloudProvider?: "aws" | "gcp" | "azure" | "other";
  region?: string;
  carbonIntensityGCO2PerKWh: number;
  renewableEnergyPercentage: number;

  racks?: HardwareComponent[];
  servers?: HardwareComponent[];
  network?: (HardwareComponent & { tier: NetworkTier })[];
  storage?: HardwareComponent[];
  gpus: GPUNode[];

  datacenterOverhead?: {
    coolingEfficiency: number;
    pue: number;
    lightingPowerKW?: number;
    otherInfrastructurePowerKW?: number;
  };

  sharedResources?: {
    cpuCores: number;
    allocatedCores: number;
    memoryGB: number;
    allocatedMemoryGB: number;
  };
}

export interface CO2EstimationWithInfrastructure extends CO2EstimationParams {
  infrastructure: ComputeInfrastructure;
  includeOperationalCarbon: boolean;
  includeEmbodiedCarbon: boolean;
  includeDatacenterOverhead: boolean;
  allocationMethod: "direct" | "proportional" | "time-based";
}

export interface InfrastructureCO2Result extends CO2EstimationResult {
  infrastructure: {
    gpu: {
      operational: number;
      embodied: number;
      total: number;
    };
    servers: {
      operational: number;
      embodied: number;
      total: number;
    };
    network: {
      operational: number;
      embodied: number;
      total: number;
    };
    storage: {
      operational: number;
      embodied: number;
      total: number;
    };
    datacenter: {
      operational: number;
      embodied: number;
      total: number;
    };
    total: {
      operational: number;
      embodied: number;
      total: number;
    };
  };
  allocation: {
    method: string;
    gpuAllocation: number;
    cpuAllocation: number;
    memoryAllocation: number;
    timeAllocation: number;
  };
}
