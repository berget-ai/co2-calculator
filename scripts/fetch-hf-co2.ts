#!/usr/bin/env node
/**
 * Fetch CO₂ emissions data from HuggingFace model cards for all Berget models.
 * Updates the calculator with verified data where available.
 */
const HF_API_BASE = "https://huggingface.co/api/models";

// Models available in api.berget.ai/v1/models
const MODELS = [
  { id: 'meta-llama/Llama-3.1-8B-Instruct',         training_g: 1_700_000,   source: 'Meta sustainability' },
  { id: 'meta-llama/Llama-3.3-70B-Instruct',        training_g: 9_300_000,   source: 'Meta sustainability' },
  { id: 'mistralai/Mistral-Small-3.2-24B-Instruct-2506', training_g: 3_200_000, source: 'Mistral AI' },
  { id: 'mistralai/Mistral-Medium-3.5-128B',        training_g: 17_000_000,  source: 'SCI-AI estimate' },
  { id: 'openai/gpt-oss-120b',                       training_g: 16_000_000,  source: 'SCI-AI estimate' },
  { id: 'zai-org/GLM-4.7-FP8',                       training_g: 6_300_000,   source: 'Zhipu AI' },
  { id: 'google/gemma-4-31B-it',                     training_g: 4_100_000,   source: 'Google' },
  { id: 'moonshotai/Kimi-K2.6',                      training_g: 180_000_000, source: 'Moonshot MoE estimate' },
  { id: 'intfloat/multilingual-e5-large',           training_g: 280_000,     source: 'Microsoft Research' },
  { id: 'intfloat/multilingual-e5-large-instruct',   training_g: 320_000,     source: 'Microsoft Research' },
  { id: 'BAAI/bge-reranker-v2-m3',                   training_g: 150_000,     source: 'BAAI' },
];

async function fetchHFData(modelId) {
  try {
    const response = await fetch(`${HF_API_BASE}/${modelId}`, {
      headers: { 'User-Agent': '@berget/co2-calculator/1.0' }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching ${modelId}:`, error.message);
    return null;
  }
}

function extractCO2(modelInfo) {
  if (!modelInfo || !modelInfo.cardData) return null;
  const co2Data = modelInfo.cardData.co2_eq_emissions;
  if (!co2Data || typeof co2Data.emissions !== 'number') return null;
  
  return {
    emissions_g: co2Data.emissions,
    source: co2Data.source || 'HuggingFace model card',
    training_type: co2Data.training_type || 'unknown',
    location: co2Data.geographical_location || 'unknown',
    hardware: co2Data.hardware_used || 'unknown'
  };
}

async function main() {
  console.log('Fetching CO₂ data from HuggingFace model cards...\n');
  console.log('='.repeat(100));
  console.log('MODEL'.padEnd(50), 'HF DATA', 'OUR ESTIMATE', 'SOURCE');
  console.log('='.repeat(100));

  const results = [];

  for (const model of MODELS) {
    const hfData = await fetchHFData(model.id);
    const co2Info = extractCO2(hfData);
    
    if (co2Info) {
      console.log(
        model.id.slice(0, 48).padEnd(50),
        `${co2Info.emissions_g.toLocaleString()}g`.padEnd(15),
        `${model.training_g.toLocaleString()}g`.padEnd(15),
        '✅ HF verified'
      );
      results.push({ ...model, verified: true, hf_co2: co2Info });
    } else {
      console.log(
        model.id.slice(0, 48).padEnd(50),
        'N/A'.padEnd(15),
        `${model.training_g.toLocaleString()}g`.padEnd(15),
        `⚠️  ${model.source}`
      );
      results.push({ ...model, verified: false, hf_co2: null });
    }
    
    // Rate limit respect
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('='.repeat(100));
  console.log(`\nResults: ${results.filter(r => r.verified).length}/${results.length} models have HF CO₂ data\n`);

  // Summary for verified models
  const verified = results.filter(r => r.verified);
  if (verified.length > 0) {
    console.log('📋 Detailed verified data:');
    for (const m of verified) {
      console.log(`\n${m.id}:`);
      console.log(`  HF:        ${m.hf_co2.emissions_g.toLocaleString()} g CO₂`);
      console.log(`  Our est:   ${m.training_g.toLocaleString()} g CO₂`);
      console.log(`  Diff:      ${((m.hf_co2.emissions_g - m.training_g) / m.training_g * 100).toFixed(1)}%`);
      console.log(`  Training:  ${m.hf_co2.training_type}`);
      console.log(`  Location:  ${m.hf_co2.location}`);
      console.log(`  Hardware:  ${m.hf_co2.hardware}`);
    }
  }
}

main().catch(console.error);
