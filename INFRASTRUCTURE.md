# Infrastructure-Based CO2 Estimation

This library provides advanced infrastructure-aware CO₂ estimation capabilities that allow you to model your entire compute environment and calculate emissions based on actual hardware configuration.

## Overview

The infrastructure-based estimation goes beyond simple token-based calculations by modeling:

- **Hardware Components**: Racks, servers, network equipment, storage, and GPUs
- **Deployment Types**: Cloud, on-premise, hybrid, and third-party providers
- **Hardware Conditions**: New, refurbished, or existing equipment
- **Operational Parameters**: Utilization rates, operational hours, power consumption
- **Datacenter Overhead**: PUE, cooling efficiency, lighting, and infrastructure power
- **Resource Allocation**: Shared resources, GPU allocation, CPU/memory allocation

## Quick Start

### Using Pre-built Templates

```typescript
import {
  calculateInfrastructureCO2,
  createInfrastructureConfig,
  createEstimationParams,
} from "@berget/co2-emissions-calculator";

// Use a pre-built template
const awsConfig = createInfrastructureConfig("awsCloud", {
  carbonIntensityGCO2PerKWh: 180,
});

const params = createEstimationParams(1000, awsConfig, {
  allocationMethod: "proportional",
});

const result = calculateInfrastructureCO2(params);

console.log(`Total CO2: ${result.co2Grams} grams`);
console.log(`GPU emissions: ${result.infrastructure.gpu.total} grams`);
console.log(
  `Datacenter emissions: ${result.infrastructure.datacenter.total} grams`,
);
```

### Custom Infrastructure Configuration

```typescript
const customConfig = {
  deploymentType: "on-premise",
  carbonIntensityGCO2PerKWh: 250,
  renewableEnergyPercentage: 80,

  gpus: [
    {
      id: "gpu-1",
      manufacturer: "NVIDIA",
      model: "RTX 4090",
      count: 4,
      powerRatingWattsPerGPU: 450,
      utilizationRate: 0.85,
      operationalHoursPerDay: 16,
      condition: "new",
      embodiedCarbonKgCO2e: 1800,
    },
  ],

  servers: [
    {
      type: "server",
      condition: "refurbished",
      ageYears: 3,
      manufacturer: "HP",
      model: "ProLiant DL380",
      powerRatingWatts: 700,
      utilizationRate: 0.8,
      operationalHoursPerDay: 24,
      embodiedCarbonKgCO2e: 1300,
    },
  ],

  datacenterOverhead: {
    coolingEfficiency: 0.88,
    pue: 1.25,
  },
};

const params = createEstimationParams(1000, customConfig);
const result = calculateInfrastructureCO2(params);
```

## Infrastructure Configuration

### Complete Configuration Structure

```typescript
interface ComputeInfrastructure {
  // Deployment
  deploymentType: "cloud" | "on-premise" | "hybrid" | "third-party";
  cloudProvider?: "aws" | "gcp" | "azure" | "other";
  region?: string;

  // Carbon Intensity
  carbonIntensityGCO2PerKWh: number; // g CO2 per kWh
  renewableEnergyPercentage: number; // 0-100

  // Hardware Components
  racks?: HardwareComponent[];
  servers?: HardwareComponent[];
  network?: (HardwareComponent & { tier: NetworkTier })[];
  storage?: HardwareComponent[];
  gpus: GPUNode[]; // Required

  // Datacenter Overhead
  datacenterOverhead?: {
    coolingEfficiency: number; // 0-1
    pue: number; // Power Usage Effectiveness
    lightingPowerKW?: number;
    otherInfrastructurePowerKW?: number;
  };

  // Shared Resources
  sharedResources?: {
    cpuCores: number;
    allocatedCores: number;
    memoryGB: number;
    allocatedMemoryGB: number;
  };
}
```

### GPU Configuration

```typescript
interface GPUNode {
  id: string;
  manufacturer: string; // e.g., 'NVIDIA', 'AMD'
  model: string; // e.g., 'A100', 'RTX 4090'
  count: number; // Number of GPUs
  powerRatingWattsPerGPU: number; // Power consumption per GPU
  utilizationRate: number; // 0-1, average utilization
  operationalHoursPerDay: number; // Hours GPU is running per day
  condition: "new" | "refurbished" | "existing";
  ageYears?: number; // Age of hardware
  embodiedCarbonKgCO2e?: number; // Manufacturing emissions

  // For shared GPU clusters
  shared?: {
    totalGPUs: number;
    allocatedGPUs: number;
    sharedWith?: string[];
  };
}
```

### Hardware Component Configuration

