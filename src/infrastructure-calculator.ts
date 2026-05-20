/**
 * Infrastructure-aware CO₂ emissions calculator.
 *
 * Models entire compute environments (GPUs, servers, network, storage,
 * datacenter overhead) and allocates embodied + operational carbon
 * using configurable strategies.
 */

import {
  kilowattHours,
  gramsCO2e,
  gramsCO2ePerKilowattHour,
  type KilowattHours,
  type GramsCO2e,
  type GramsCO2ePerKilowattHour,
} from "./units";
import {
  getCalculatorConfig,
  mergeConfig,
  type CalculatorConfig,
} from "./config";
import type {
  ComputeInfrastructure,
  CO2EstimationWithInfrastructure,
  InfrastructureCO2Result,
} from "./infrastructure-types";

/**
 * Calculate infrastructure-based CO₂ emissions.
 *
 * @param params Estimation parameters with infrastructure config
 * @returns Detailed CO₂ result with per-component breakdown
 */
export function calculateInfrastructureCO2(
  params: CO2EstimationWithInfrastructure,
): InfrastructureCO2Result {
  const {
    infrastructure,
    includeOperationalCarbon,
    includeEmbodiedCarbon,
    includeDatacenterOverhead,
    allocationMethod,
  } = params;

  // Resolve configuration (global + any per-call overrides)
  const cfg = params.config
    ? mergeConfig(params.config, getCalculatorConfig())
    : getCalculatorConfig();

  const results = {
    gpu: { operational: 0, embodied: 0, total: 0 },
    servers: { operational: 0, embodied: 0, total: 0 },
    network: { operational: 0, embodied: 0, total: 0 },
    storage: { operational: 0, embodied: 0, total: 0 },
    datacenter: { operational: 0, embodied: 0, total: 0 },
    total: { operational: 0, embodied: 0, total: 0 },
  };

  const allocation = calculateAllocation(infrastructure, allocationMethod);

  // --- Operational carbon ---
  if (includeOperationalCarbon) {
    results.gpu.operational = calculateGPUOperationalCarbon(
      infrastructure.gpus,
      infrastructure.carbonIntensityGCO2PerKWh,
      allocation,
    );
    results.servers.operational = calculateComponentOperationalCarbon(
      infrastructure.servers || [],
      infrastructure.carbonIntensityGCO2PerKWh,
      allocation,
    );
    results.network.operational = calculateComponentOperationalCarbon(
      infrastructure.network || [],
      infrastructure.carbonIntensityGCO2PerKWh,
      allocation,
    );
    results.storage.operational = calculateComponentOperationalCarbon(
      infrastructure.storage || [],
      infrastructure.carbonIntensityGCO2PerKWh,
      allocation,
    );
  }

  // --- Embodied carbon ---
  if (includeEmbodiedCarbon) {
    results.gpu.embodied = calculateGPUEmbodiedCarbon(
      infrastructure.gpus,
      allocation,
      cfg,
    );
    results.servers.embodied = calculateComponentEmbodiedCarbon(
      infrastructure.servers || [],
      allocation,
      cfg,
    );
    results.network.embodied = calculateComponentEmbodiedCarbon(
      infrastructure.network || [],
      allocation,
      cfg,
    );
    results.storage.embodied = calculateComponentEmbodiedCarbon(
      infrastructure.storage || [],
      allocation,
      cfg,
    );
  }

  // --- Datacenter overhead ---
  if (includeDatacenterOverhead && infrastructure.datacenterOverhead) {
    const overhead = calculateDatacenterOverhead(
      infrastructure,
      results,
      allocation,
      cfg,
    );
    results.datacenter = overhead;
  }

  // --- Compute totals per component ---
  for (const key of Object.keys(results) as Array<keyof typeof results>) {
    results[key].total = results[key].operational + results[key].embodied;
  }

  // --- Aggregate totals ---
  results.total.operational =
    results.gpu.operational +
    results.servers.operational +
    results.network.operational +
    results.storage.operational +
    results.datacenter.operational;

  results.total.embodied =
    results.gpu.embodied +
    results.servers.embodied +
    results.network.embodied +
    results.storage.embodied +
    results.datacenter.embodied;

  results.total.total = results.total.operational + results.total.embodied;

  return {
    co2Grams: Number(results.total.total),
    co2PerToken: Number(results.total.total / params.tokenCount),
    method: "gpu-energy",
    details: {
      operationalCarbon: Number(results.total.operational),
      embodiedCarbon: Number(results.total.embodied),
      trainingCarbon: 0,
      totalCarbon: Number(results.total.total),
    },
    infrastructure: results,
    allocation,
  };
}

