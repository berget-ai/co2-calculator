import {
  estimateCO2,
  huggingFaceService,
  setModelCO2Profile,
} from "@berget/co2-emissions-calculator";

async function main() {
  console.log("=== CO2 Emissions Calculator Examples ===\n");

  // Example 1: Token-based estimation
  console.log("Example 1: Token-based estimation");
  const result1 = estimateCO2({
    tokenCount: 1000,
    modelId: "meta-llama/Llama-3.1-8B-Instruct",
    carbonIntensity: 450,
  });
  console.log(`Tokens: 1000`);
  console.log(`CO2: ${result1.co2Grams} grams`);
  console.log(`Per token: ${result1.co2PerToken} grams`);
  console.log(`Method: ${result1.method}`);
  console.log(`Operational: ${result1.details.operationalCarbon} g`);
  console.log(`Embodied: ${result1.details.embodiedCarbon} g`);
  console.log();

  // Example 2: GPU energy measurement (more accurate)
  console.log("Example 2: GPU energy measurement");
  const result2 = estimateCO2({
    tokenCount: 1000,
    energyJoules: 50000, // Actual energy consumed
    modelId: "meta-llama/Llama-3.1-8B-Instruct",
    carbonIntensity: 450,
  });
  console.log(`Tokens: 1000`);
  console.log(`Energy: ${result2.energyKwh} kWh`);
  console.log(`CO2: ${result2.co2Grams} grams`);
  console.log(`Per token: ${result2.co2PerToken} grams`);
  console.log(`Method: ${result2.method}`);
  console.log();

  // Example 3: Different model
  console.log("Example 3: Larger model (70B parameters)");
  const result3 = estimateCO2({
    tokenCount: 1000,
    modelId: "meta-llama/Llama-3.3-70B-Instruct",
    carbonIntensity: 450,
  });
  console.log(`Tokens: 1000`);
  console.log(`CO2: ${result3.co2Grams} grams`);
  console.log(`Per token: ${result3.co2PerToken} grams`);
  console.log(`Per parameter: ${result3.co2PerParameter} g × 10^-9`);
  console.log();

  // Example 4: Fetch model from Hugging Face
  console.log("Example 4: Fetch model profile from Hugging Face");
  try {
    const profile = await huggingFaceService.calculateCO2Profile(
      "meta-llama/Llama-3.1-8B-Instruct",
    );
    if (profile) {
      console.log(`Model: ${profile.modelId}`);
      console.log(`Parameters: ${profile.parameters.toLocaleString()}`);
      console.log(`FLOPs per token: ${profile.flopsPerToken.toLocaleString()}`);
      console.log(`Estimated power: ${profile.defaultPowerWatts}W`);
      console.log(`Efficiency factor: ${profile.efficiencyFactor}`);

      // Add to profiles
      setModelCO2Profile(profile);
      console.log("Profile added to library");
    }
  } catch (error) {
    console.error("Error fetching from Hugging Face:", error);
  }
  console.log();

  // Example 5: Comparison of different models
  console.log("Example 5: Model comparison (1000 tokens)");
  const models = [
    "meta-llama/Llama-3.1-8B-Instruct",
    "meta-llama/Llama-3.3-70B-Instruct",
    "openai/gpt-oss-120b",
  ];

  models.forEach((modelId) => {
    const result = estimateCO2({
      tokenCount: 1000,
      modelId,
      carbonIntensity: 450,
    });
    console.log(
      `${modelId}: ${result.co2Grams.toFixed(6)} g CO2 (${result.co2PerToken.toFixed(9)} g/token)`,
    );
  });
}

main().catch(console.error);
