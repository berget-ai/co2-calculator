#!/usr/bin/env node
/**
 * Generates the §6.2 worked example and the §8.2 Sweden-vs-US table in
 * METHODOLOGY.md from the SAME calculator code that powers the live site.
 *
 * This keeps the document and the site in lock-step (review point: the
 * methodology example and the published site figure must be reproducible from
 * one source). Run after any change to the calculator, models, hardware or
 * grids, and paste the printed table into METHODOLOGY.md §6.2 / §8.2.
 *
 * Usage:
 *   ./node_modules/.bin/tsup src/index.ts --format esm --dts --clean
 *   node scripts/generate-methodology-example.mjs
 */
import { calculateInference, MODEL_PROFILES, GRID_REGIONS, HARDWARE_CONFIGS, DEPLOYMENT_PROFILES } from "../dist/index.js";

const model = MODEL_PROFILES["google/gemma-4-31B-it"];
const hw = HARDWARE_CONFIGS.b300;
const SECONDS_IN_HOUR = 3600;
const GPU_LIFETIME_SECONDS = 5 * 365 * 24 * 3600;

function fmt(g) {
  if (g < 0.001) return `${(g * 1e6).toFixed(2)} µg`;
  if (g < 1) return `${(g * 1000).toFixed(3)} mg`;
  return `${g.toFixed(3)} g`;
}

function run(gridKey, deployment) {
  return calculateInference({
    modelProfile: model,
    hardware: hw,
    deploymentGrid: GRID_REGIONS[gridKey],
    measuredResponseTimeSeconds: model.defaultResponseTimeSeconds,
    inputTokens: model.defaultInputTokens,
    outputTokens: model.defaultOutputTokens,
    deployment,
    hourOfDay: 14,
    includeTraining: false,
    lifetimeQueries: 0,
  });
}

// Mirror the calculator's intermediate steps for the worked-example table.
const grid = GRID_REGIONS.sweden;
const cachedFraction = model.cachedPromptFraction ?? 0;
const effInput = model.defaultInputTokens * (1 - cachedFraction);
const tokenRatio = (effInput + model.defaultOutputTokens) / (model.defaultInputTokens + model.defaultOutputTokens);
const tokenAdjusted = model.defaultResponseTimeSeconds * Math.sqrt(tokenRatio);
// Fixed-cost denominator: the DAY-AVERAGE concurrency (the model's measured
// Little's Law value), not the instantaneous time-of-day value — §3.2d. The
// shared profile has packingFactor 1, so the denominator is the day average.
const dayAvgConc = model.defaultConcurrency ?? 3; // day-average GPU batch (Little's Law)
const gpuTimeSec = tokenAdjusted; // dayAvgConc <= 8 so no extra delay
const gpuTimeH = gpuTimeSec / SECONDS_IN_HOUR;
const gpusUsed = 1;
const idlePerGpu = hw.nodeIdleWatts / hw.gpuCount;
const incrPerGpu = ((hw.nodePeakWatts - hw.nodeIdleWatts) / hw.gpuCount) * 0.25;
const embodiedPerSec = (hw.embodiedPerGpuKg * 1000) / (GPU_LIFETIME_SECONDS * 0.5);
const otherEmbodiedPerSec = (hw.otherComputeEmbodiedKg * 1000) / (GPU_LIFETIME_SECONDS * 0.5);
const intensity = grid.intensityGPerKwh * grid.peakPeriodFactor;

console.log("### §6.2 worked example (generated from dist/index.js)");
console.log("");
console.log(`Model: ${model.displayName}, ${model.defaultInputTokens} in / ${model.defaultOutputTokens} out, Sweden, 14:00, B300, shared, caching on.`);
console.log("");
console.log("| Component | Calculation | Result |");
console.log("|-----------|-------------|--------|");
console.log(`| Baseline GPU time | measured p50, queue excluded | ${model.defaultResponseTimeSeconds} s |`);
console.log(`| Effective input tokens | ${model.defaultInputTokens} × (1 − ${cachedFraction}) | ${Math.round(effInput)} |`);
console.log(`| Token ratio | (${Math.round(effInput)}+${model.defaultOutputTokens})/(${model.defaultInputTokens}+${model.defaultOutputTokens}) | ${tokenRatio.toFixed(2)} |`);
console.log(`| Token-adjusted time | ${model.defaultResponseTimeSeconds} × √${tokenRatio.toFixed(2)} | ${gpuTimeSec.toFixed(2)} s |`);
console.log(`| Day-average concurrency (Little's Law) | fixed-cost denominator, §3.2d | ${dayAvgConc} |`);
console.log(`| Effective intensity | ${grid.intensityGPerKwh} × ${grid.peakPeriodFactor} (day) | ${intensity.toFixed(1)} g/kWh |`);
console.log(`| GPUs used | 31B params, B300 (268 GB) | ${gpusUsed} |`);
console.log(`| Incremental GPU power | (peak−idle)/8 × 0.25 | ${incrPerGpu.toFixed(0)} W |`);
console.log(`| Idle baseline per GPU | idle/8 | ${idlePerGpu.toFixed(0)} W |`);

