import {
  calculateInfrastructureCO2,
  createInfrastructureConfig,
  createEstimationParams,
  infrastructureTemplates,
} from "@berget/co2-emissions-calculator";

async function main() {
  console.log("=== Infrastructure-Based CO2 Estimation Examples ===\n");

  // Example 1: AWS Cloud Infrastructure
  console.log("Example 1: AWS Cloud Setup");
  const awsConfig = createInfrastructureConfig("awsCloud", {
    carbonIntensityGCO2PerKWh: 180,
  });

  const awsParams = createEstimationParams(1000, awsConfig, {
    allocationMethod: "proportional",
  });

  const awsResult = calculateInfrastructureCO2(awsParams);
  console.log(`Total CO2: ${awsResult.co2Grams.toFixed(4)} grams`);
  console.log(`Per token: ${awsResult.co2PerToken.toFixed(9)} grams`);
  console.log(`GPU: ${awsResult.infrastructure.gpu.total.toFixed(4)} g`);
  console.log(
    `Servers: ${awsResult.infrastructure.servers.total.toFixed(4)} g`,
  );
  console.log(
    `Datacenter: ${awsResult.infrastructure.datacenter.total.toFixed(4)} g`,
  );
  console.log(`Allocation: ${JSON.stringify(awsResult.allocation)}`);
  console.log();

  // Example 2: On-Premise Small Setup
  console.log("Example 2: Small On-Premise Setup");
  const onPremConfig = createInfrastructureConfig("onPremiseSmall", {
    carbonIntensityGCO2PerKWh: 420,
  });

  const onPremParams = createEstimationParams(1000, onPremConfig, {
    allocationMethod: "time-based",
  });

  const onPremResult = calculateInfrastructureCO2(onPremParams);
  console.log(`Total CO2: ${onPremResult.co2Grams.toFixed(4)} grams`);
  console.log(`Per token: ${onPremResult.co2PerToken.toFixed(9)} grams`);
  console.log(
    `GPU (operational): ${onPremResult.infrastructure.gpu.operational.toFixed(4)} g`,
  );
  console.log(
    `GPU (embodied): ${onPremResult.infrastructure.gpu.embodied.toFixed(4)} g`,
  );
  console.log(
    `Network: ${onPremResult.infrastructure.network.total.toFixed(4)} g`,
  );
  console.log(
    `Storage: ${onPremResult.infrastructure.storage.total.toFixed(4)} g`,
  );
  console.log();

  // Example 3: Hybrid Setup with Custom Overrides
  console.log("Example 3: Hybrid Setup with Custom Configuration");
  const hybridConfig = createInfrastructureConfig("hybridSetup", {
    gpus: [
      {
        id: "custom-gpu-cluster",
        manufacturer: "NVIDIA",
        model: "H100",
        count: 8,
        powerRatingWattsPerGPU: 700,
        utilizationRate: 0.9,
        operationalHoursPerDay: 20,
        condition: "new",
        embodiedCarbonKgCO2e: 2000,
        shared: {
          totalGPUs: 16,
          allocatedGPUs: 8,
          sharedWith: ["team-alpha", "team-beta"],
        },
      },
    ],
    servers: [
      {
        type: "server",
        condition: "new",
        ageYears: 0,
        manufacturer: "Supermicro",
        model: "SuperServer 1024US-TR4",
        powerRatingWatts: 1200,
        utilizationRate: 0.85,
        operationalHoursPerDay: 20,
        embodiedCarbonKgCO2e: 1800,
      },
    ],
    datacenterOverhead: {
      coolingEfficiency: 0.85,
      pue: 1.35,
      lightingPowerKW: 0.3,
      otherInfrastructurePowerKW: 0.2,
    },
  });

  const hybridParams = createEstimationParams(1000, hybridConfig, {
    allocationMethod: "proportional",
    includeDatacenterOverhead: true,
  });

  const hybridResult = calculateInfrastructureCO2(hybridParams);
  console.log(`Total CO2: ${hybridResult.co2Grams.toFixed(4)} grams`);
  console.log(`Breakdown:`);
  console.log(`  GPU: ${hybridResult.infrastructure.gpu.total.toFixed(4)} g`);
  console.log(
    `  Servers: ${hybridResult.infrastructure.servers.total.toFixed(4)} g`,
  );
  console.log(
    `  Network: ${hybridResult.infrastructure.network.total.toFixed(4)} g`,
  );
  console.log(
    `  Datacenter: ${hybridResult.infrastructure.datacenter.total.toFixed(4)} g`,
  );
  console.log(
    `Allocation (proportional): ${JSON.stringify(hybridResult.allocation)}`,
  );
  console.log();

  // Example 4: Third-Party Provider
  console.log("Example 4: Third-Party Cloud Provider");
  const providerConfig = createInfrastructureConfig("thirdPartyProvider", {
    carbonIntensityGCO2PerKWh: 320,
  });

  const providerParams = createEstimationParams(1000, providerConfig, {
    allocationMethod: "direct",
  });

  const providerResult = calculateInfrastructureCO2(providerParams);
  console.log(`Total CO2: ${providerResult.co2Grams.toFixed(4)} grams`);
  console.log(
    `GPU allocation: ${providerResult.allocation.gpuAllocation.toFixed(2)}`,
  );
  console.log(
    `CPU allocation: ${providerResult.allocation.cpuAllocation.toFixed(2)}`,
  );
  console.log(
    `Memory allocation: ${providerResult.allocation.memoryAllocation.toFixed(2)}`,
  );
  console.log();

  // Example 5: Comparison of Different Infrastructures
  console.log("Example 5: Infrastructure Comparison (1000 tokens)");
  const tokenCount = 1000;
  const infrastructures = [
    "awsCloud",
    "googleCloud",
    "onPremiseSmall",
    "hybridSetup",
    "thirdPartyProvider",
  ] as const;

  console.log("\nInfrastructure Comparison:");
  console.log("─".repeat(80));
  console.log(
    "Infrastructure".padEnd(20) + "Total (g)".padEnd(15) + "Per Token (g)",
  );
  console.log("─".repeat(80));

  for (const infra of infrastructures) {
    const config = createInfrastructureConfig(infra);
    const params = createEstimationParams(tokenCount, config);
    const result = calculateInfrastructureCO2(params);

    const totalCO2 = result.co2Grams.toFixed(4);
    const perToken = result.co2PerToken.toFixed(9);

    console.log(`${infra.padEnd(20)}${totalCO2.padEnd(15)}${perToken}`);
  }
  console.log("─".repeat(80));
  console.log();

  // Example 6: Custom Infrastructure from Scratch
  console.log("Example 6: Custom Infrastructure Configuration");
  const customConfig = {
    deploymentType: "on-premise" as const,
    carbonIntensityGCO2PerKWh: 250,
    renewableEnergyPercentage: 80,

    racks: [
      {
        type: "rack" as const,
        condition: "new" as const,
        ageYears: 0,
        powerRatingWatts: 300,
        utilizationRate: 0.9,
        operationalHoursPerDay: 24,
        embodiedCarbonKgCO2e: 2500,
      },
    ],

    servers: [
      {
        type: "server" as const,
        condition: "refurbished" as const,
        ageYears: 3,
        manufacturer: "HP",
        model: "ProLiant DL380",
        powerRatingWatts: 700,
        utilizationRate: 0.8,
        operationalHoursPerDay: 24,
        embodiedCarbonKgCO2e: 1300,
      },
    ],

    network: [
      {
        type: "network" as const,
        condition: "existing" as const,
        ageYears: 2,
        tier: "core" as const,
        powerRatingWatts: 150,
        utilizationRate: 0.95,
        operationalHoursPerDay: 24,
      },
    ],

    storage: [
      {
        type: "storage" as const,
        condition: "new" as const,
        ageYears: 0,
        powerRatingWatts: 50,
        utilizationRate: 0.6,
        operationalHoursPerDay: 24,
        embodiedCarbonKgCO2e: 400,
      },
    ],

    gpus: [
      {
        id: "custom-gpu",
        manufacturer: "NVIDIA",
        model: "RTX 4090",
        count: 4,
        powerRatingWattsPerGPU: 450,
        utilizationRate: 0.85,
        operationalHoursPerDay: 16,
        condition: "new" as const,
        embodiedCarbonKgCO2e: 1800,
      },
    ],

    datacenterOverhead: {
      coolingEfficiency: 0.88,
      pue: 1.25,
      lightingPowerKW: 0.2,
      otherInfrastructurePowerKW: 0.15,
    },

    sharedResources: {
      cpuCores: 64,
      allocatedCores: 32,
      memoryGB: 512,
      allocatedMemoryGB: 256,
    },
  };

  const customParams = createEstimationParams(1000, customConfig, {
    allocationMethod: "proportional",
  });

  const customResult = calculateInfrastructureCO2(customParams);
  console.log(`Total CO2: ${customResult.co2Grams.toFixed(4)} grams`);
  console.log(
    `Operational: ${customResult.details.operationalCarbon.toFixed(4)} g`,
  );
  console.log(`Embodied: ${customResult.details.embodiedCarbon.toFixed(4)} g`);
  console.log(`PUE: ${customConfig.datacenterOverhead.pue}`);
  console.log(
    `Cooling Efficiency: ${customConfig.datacenterOverhead.coolingEfficiency}`,
  );
  console.log();

  // Example 7: Different Allocation Methods
  console.log("Example 7: Allocation Method Comparison");
  const testConfig = createInfrastructureConfig("hybridSetup");
  const allocationMethods = ["direct", "proportional", "time-based"] as const;

  console.log("\nAllocation Method Comparison:");
  console.log("─".repeat(60));
  console.log("Method".padEnd(15) + "Total (g)".padEnd(15) + "GPU Allocation");
  console.log("─".repeat(60));

  for (const method of allocationMethods) {
    const params = createEstimationParams(1000, testConfig, {
      allocationMethod: method,
    });
    const result = calculateInfrastructureCO2(params);

    const totalCO2 = result.co2Grams.toFixed(4);
    const gpuAlloc = result.allocation.gpuAllocation.toFixed(3);

    console.log(`${method.padEnd(15)}${totalCO2.padEnd(15)}${gpuAlloc}`);
  }
  console.log("─".repeat(60));
}

main().catch(console.error);