// ---------------------------------------------------------------------------
// Allocation helpers
// ---------------------------------------------------------------------------

function calculateAllocation(
  infrastructure: ComputeInfrastructure,
  method: "direct" | "proportional" | "time-based",
): InfrastructureCO2Result["allocation"] {
  const totalAllocatedGPUs = infrastructure.gpus.reduce((sum, gpu) => {
    if (gpu.shared) {
      return sum + (gpu.count * gpu.shared.allocatedGPUs) / gpu.shared.totalGPUs;
    }
    return sum + gpu.count;
  }, 0);

  const gpuAllocation =
    totalAllocatedGPUs / (infrastructure.gpus.length || 1);

  const cpuAllocation = infrastructure.sharedResources
    ? infrastructure.sharedResources.allocatedCores /
      infrastructure.sharedResources.cpuCores
    : 1.0;

  const memoryAllocation = infrastructure.sharedResources
    ? infrastructure.sharedResources.allocatedMemoryGB /
      infrastructure.sharedResources.memoryGB
    : 1.0;

  const avgOperationalHours =
    infrastructure.gpus.length > 0
      ? infrastructure.gpus.reduce(
          (sum, gpu) => sum + gpu.operationalHoursPerDay,
          0,
        ) / infrastructure.gpus.length
      : 0;

  const timeAllocation = avgOperationalHours / 24;

  return {
    method,
    gpuAllocation,
    cpuAllocation,
    memoryAllocation,
    timeAllocation,
  };
}

// ---------------------------------------------------------------------------
// Operational carbon (energy × intensity)
// ---------------------------------------------------------------------------

function calculateGPUOperationalCarbon(
  gpus: ComputeInfrastructure["gpus"],
  carbonIntensity: number,
  allocation: InfrastructureCO2Result["allocation"],
): number {
  return gpus.reduce((total, gpu) => {
    const count = gpu.shared
      ? (gpu.count * gpu.shared.allocatedGPUs) / gpu.shared.totalGPUs
      : gpu.count;

    const powerKw = (count * gpu.powerRatingWattsPerGPU) / 1_000;
    const dailyHours = gpu.operationalHoursPerDay;
    const dailyEnergyKwh = kilowattHours(powerKw * dailyHours);

    const operationalCarbon = calculateOperationalCarbonFromEnergy(
      dailyEnergyKwh,
      gramsCO2ePerKilowattHour(carbonIntensity),
    );

    const allocationFactor =
      allocation.method === "proportional"
        ? allocation.gpuAllocation
        : allocation.method === "time-based"
          ? allocation.timeAllocation
          : 1.0;

    return total + Number(operationalCarbon) * allocationFactor;
  }, 0);
}

function calculateComponentOperationalCarbon(
  components: Array<{
    powerRatingWatts: number;
    operationalHoursPerDay: number;
    utilizationRate: number;
    type: string;
  }>,
  carbonIntensity: number,
  allocation: InfrastructureCO2Result["allocation"],
): number {
  return components.reduce((total, component) => {
    const powerKw = component.powerRatingWatts / 1_000;
    const dailyHours = component.operationalHoursPerDay;
    const dailyEnergyKwh = kilowattHours(powerKw * dailyHours);

    const operationalCarbon = calculateOperationalCarbonFromEnergy(
      dailyEnergyKwh,
      gramsCO2ePerKilowattHour(carbonIntensity),
    );

    const allocationFactor =
      allocation.method === "time-based" ? allocation.timeAllocation : 1.0;

    return (
      total +
      Number(operationalCarbon) * allocationFactor * component.utilizationRate
    );
  }, 0);
}

function calculateOperationalCarbonFromEnergy(
  energyKwh: KilowattHours,
  carbonIntensity: GramsCO2ePerKilowattHour,
): GramsCO2e {
  return gramsCO2e(energyKwh * carbonIntensity);
}

// ---------------------------------------------------------------------------
// Embodied carbon (amortised over hardware lifetime)
// ---------------------------------------------------------------------------

function calculateGPUEmbodiedCarbon(
  gpus: ComputeInfrastructure["gpus"],
  allocation: InfrastructureCO2Result["allocation"],
  cfg: CalculatorConfig,
): number {
  const defaults = cfg.infrastructureDefaults;
  return gpus.reduce((total, gpu) => {
    const embodiedCarbonKg =
      gpu.embodiedCarbonKgCO2e ?? defaults.embodiedCarbon.gpu;
    const age = gpu.ageYears ?? 0;
    const remainingLifespan = Math.max(
      1,
      defaults.lifespanYears.gpu - age,
    );

    const dailyEmbodiedCarbonKg = embodiedCarbonKg / (remainingLifespan * 365);

    const count = gpu.shared
      ? (gpu.count * gpu.shared.allocatedGPUs) / gpu.shared.totalGPUs
      : gpu.count;

    const allocationFactor =
      allocation.method === "proportional"
        ? allocation.gpuAllocation
        : allocation.method === "time-based"
          ? allocation.timeAllocation
          : 1.0;

    const dailyEmbodiedGrams = dailyEmbodiedCarbonKg * 1_000;
    return total + dailyEmbodiedGrams * count * allocationFactor;
  }, 0);
}