```typescript
interface HardwareComponent {
  type: "rack" | "server" | "network" | "storage";
  condition: "new" | "refurbished" | "existing";
  ageYears?: number;
  manufacturer?: string;
  model?: string;
  powerRatingWatts: number;
  utilizationRate: number; // 0-1
  operationalHoursPerDay: number;
  embodiedCarbonKgCO2e?: number;
  lifespanYears?: number;
}
```

## Pre-built Templates

The library includes several pre-configured infrastructure templates:

### 1. AWS Cloud (`awsCloud`)

```typescript
{
  deploymentType: 'cloud',
  cloudProvider: 'aws',
  region: 'eu-north-1',
  carbonIntensityGCO2PerKWh: 200,
  renewableEnergyPercentage: 95,
  gpus: [{ model: 'A100', count: 8, ... }],
  datacenterOverhead: { pue: 1.2, ... },
}
```

### 2. Google Cloud (`googleCloud`)

```typescript
{
  deploymentType: 'cloud',
  cloudProvider: 'gcp',
  region: 'europe-west4',
  carbonIntensityGCO2PerKWh: 150,
  renewableEnergyPercentage: 98,
  gpus: [{ model: 'A100', count: 1, ... }],
}
```

### 3. Small On-Premise (`onPremiseSmall`)

```typescript
{
  deploymentType: 'on-premise',
  carbonIntensityGCO2PerKWh: 450,
  renewableEnergyPercentage: 15,
  racks: [...],
  servers: [...],
  network: [...],
  storage: [...],
  gpus: [{ model: 'RTX 3090', count: 2, ... }],
  datacenterOverhead: { pue: 1.8, ... },
}
```

### 4. Hybrid Setup (`hybridSetup`)

```typescript
{
  deploymentType: 'hybrid',
  cloudProvider: 'aws',
  carbonIntensityGCO2PerKWh: 350,
  renewableEnergyPercentage: 60,
  gpus: [{ model: 'A100', count: 4, shared: { ... } }],
  servers: [...],
  network: [...],
  sharedResources: { ... },
}
```

### 5. Third-Party Provider (`thirdPartyProvider`)

```typescript
{
  deploymentType: 'third-party',
  carbonIntensityGCO2PerKWh: 300,
  renewableEnergyPercentage: 40,
  gpus: [{ model: 'V100', count: 16, shared: { ... } }],
  datacenterOverhead: { pue: 1.6, ... },
}
```

## Allocation Methods

The library supports three allocation methods for calculating your share of emissions:

### 1. Direct Allocation

Calculates emissions based on the exact resources you're using:

```typescript
const params = createEstimationParams(1000, config, {
  allocationMethod: "direct",
});
```

Best for: Dedicated resources, full ownership

### 2. Proportional Allocation

Calculates emissions based on the proportion of resources you're using:

```typescript
const params = createEstimationParams(1000, config, {
  allocationMethod: "proportional",
});
```

Best for: Shared environments, cloud instances, multi-tenant systems

### 3. Time-Based Allocation

Calculates emissions based on the time you're using the resources:

```typescript
const params = createEstimationParams(1000, config, {
  allocationMethod: "time-based",
});
```

Best for: Spot instances, on-demand usage, variable workloads

## Estimation Options

You can control what components are included in the calculation:

```typescript
const params = createEstimationParams(1000, config, {
  includeOperationalCarbon: true, // Include energy consumption emissions
  includeEmbodiedCarbon: true, // Include hardware manufacturing emissions
  includeDatacenterOverhead: true, // Include cooling and infrastructure overhead
  allocationMethod: "proportional",
});
```

## Result Structure

The estimation result provides detailed breakdowns:

```typescript
{
  co2Grams: number              // Total CO2 emissions in grams
  co2PerToken: number           // CO2 per token in grams
  method: string                // Estimation method
  details: {
    operationalCarbon: number   // Operational emissions
    embodiedCarbon: number      // Embodied emissions
    totalCarbon: number         // Total emissions
  },
  infrastructure: {
    gpu: {
      operational: number       // GPU operational emissions
      embodied: number          // GPU embodied emissions
      total: number             // Total GPU emissions
    },
    servers: { ... },
    network: { ... },
    storage: { ... },
    datacenter: { ... },
    total: { ... }
  },
  allocation: {
    method: string,
    gpuAllocation: number,
    cpuAllocation: number,
    memoryAllocation: number,
    timeAllocation: number
  }
}
```

## Examples

### Example 1: Compare Different Infrastructures

```typescript
const infrastructures = [
  "awsCloud",
  "googleCloud",
  "onPremiseSmall",
  "hybridSetup",
];

for (const infra of infrastructures) {
  const config = createInfrastructureConfig(infra);
  const params = createEstimationParams(1000, config);
  const result = calculateInfrastructureCO2(params);

  console.log(`${infra}: ${result.co2Grams.toFixed(4)} g CO2`);
}
```

