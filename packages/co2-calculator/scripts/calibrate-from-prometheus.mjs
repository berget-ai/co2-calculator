#!/usr/bin/env node
/**
 * Calibrate model profiles from measured production data (Prometheus).
 *
 * Reads per-model p50 request latency from Berget's Prometheus (vLLM and
 * SGLang exporters) over a trailing window, and writes the measured values
 * into src/models.ts `defaultResponseTimeSeconds`, replacing editorial
 * estimates with production p50s. This is the "reality check" made real:
 * the per-request GPU time for our own models is measured, not guessed.
 *
 * Usage:
 *   kubectl --context berget-prod port-forward \
 *     svc/rancher-monitoring-prometheus 19090:9090 -n cattle-monitoring-system &
 *   node scripts/calibrate-from-prometheus.mjs            # write to models.ts
 *   node scripts/calibrate-from-prometheus.mjs --dry-run  # print only
 *
 * Env:
 *   PROMETHEUS_URL  default http://localhost:19090
 *   WINDOW          default 7d (Prometheus range, e.g. 24h, 7d, 30d)
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, "..", "src");

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || "http://localhost:19090";
const WINDOW = process.env.WINDOW || "7d";
const DRY_RUN = process.argv.includes("--dry-run");

// Map our MODEL_PROFILES id -> the engine that serves it + the Prometheus
// model_name label it reports under. vLLM sometimes reports a raw HF snapshot
// path instead of a clean name, so we match on a substring too.
const MODEL_SOURCES = {
  "google/gemma-4-31B-it": { engine: "vllm", match: "gemma-4-31B-it" },
  "mistralai/Mistral-Small-3.2-24B-Instruct-2506": { engine: "vllm", match: "Mistral-Small-3.2-24B" },
  "mistralai/Mistral-Medium-3.5-128B": { engine: "vllm", match: "Mistral-Medium-3.5-128B" },
  "zai-org/GLM-5.2": { engine: "sglang", match: "GLM-5.2" },
  "moonshotai/Kimi-K3": { engine: "sglang", match: "Kimi-K3" },
};

// ─── Prometheus helpers ───

async function promQuery(query) {
  const url = `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Prometheus HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== "success") throw new Error(`Prometheus error: ${json.error}`);
  return json.data.result;
}

/**
 * p50 GPU time per model over WINDOW — the time the model is actually
 * computing, EXCLUDING queue wait. We use request_inference_time (pure GPU
 * work) rather than e2e latency, because queueing is not energy spent on
 * this request. SGLang has no inference_time metric, but its queue time is
 * negligible (~4ms), so we fall back to e2e there (e2e ≈ GPU time).
 */
async function fetchP50Latency(engine) {
  const metric =
    engine === "vllm"
      ? "vllm:request_inference_time_seconds_bucket"
      : "sglang_e2e_request_latency_seconds_bucket";
  const q = `histogram_quantile(0.5, sum by (le, model_name) (rate(${metric}[${WINDOW}])))`;
  const result = await promQuery(q);
  const out = {};
  for (const r of result) {
    const name = r.metric.model_name || "";
    const seconds = parseFloat(r.value[1]);
    if (Number.isFinite(seconds)) out[name] = seconds;
  }
  return out;
}

/**
 * Mean output (generation) tokens per request, over WINDOW. Reasoning models
 * emit many internal "thinking" tokens before the answer, which is real GPU
 * work — so we calibrate defaultOutputTokens from production, not a guess.
 */
