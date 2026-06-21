#!/usr/bin/env node
/**
 * Script to import closed models from EcoLogits
 * 
 * EcoLogits has estimated parameter counts for proprietary models.
 * This script fetches their models.json and converts to our format.
 * 
 * Source: https://github.com/mlco2/ecologits
 * License: MPL-2.0
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ECOLOGITS_MODELS_URL = 'https://raw.githubusercontent.com/mlco2/ecologits/main/ecologits/data/models.json';

// Map EcoLogits providers to our model IDs
const PROVIDER_MAP = {
  'openai': 'openai',
  'anthropic': 'anthropic', 
  'mistralai': 'mistralai',
  'google_genai': 'google',
  'cohere': 'cohere',
};

// Training CO2 estimates for closed models (kg CO2e)
// Based on scaling laws and public estimates
const TRAINING_ESTIMATES = {
  'gpt-4': 50_000_000, // 50M kg = 50B tons (estimated)
  'gpt-4o': 20_000_000,
  'gpt-4.1': 15_000_000,
  'gpt-5': 30_000_000,
  'claude-opus': 40_000_000,
  'claude-sonnet': 10_000_000,
  'claude-haiku': 2_000_000,
  'mistral-large': 10_000_000,
  'mistral-medium': 5_000_000,
  'command-r': 5_000_000,
  'command-a': 8_000_000,
};

function getTrainingEstimate(modelName) {
  for (const [key, value] of Object.entries(TRAINING_ESTIMATES)) {
    if (modelName.includes(key)) return value * 1000; // Convert to grams
  }
  return 5_000_000_000; // Default 5B kg = 5T grams
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function convertToOurFormat(ecologitsModels) {
  const models = {};
  
  for (const m of ecologitsModels) {
    // Skip huggingface models (we already have those)
    if (m.provider === 'huggingface_hub') continue;
    
    const provider = PROVIDER_MAP[m.provider] || m.provider;
    const modelId = `${provider}/${m.name}`;
    
    // Extract parameters
    const arch = m.architecture;
    let parameters = 0;
    let modelSizeBytes = undefined;
    
    if (typeof arch.parameters === 'number') {
      parameters = arch.parameters * 1_000_000_000;
    } else if (arch.parameters?.total) {
      // MoE model
      const total = arch.parameters.total;
      if (typeof total === 'number') {
        parameters = total * 1_000_000_000;
      } else if (total.min && total.max) {
        parameters = ((total.min + total.max) / 2) * 1_000_000_000;
      }
    } else if (arch.parameters?.min && arch.parameters?.max) {
      // Range
      parameters = ((arch.parameters.min + arch.parameters.max) / 2) * 1_000_000_000;
    }
    
    // Estimate model size (assume FP16 for closed models)
    modelSizeBytes = parameters * 2;
    
    // Get deployment data
    const ttft = m.deployment?.ttft || 0.5;
    const tps = m.deployment?.tps || 50;
    
    // Estimate response time
    const defaultOutputTokens = 500;
    const defaultResponseTime = ttft + (defaultOutputTokens / tps);
    
    models[modelId] = {
      modelId,
      displayName: m.name,
      architecture: arch.type === 'moe' ? 'mixture-of-experts' : 'dense-transformer',
      parameters: Math.round(parameters),
      modelSizeBytes,
      totalTrainingCO2Grams: getTrainingEstimate(m.name),
      trainingSource: `EcoLogits estimate (github.com/mlco2/ecologits)`,
      defaultInputTokens: 1000,
      defaultOutputTokens,
      defaultResponseTimeSeconds: Math.round(defaultResponseTime * 10) / 10,
      // Flag as estimated/closed model
      warnings: m.warnings || [],
      sources: m.sources || [],
    };
  }
  
  return models;
}

async function main() {
  console.log('Fetching EcoLogits models...');
  
  try {
    const data = await fetchJSON(ECOLOGITS_MODELS_URL);
    const closedModels = data.models.filter(m => m.provider !== 'huggingface_hub');
    
    console.log(`Found ${closedModels.length} closed models from EcoLogits`);
    
    const ourModels = convertToOurFormat(closedModels);
    
    // Write to file
    const outputPath = path.join(__dirname, '..', 'src', 'ecologits-models.json');
    fs.writeFileSync(outputPath, JSON.stringify(ourModels, null, 2));
    
    console.log(`\nConverted ${Object.keys(ourModels).length} models`);
    console.log(`\nSample models:`);
    Object.entries(ourModels).slice(0, 5).forEach(([id, m]) => {
      console.log(`  ${id}: ${(m.parameters / 1e9).toFixed(1)}B params, ${m.defaultResponseTimeSeconds}s response`);
    });
    
    console.log(`\nWritten to: ${outputPath}`);
    console.log('\nTo merge with existing models, update models.ts:');
    console.log('  import ECOLOGITS_MODELS from "./ecologits-models.json";');
    console.log('  export const MODEL_PROFILES = { ...OPEN_MODELS, ...ECOLOGITS_MODELS };');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