### Example 2: Custom Configuration with Overrides

```typescript
const config = createInfrastructureConfig("awsCloud", {
  carbonIntensityGCO2PerKWh: 180,
  gpus: [
    {
      id: "custom-gpu",
      manufacturer: "NVIDIA",
      model: "H100",
      count: 8,
      powerRatingWattsPerGPU: 700,
      utilizationRate: 0.9,
      operationalHoursPerDay: 20,
      condition: "new",
      embodiedCarbonKgCO2e: 2000,
    },
  ],
});

const params = createEstimationParams(1000, config);
const result = calculateInfrastructureCO2(params);
```

### Example 3: Analyze Different Allocation Methods

```typescript
const config = createInfrastructureConfig("hybridSetup");
const methods = ["direct", "proportional", "time-based"];

for (const method of methods) {
  const params = createEstimationParams(1000, config, {
    allocationMethod: method,
  });
  const result = calculateInfrastructureCO2(params);

  console.log(`${method}: ${result.co2Grams} g CO2`);
  console.log(`  GPU allocation: ${result.allocation.gpuAllocation}`);
}
```

## Best Practices

### 1. Use Accurate Carbon Intensity Values

Get real-time carbon intensity from:

- **ElectricityMap**: https://www.electricitymap.org
- **Carbon Intensity API**: Regional carbon intensity data
- **Cloud Provider Reports**: AWS, GCP, Azure sustainability reports

### 2. Consider Hardware Condition

- **New**: Full embodied carbon over expected lifespan
- **Refurbished**: Reduced embodied carbon (typically 20-40% less)
- **Existing**: Amortized embodied carbon based on remaining lifespan

### 3. Model Datacenter Overhead Accurately

- **PUE**: Typical values range from 1.1 (efficient cloud) to 1.8 (legacy on-premise)
- **Cooling Efficiency**: 0.7-0.95 depending on cooling technology
- **Other Infrastructure**: Lighting, security, and other facility systems

### 4. Choose Appropriate Allocation Method

- **Direct**: For dedicated resources you fully control
- **Proportional**: For shared environments with clear resource allocation
- **Time-Based**: For variable usage patterns and spot instances

### 5. Include All Relevant Components

Don't forget to include:

- Network equipment (switches, routers)
- Storage systems (SSDs, HDDs)
- Racks and infrastructure
- Datacenter overhead (cooling, lighting)

## Advanced Configuration

### Multi-Region Deployment

```typescript
const config = {
  deploymentType: "cloud",
  cloudProvider: "aws",
  carbonIntensityGCO2PerKWh: 200,
  gpus: [
    {
      id: "region-1",
      manufacturer: "NVIDIA",
      model: "A100",
      count: 4,
      powerRatingWattsPerGPU: 400,
      utilizationRate: 0.85,
      operationalHoursPerDay: 24,
      condition: "new",
    },
    {
      id: "region-2",
      manufacturer: "NVIDIA",
      model: "A100",
      count: 4,
      powerRatingWattsPerGPU: 400,
      utilizationRate: 0.85,
      operationalHoursPerDay: 24,
      condition: "new",
    },
  ],
};
```

### Hybrid Cloud with Shared Resources

```typescript
const config = {
  deploymentType: "hybrid",
  carbonIntensityGCO2PerKWh: 300,
  gpus: [
    {
      id: "cloud-gpu",
      manufacturer: "NVIDIA",
      model: "A100",
      count: 8,
      powerRatingWattsPerGPU: 400,
      utilizationRate: 0.9,
      operationalHoursPerDay: 24,
      condition: "new",
      shared: {
        totalGPUs: 16,
        allocatedGPUs: 8,
        sharedWith: ["team-a", "team-b"],
      },
    },
  ],
  sharedResources: {
    cpuCores: 128,
    allocatedCores: 64,
    memoryGB: 1024,
    allocatedMemoryGB: 512,
  },
};
```

## API Reference

### `createInfrastructureConfig(template, overrides?)`

Creates an infrastructure configuration from a template with optional overrides.

### `createEstimationParams(tokenCount, infrastructure, options?)`

Creates estimation parameters for infrastructure-based calculation.

### `calculateInfrastructureCO2(params)`

Calculates CO₂ emissions based on infrastructure configuration.

## See Also

- [Basic Usage Examples](../examples/basic-usage.ts)
- [Infrastructure Examples](../examples/infrastructure-usage.ts)
- [Methodology Documentation](./METHODOLOGY.md)
- [Main README](./README.md)

---

For more information, see the [full documentation](https://github.com/berget-ai/co2-emissions-calculator).
