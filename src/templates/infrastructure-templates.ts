import type {
  ComputeInfrastructure,
  CO2EstimationWithInfrastructure,
} from "../infrastructure-types";

export const infrastructureTemplates = {
  awsCloud: {
    deploymentType: "cloud" as const,
    cloudProvider: "aws" as const,
    region: "eu-north-1",
    carbonIntensityGCO2PerKWh: 200,
    renewableEnergyPercentage: 95,
    gpus: [
      {
        id: "aws-p4d-24xlarge",
        manufacturer: "NVIDIA",
        model: "A100",
        count: 8,
        powerRatingWattsPerGPU: 400,
        utilizationRate: 0.85,
        operationalHoursPerDay: 24,
        condition: "new" as const,
        embodiedCarbonKgCO2e: 1600,
      },
    ],
    datacenterOverhead: {
      coolingEfficiency: 0.9,
      pue: 1.2,
      lightingPowerKW: 0.05,
      otherInfrastructurePowerKW: 0.1,
    },
    sharedResources: {
      cpuCores: 96,
      allocatedCores: 48,
      memoryGB: 1152,
      allocatedMemoryGB: 512,
    },
  },

  googleCloud: {
    deploymentType: "cloud" as const,
    cloudProvider: "gcp" as const,
    region: "europe-west4",
    carbonIntensityGCO2PerKWh: 150,
    renewableEnergyPercentage: 98,
    gpus: [
      {
        id: "gcp-a2-highgpu-1g",
        manufacturer: "NVIDIA",
        model: "A100",
        count: 1,
        powerRatingWattsPerGPU: 400,
        utilizationRate: 0.8,
        operationalHoursPerDay: 24,
        condition: "new" as const,
        embodiedCarbonKgCO2e: 1600,
      },
    ],
    datacenterOverhead: {
      coolingEfficiency: 0.92,
      pue: 1.1,
    },
  },

  onPremiseSmall: {
    deploymentType: "on-premise" as const,
    carbonIntensityGCO2PerKWh: 450,
    renewableEnergyPercentage: 15,
    racks: [
      {
        type: "rack" as const,
        condition: "existing" as const,
        ageYears: 3,
        powerRatingWatts: 200,
        utilizationRate: 0.8,
        operationalHoursPerDay: 24,
      },
    ],
    servers: [
      {
        type: "server" as const,
        condition: "existing" as const,
        ageYears: 2,
        manufacturer: "Dell",
        model: "PowerEdge R750",
        powerRatingWatts: 800,
        utilizationRate: 0.7,
        operationalHoursPerDay: 24,
        embodiedCarbonKgCO2e: 1500,
      },
    ],
    network: [
      {
        type: "network" as const,
        condition: "existing" as const,
        ageYears: 4,
        tier: "core" as const,
        powerRatingWatts: 50,
        utilizationRate: 0.9,
        operationalHoursPerDay: 24,
      },
      {
        type: "network" as const,
        condition: "new" as const,
        ageYears: 0,
        tier: "edge" as const,
        powerRatingWatts: 20,
        utilizationRate: 0.6,
        operationalHoursPerDay: 24,
      },
    ],
    storage: [
      {
        type: "storage" as const,
        condition: "existing" as const,
        ageYears: 2,
        powerRatingWatts: 30,
        utilizationRate: 0.5,
        operationalHoursPerDay: 24,
      },
    ],
    gpus: [
      {
        id: "on-prem-gpu-1",
        manufacturer: "NVIDIA",
        model: "RTX 3090",
        count: 2,
        powerRatingWattsPerGPU: 350,
        utilizationRate: 0.75,
        operationalHoursPerDay: 12,
        condition: "existing" as const,
        ageYears: 1,
        embodiedCarbonKgCO2e: 1200,
      },
    ],
    datacenterOverhead: {
      coolingEfficiency: 0.7,
      pue: 1.8,
      lightingPowerKW: 0.5,
      otherInfrastructurePowerKW: 0.3,
    },
  },

  hybridSetup: {
    deploymentType: "hybrid" as const,
    cloudProvider: "aws" as const,
    region: "eu-central-1",
    carbonIntensityGCO2PerKWh: 350,
    renewableEnergyPercentage: 60,
    gpus: [
      {
        id: "hybrid-cloud-gpu",
        manufacturer: "NVIDIA",
        model: "A100",
        count: 4,
        powerRatingWattsPerGPU: 400,
        utilizationRate: 0.9,
        operationalHoursPerDay: 24,
        condition: "new" as const,
        embodiedCarbonKgCO2e: 1600,
        shared: {
          totalGPUs: 8,
          allocatedGPUs: 4,
          sharedWith: ["team-a", "team-b"],
        },
      },
    ],
    servers: [
      {
        type: "server" as const,
        condition: "refurbished" as const,
        ageYears: 4,
        manufacturer: "Dell",
        model: "PowerEdge R740",
        powerRatingWatts: 600,
        utilizationRate: 0.85,
        operationalHoursPerDay: 18,
        embodiedCarbonKgCO2e: 1200,
      },
    ],
    network: [
      {
        type: "network" as const,
        condition: "new" as const,
        ageYears: 0,
        tier: "core" as const,
        powerRatingWatts: 100,
        utilizationRate: 0.95,
        operationalHoursPerDay: 24,
      },
    ],
    datacenterOverhead: {
      coolingEfficiency: 0.8,
      pue: 1.4,
    },
    sharedResources: {
      cpuCores: 128,
      allocatedCores: 64,
      memoryGB: 1024,
      allocatedMemoryGB: 512,
    },
  },

  thirdPartyProvider: {
    deploymentType: "third-party" as const,
    carbonIntensityGCO2PerKWh: 300,
    renewableEnergyPercentage: 40,
    gpus: [
      {
        id: "provider-gpu-cluster",
        manufacturer: "NVIDIA",
        model: "V100",
        count: 16,
        powerRatingWattsPerGPU: 300,
        utilizationRate: 0.7,
        operationalHoursPerDay: 20,
        condition: "existing" as const,
        ageYears: 2,
        embodiedCarbonKgCO2e: 1400,
        shared: {
          totalGPUs: 32,
          allocatedGPUs: 16,
          sharedWith: ["multiple-clients"],
        },
      },
    ],
    datacenterOverhead: {
      coolingEfficiency: 0.75,
      pue: 1.6,
    },
    sharedResources: {
      cpuCores: 512,
      allocatedCores: 128,
      memoryGB: 4096,
      allocatedMemoryGB: 1024,
    },
  },
};

export function createInfrastructureConfig(
  template: keyof typeof infrastructureTemplates,
  overrides?: Partial<ComputeInfrastructure>,
): ComputeInfrastructure {
  const base = infrastructureTemplates[template];
  return { ...base, ...overrides };
}

export function createEstimationParams(
  tokenCount: number,
  infrastructure: ComputeInfrastructure,
  overrides?: Partial<CO2EstimationWithInfrastructure>,
): CO2EstimationWithInfrastructure {
  return {
    tokenCount,
    infrastructure,
    includeOperationalCarbon: true,
    includeEmbodiedCarbon: true,
    includeDatacenterOverhead: true,
    allocationMethod: "proportional",
    ...overrides,
  };
}