const r = run("sweden", "shared");
const c = r.components;
console.log(`| GPU compute CO₂ | incremental energy × ${intensity.toFixed(1)} / ${dayAvgConc} | ${fmt(c.gpuOperational.co2Grams)} |`);
console.log(`| GPU idle CO₂ | idle energy × ${intensity.toFixed(1)} / ${dayAvgConc} | ${fmt(c.gpuIdle.co2Grams)} |`);
console.log(`| Server CO₂ | chassis energy × ${intensity.toFixed(1)} / ${dayAvgConc} | ${fmt(c.serverOperational.co2Grams)} |`);
console.log(`| Cooling overhead | (compute+idle+server) × (PUE−1) | ${fmt(c.datacenterOverhead.co2Grams)} |`);
console.log(`| Embodied GPU | ${embodiedPerSec.toFixed(4)} g/s × ${gpuTimeSec.toFixed(2)} s / ${dayAvgConc} | ${fmt(c.embodiedGpu.co2Grams)} |`);
console.log(`| Embodied other (DB/logging/network) | ${otherEmbodiedPerSec.toFixed(4)} g/s × ${gpuTimeSec.toFixed(2)} s / ${dayAvgConc} | ${fmt(c.embodiedOther.co2Grams)} |`);
console.log(`| **Total (excl. training)** | | **${fmt(r.totalCO2Grams)}** |`);

const operational = c.gpuOperational.co2Grams + c.gpuIdle.co2Grams + c.serverOperational.co2Grams + c.datacenterOverhead.co2Grams;
console.log("");
console.log(`Operational subtotal (compute+idle+server+cooling, excl. embodied & training): **${fmt(operational)}**.`);
console.log(`Embodied share of total: ${(((c.embodiedGpu.co2Grams + c.embodiedOther.co2Grams) / r.totalCO2Grams) * 100).toFixed(0)}%.`);

console.log("\n### §6.3 deployment comparison (generated)");
console.log("");
console.log("Same model, request, grid and hour — only the deployment changes (§3.2c).");
console.log("");
console.log("| Deployment | Total CO₂e | vs shared |");
console.log("|------------|-----------:|----------:|");
const shared = r.totalCO2Grams;
for (const dep of ["onprem", "shared", "hyperscaler"]) {
  const rr = run("sweden", dep);
  console.log(`| ${dep} | ${fmt(rr.totalCO2Grams)} | ${(rr.totalCO2Grams / shared).toFixed(2)}× |`);
}

console.log("\n### §8.2 Sweden vs US (generated)");
console.log("");
console.log("| Component | Sweden (8 g/kWh, PUE 1.15) | US Average (380 g/kWh, PUE 1.50) |");
console.log("|-----------|---------------------------|----------------------------------|");
const us = run("usa", "shared");
const uc = us.components;
const rows = [
  ["GPU compute", c.gpuOperational, uc.gpuOperational],
  ["GPU idle baseline", c.gpuIdle, uc.gpuIdle],
  ["Server", c.serverOperational, uc.serverOperational],
  ["Cooling overhead", c.datacenterOverhead, uc.datacenterOverhead],
  ["Embodied GPU", c.embodiedGpu, uc.embodiedGpu],
  ["Embodied other (infra)", c.embodiedOther, uc.embodiedOther],
];
for (const [label, se, us2] of rows) {
  console.log(`| ${label} | ${fmt(se.co2Grams)} | ${fmt(us2.co2Grams)} |`);
}
console.log(`| **Total** | **${fmt(r.totalCO2Grams)}** | **${fmt(us.totalCO2Grams)}** |`);
const seOp = operational;
const usOp = uc.gpuOperational.co2Grams + uc.gpuIdle.co2Grams + uc.serverOperational.co2Grams + uc.datacenterOverhead.co2Grams;
console.log("");
console.log(`Operational-only ratio (US / Sweden): ${(usOp / seOp).toFixed(1)}×. Total ratio: ${(us.totalCO2Grams / r.totalCO2Grams).toFixed(1)}×.`);