function calculateComponentEmbodiedCarbon(
  components: Array<{
    type: string;
    embodiedCarbonKgCO2e?: number;
    ageYears?: number;
    utilizationRate: number;
  }>,
  allocation: InfrastructureCO2Result["allocation"],
  cfg: CalculatorConfig,
): number {
  const defaults = cfg.infrastructureDefaults;
  return components.reduce((total, component) => {
    const key = component.type as keyof typeof defaults.embodiedCarbon;
    const embodiedCarbonKg =
      component.embodiedCarbonKgCO2e ??
      (defaults.embodiedCarbon[key] || 500);

    const lifespan =
      defaults.lifespanYears[key as keyof typeof defaults.lifespanYears] || 5;
    const age = component.ageYears ?? 0;
    const remainingLifespan = Math.max(1, lifespan - age);

    const dailyEmbodiedCarbonKg = embodiedCarbonKg / (remainingLifespan * 365);

    const allocationFactor =
      allocation.method === "time-based" ? allocation.timeAllocation : 1.0;

    const dailyEmbodiedGrams = dailyEmbodiedCarbonKg * 1_000;
    return total + dailyEmbodiedGrams * allocationFactor * component.utilizationRate;
  }, 0);
}

// ---------------------------------------------------------------------------
// Datacenter overhead
// ---------------------------------------------------------------------------

function calculateDatacenterOverhead(
  infrastructure: ComputeInfrastructure,
  componentResults: {
    gpu: { operational: number; embodied: number };
    servers: { operational: number; embodied: number };
    network: { operational: number; embodied: number };
    storage: { operational: number; embodied: number };
    datacenter: { operational: number; embodied: number };
    total: { operational: number; embodied: number };
  },
  allocation: InfrastructureCO2Result["allocation"],
  cfg: CalculatorConfig,
): { operational: number; embodied: number; total: number } {
  const overhead = infrastructure.datacenterOverhead;

  if (!overhead) {
    return { operational: 0, embodied: 0, total: 0 };
  }

  const defaults = cfg.infrastructureDefaults;
  const pue = overhead.pue ?? defaults.defaultPue;
  const coolingEfficiency = overhead.coolingEfficiency ?? defaults.defaultCoolingEfficiency;

  // Recover daily energy (kWh) from IT operational carbon
  const carbonIntensity =
    infrastructure.carbonIntensityGCO2PerKWh || 500;

  const gpuEnergyKwh =
    componentResults.gpu.operational / carbonIntensity;
  const serverEnergyKwh =
    componentResults.servers.operational / carbonIntensity;
  const networkEnergyKwh =
    componentResults.network.operational / carbonIntensity;
  const storageEnergyKwh =
    componentResults.storage.operational / carbonIntensity;

  const totalITEnergyKwh =
    gpuEnergyKwh + serverEnergyKwh + networkEnergyKwh + storageEnergyKwh;

  // Cooling overhead energy = (PUE - 1) × IT energy × cooling efficiency
  const coolingEnergyKwh = totalITEnergyKwh * (pue - 1) * coolingEfficiency;
  const coolingCarbon = coolingEnergyKwh * carbonIntensity;

  // Lighting + other infrastructure (fixed daily load)
  const lightingPowerKw = overhead.lightingPowerKW ?? 0;
  const otherPowerKw = overhead.otherInfrastructurePowerKW ?? 0;
  const miscEnergyKwh = (lightingPowerKw + otherPowerKw) * 24;
  const miscCarbon = miscEnergyKwh * carbonIntensity;

  const operationalOverhead = coolingCarbon + miscCarbon;

  // Embodied overhead: rough proxy — 10 % of total IT carbon
  const embodiedOverhead =
    (componentResults.gpu.operational +
      componentResults.servers.operational +
      componentResults.network.operational +
      componentResults.storage.operational) *
    0.1;

  const allocationFactor =
    allocation.method === "time-based" ? allocation.timeAllocation : 1.0;

  return {
    operational: operationalOverhead * allocationFactor,
    embodied: embodiedOverhead * allocationFactor,
    total: (operationalOverhead + embodiedOverhead) * allocationFactor,
  };
}
