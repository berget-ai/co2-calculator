#!/usr/bin/env node
/**
 * Weekly energy reality-check: measured GPU energy (Prometheus) vs the
 * calculator's per-request estimates.
 *
 * Sanitised output by design (platform privacy): prints averages, ratios and
 * per-request figures only — never fleet totals, request counts or node
 * counts. Set DEBUG_RAW=1 for unsanitised local output (do not share).
 *
 * Usage (same pattern as calibrate-from-prometheus.mjs):
 *   kubectl --context berget-prod port-forward \
 *     svc/rancher-monitoring-prometheus 19090:9090 -n cattle-monitoring-system &
 *   PROM_URL=http://localhost:19090 node scripts/energy-reality-check.mjs
 *
 * Env:
 *   PROM_URL   default http://localhost:19090
 *   WINDOW     default 7d
 *   DEBUG_RAW  1 = print raw fleet numbers (local use only)
 */

const PROM = process.env.PROM_URL || "http://localhost:19090";
const W = process.env.WINDOW || "7d";
const DEBUG_RAW = process.env.DEBUG_RAW === "1";

// Model → serving hardware class + Prometheus label filter. Model ids are
// public (they are the models we serve); the report adds no traffic data.
const SERVED = [
  { profile: "mistralai/Mistral-Small-3.2-24B-Instruct-2506", hw: "b300", prom: "vllm:request_inference_time_seconds_count", filter: 'model_name="mistralai/Mistral-Small-3.2-24B-Instruct-2506"' },
  { profile: "google/gemma-4-31B-it", hw: "b300", prom: "sglang_num_requests_total", filter: 'model="gemma-4-31b"' },
  { profile: "zai-org/GLM-5.2", hw: "b300", prom: "sglang_num_requests_total", filter: 'model="glm-5-3-flash"' },
  { profile: "moonshotai/Kimi-K3", hw: "b300", prom: "sglang_num_requests_total", filter: 'model="kimi-k3"' },
];

const q = async (query) => {
  const res = await fetch(`${PROM}/api/v1/query?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Prometheus HTTP ${res.status}`);
  const j = await res.json();
  if (j.status !== "success") throw new Error(j.error || "query failed");
  return j.data.result;
};

// ── 1. Measured energy per GPU (deduplicated per UUID/index) ──────────────
const nvidiaPerGpu = await q(`max by (UUID) (increase(DCGM_FI_DEV_TOTAL_ENERGY_CONSUMPTION{gpu_type="B300x8"}[${W}]) / 3.6e9)`);
const amdPerGpu = await q(`max by (instance, gpu) (increase(amd_gpu_energy_joules[${W}]) / 3.6e6)`);
const nvidiaValues = nvidiaPerGpu.map((r) => +r.value[1]);
const amdValues = amdPerGpu.map((r) => +r.value[1]);
const nvidiaMeasured = nvidiaValues.reduce((a, b) => a + b, 0);
const amdMeasured = amdValues.reduce((a, b) => a + b, 0);

// Average sustained power per GPU (energy ÷ GPU-weeks): calibration data.
const WEEK_S = 7 * 24 * 3600;
const nvidiaAvgWGpu = (nvidiaMeasured * 3.6e6) / (nvidiaValues.length * WEEK_S);

console.log(`== Measured (sanitised, window ${W}) ==`);
console.log(
  `  NVIDIA B300 class: avg ${nvidiaAvgWGpu.toFixed(0)} W/GPU sustained (incl. idle)` +
    (DEBUG_RAW ? ` — total ${nvidiaMeasured.toFixed(1)} kWh over ${nvidiaValues.length} GPUs` : ""),
);
console.log("  AMD class: counters are double-scraped in the current setup (catch-all +");
console.log("  dedicated scrape report the same devices); excluded from the sanitised");
console.log("  report until the scrape config is deduplicated. Measured-vs-estimated is");
console.log("  reported for the NVIDIA serving class (per-model attribution exists) and");
console.log("  as ratios only elsewhere.");