async function fetchOutputTokens(engine) {
  const genMetric =
    engine === "vllm" ? "vllm:generation_tokens_total" : "sglang_generation_tokens_total";
  const reqMetric =
    engine === "vllm"
      ? "vllm:e2e_request_latency_seconds_count"
      : "sglang_e2e_request_latency_seconds_count";
  const q = `sum by (model_name) (rate(${genMetric}[${WINDOW}])) / sum by (model_name) (rate(${reqMetric}[${WINDOW}]))`;
  try {
    const result = await promQuery(q);
    const out = {};
    for (const r of result) {
      const v = parseFloat(r.value[1]);
      if (Number.isFinite(v)) out[r.metric.model_name || ""] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Real concurrency per model via Little's Law: request rate × mean latency,
 * i.e. rate(e2e_latency_sum) = GPU-seconds consumed per second. This is far
 * more reliable than vllm:num_requests_running, which can count idle batch
 * slots as "running" and overstates concurrency badly (we saw ~98 reported
 * for Gemma vs a true ~6.7 from Little's Law).
 */
async function fetchConcurrency() {
  try {
    const q = `sum by (model_name) (rate(vllm:e2e_request_latency_seconds_sum[${WINDOW}]))`;
    const result = await promQuery(q);
    const out = {};
    for (const r of result) out[r.metric.model_name || ""] = parseFloat(r.value[1]);
    return out;
  } catch {
    return {};
  }
}

/** Find the measured seconds for a profile, matching the model_name label. */
function lookup(measuredByName, match) {
  for (const [name, seconds] of Object.entries(measuredByName)) {
    if (name.includes(match)) return seconds;
  }
  return null;
}

// ─── models.ts update ───

function replaceField(src, modelId, field, newValue, comment) {
  const re = new RegExp(
    `("${escapeRe(modelId)}"\\s*:\\s*\\{[\\s\\S]*?${field}:\\s*)([0-9_.]+)(,?\\s*\n)`
  );
  const m = src.match(re);
  if (!m) return { src, found: false, old: null };
  const old = m[2];
  const updated = src.replace(re, `$1${newValue}, // ${comment}\n`);
  return { src: updated, found: true, old };
}

function updateModelsTs(measured) {
  const path = join(SRC_DIR, "models.ts");
  let src = readFileSync(path, "utf8");
  const report = [];

  for (const [modelId, info] of Object.entries(measured)) {
    if (info.seconds == null) {
      report.push({ modelId, status: "no-data" });
      continue;
    }
    const roundedSecs = Math.round(info.seconds * 10) / 10;
    const secsComment = `Measured p50 GPU time, queue excluded (${WINDOW}) via Prometheus ${info.engine}`;

    const r1 = replaceField(src, modelId, "defaultResponseTimeSeconds", String(roundedSecs), secsComment);
    if (!r1.found) {
      report.push({ modelId, status: "not-in-models.ts" });
      continue;
    }
    src = r1.src;

    let outOld = null;
    if (info.outputTokens != null) {
      const outTok = Math.round(info.outputTokens);
      const r2 = replaceField(
        src, modelId, "defaultOutputTokens", String(outTok),
        `Measured mean output tokens/req (${WINDOW}) via Prometheus`
      );
      if (r2.found) { src = r2.src; outOld = r2.old; }
    }

    report.push({
      modelId, status: "updated",
      oldSecs: parseFloat(r1.old), newSecs: roundedSecs,
      oldOut: outOld, newOut: info.outputTokens != null ? Math.round(info.outputTokens) : null,
      concurrency: info.concurrency,
    });
  }

  if (!DRY_RUN && report.some((r) => r.status === "updated")) writeFileSync(path, src);
  return report;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Main ───

async function main() {
  console.log("Calibrating model profiles from Prometheus");
  console.log(`  URL:    ${PROMETHEUS_URL}`);
  console.log(`  Window: ${WINDOW}`);
  console.log(`  Mode:   ${DRY_RUN ? "dry-run (no writes)" : "write to models.ts"}\n`);

  const [vllmP50, sglangP50, vllmOut, sglangOut, concurrency] = await Promise.all([
    fetchP50Latency("vllm").catch((e) => { console.warn("  vLLM latency failed:", e.message); return {}; }),
    fetchP50Latency("sglang").catch((e) => { console.warn("  SGLang latency failed:", e.message); return {}; }),
    fetchOutputTokens("vllm"),
    fetchOutputTokens("sglang"),
    fetchConcurrency(),
  ]);

  const measured = {};
  for (const [modelId, src] of Object.entries(MODEL_SOURCES)) {
    const byName = src.engine === "vllm" ? vllmP50 : sglangP50;
    const outByName = src.engine === "vllm" ? vllmOut : sglangOut;
    measured[modelId] = {
      engine: src.engine,
      seconds: lookup(byName, src.match),
      outputTokens: lookup(outByName, src.match),
      concurrency: lookup(concurrency, src.match),
    };
  }

  const report = updateModelsTs(measured);

  console.log("Model                          GPU(s)      Output-tokens    Conc   Status");
  console.log("─".repeat(78));
  for (const r of report) {
    if (r.status === "updated") {
      const secs = `${r.oldSecs}→${r.newSecs}`;
      const out = r.newOut != null ? `${r.oldOut}→${r.newOut}` : "  -";
      const conc = Number.isFinite(r.concurrency) ? r.concurrency.toFixed(1) : "-";
      const flag = r.newSecs > r.oldSecs * 1.5 ? "  ⚠ under-estimated" : r.newSecs < r.oldSecs / 1.5 ? "  ↓ over-estimated" : "";
      console.log(`${r.modelId.padEnd(30)} ${secs.padStart(11)} ${out.padStart(15)} ${conc.padStart(5)}  ✓${flag}`);
    } else {
      console.log(`${r.modelId.padEnd(30)} ${"  -".padStart(11)} ${"  -".padStart(15)} ${"  -".padStart(5)}  ${r.status}`);
    }
  }

  if (DRY_RUN) console.log("\nDry-run: no files written.");
  else console.log(`\n✓ models.ts updated (${report.filter((r) => r.status === "updated").length} profiles).`);
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  console.error("\nIs the port-forward up?");
  console.error("  kubectl --context berget-prod port-forward \\");
  console.error("    svc/rancher-monitoring-prometheus 19090:9090 -n cattle-monitoring-system &");
  process.exit(1);
});