// ── 2. Per-request estimates (lib, measured response times) ───────────────
const lib = await import(new URL("../dist/index.js", import.meta.url));
let estMeasuredRatioBase = null;
console.log(`\n== Per-request GPU energy estimate (window ${W}) ==`);
for (const s of SERVED) {
  const profile = lib.MODEL_PROFILES[s.profile];
  if (!profile) {
    console.log(`  ${s.profile}: no model profile — skipped`);
    continue;
  }
  const r = await q(`sum(increase(${s.prom}{${s.filter}}[${W}]))`);
  const requests = r[0] ? +r[0].value[1] : 0;
  const est = lib.calculateInference({
    modelProfile: profile,
    hardware: lib.HARDWARE_CONFIGS[s.hw],
    deploymentGrid: lib.GRID_REGIONS.sweden, // energy is grid-independent; only kWh matter here
    measuredResponseTimeSeconds: profile.defaultResponseTimeSeconds,
    inputTokens: profile.defaultInputTokens,
    outputTokens: profile.defaultOutputTokens,
    hourOfDay: 14,
    utilization: 0.7,
    includeTraining: false,
  });
  const perReq = est.components.gpuOperational.energyKwh + est.components.gpuIdle.energyKwh;
  const measuredForModel = await q(
    `sum(increase(${s.prom === "vllm:request_inference_time_seconds_count" ? "vllm:request_inference_time_seconds_sum" : s.prom.replace(/_total$/, "_time_seconds_total")}{${s.filter}}[${W}]))`,
  ).catch(() => []);
  console.log(
    `  ${s.profile.padEnd(45)} est ${perReq.toFixed(5)} kWh/req (measured p50 resp ${profile.defaultResponseTimeSeconds?.toFixed?.(2)} s)` +
      (DEBUG_RAW ? ` requests=${requests} weekKWh=${(perReq * requests).toFixed(0)}` : ""),
  );

  // Ratio basis: fleet measured energy ÷ request-weighted estimate energy,
  // expressed as a ratio only (both absolute values are platform-private).
  if (!estMeasuredRatioBase) estMeasuredRatioBase = { requests, perReq, s };
}

// ── 3. Measured vs estimated ratio (the honest headline) ──────────────────
// Weighted check across the dominant serving class: total measured energy of
// the class ÷ Σ(requests × per-request estimate). Ratio ≈ 1.0 means the
// per-request accounting reconciles with the meters.
const measured = nvidiaMeasured; // GPU-only energy, NVIDIA class
let ratio = null;
if (estMeasuredRatioBase) {
  // request-weighted estimate uses the full panel; compute quietly
  let weighted = 0;
  for (const s of SERVED) {
    const profile = lib.MODEL_PROFILES[s.profile];
    if (!profile) continue;
    const r = await q(`sum(increase(${s.prom}{${s.filter}}[${W}]))`);
    const requests = r[0] ? +r[0].value[1] : 0;
    const est = lib.calculateInference({
      modelProfile: profile,
      hardware: lib.HARDWARE_CONFIGS[s.hw],
      deploymentGrid: lib.GRID_REGIONS.sweden,
      measuredResponseTimeSeconds: profile.defaultResponseTimeSeconds,
      inputTokens: profile.defaultInputTokens,
      outputTokens: profile.defaultOutputTokens,
      hourOfDay: 14,
      utilization: 0.7,
      includeTraining: false,
    });
    weighted += (est.components.gpuOperational.energyKwh + est.components.gpuIdle.energyKwh) * requests;
  }
  if (weighted > 0) ratio = measured / weighted;
}
console.log("\n== Measured / estimated (sanitised) ==");
console.log(
  ratio === null
    ? "  ratio unavailable (no traffic in window?)"
    : `  NVIDIA serving class: measured ÷ estimated = ${ratio.toFixed(2)} — ` +
        (ratio > 1 ? "measured exceeds estimates" : `per-request accounting runs ${((1 - ratio) * 100).toFixed(0)}% high (concurrent-request sharing not fully netted out)`) +
        "",
);
console.log("  Interpretation: per-request energy includes the full GPU-shard time of a");
console.log("  request; batching shares that time across concurrent requests, so the");
console.log("  ratio is the calibration factor for concurrency-aware accounting.");
