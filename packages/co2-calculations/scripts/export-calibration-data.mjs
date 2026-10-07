// Aggregated calibration export from Prometheus -> data/calibration.json
// Exports ONLY aggregated statistics (p50, mean, concurrency, cache-hit rate).
// No raw request data, no user data, no prompts. Safe to commit publicly.
import { mkdirSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "calibration.json");

const P = "http://localhost:19090", W = "7d";
const q = async (query) => {
  const j = await (await fetch(`${P}/api/v1/query?query=${encodeURIComponent(query)}`)).json();
  if (j.status !== "success") throw new Error(j.error);
  return j.data.result;
};
const byName = (res) => Object.fromEntries(
  res.map(r => [r.metric.model_name || "", parseFloat(r.value[1])]).filter(([k, v]) => k && Number.isFinite(v))
);
const short = (name) => {
  const m = name.match(/models--(.+?)--(.+?)\/snapshots/);
  if (m) return `${m[1]}/${m[2]}`;
  return name;
};

// The Berget-hosted models we publish calibration data for.
const MODELS = {
  "google/gemma-4-31B-it": { engine: "vllm", match: "gemma-4-31B-it" },
  "mistralai/Mistral-Small-3.2-24B-Instruct-2506": { engine: "vllm", match: "Mistral-Small-3.2-24B" },
  "mistralai/Mistral-Medium-3.5-128B": { engine: "vllm", match: "Mistral-Medium-3.5-128B" },
  "zai-org/GLM-5.2": { engine: "sglang", match: "GLM-5.2" },
  "moonshotai/Kimi-K3": { engine: "sglang", match: "Kimi-K3" },
};
const lookup = (map, match) => {
  for (const [name, v] of Object.entries(map)) if (short(name).includes(match) || name.includes(match)) return v;
  return null;
};

(async () => {
  const [p50v, p50s, outv, outs, conc, cachev, caches] = await Promise.all([
    byName(await q(`histogram_quantile(0.5, sum by (le, model_name) (rate(vllm:request_inference_time_seconds_bucket[${W}])))`)),
    byName(await q(`histogram_quantile(0.5, sum by (le, model_name) (rate(sglang_e2e_request_latency_seconds_bucket[${W}])))`)),
    byName(await q(`sum by (model_name) (rate(vllm:generation_tokens_total[${W}])) / sum by (model_name) (rate(vllm:e2e_request_latency_seconds_count[${W}]))`)),
    byName(await q(`sum by (model_name) (rate(sglang_generation_tokens_total[${W}])) / sum by (model_name) (rate(sglang_e2e_request_latency_seconds_count[${W}]))`)),
    byName(await q(`sum by (model_name) (rate(vllm:e2e_request_latency_seconds_sum[${W}]))`)),
    byName(await q(`sum by (model_name) (rate(vllm:prefix_cache_hits_total[${W}])) / sum by (model_name) (rate(vllm:prefix_cache_queries_total[${W}]))`)),
    byName(await q(`avg by (model_name) (sglang_cache_hit_rate)`)),
  ]);

  const models = {};
  for (const [id, src] of Object.entries(MODELS)) {
    const v = src.engine === "vllm";
    const p50 = lookup(v ? p50v : p50s, src.match);
    const out = lookup(v ? outv : outs, src.match);
    const cache = lookup(v ? cachev : caches, src.match);
    const concurrency = v ? lookup(conc, src.match) : null; // Little's Law via vllm only
    if (p50 == null && out == null) continue;
    models[id] = {
      engine: src.engine,
      p50GpuTimeSeconds: p50 != null ? Math.round(p50 * 100) / 100 : null,
      meanOutputTokens: out != null ? Math.round(out) : null,
      concurrencyLittleLaw: concurrency != null ? Math.round(concurrency * 100) / 100 : null,
      kvCacheHitRate: cache != null ? Math.round(Math.max(0, Math.min(1, cache)) * 100) / 100 : null,
    };
  }

  const doc = {
    description: "Measured calibration data for Berget-hosted models, aggregated from production Prometheus metrics. Used to set the model profiles in src/models.ts. Aggregates only — no raw request data, no prompts, no user data.",
    window: W,
    exportedAt: new Date().toISOString(),
    metrics: {
      p50GpuTimeSeconds: "Median GPU compute time per request, queue wait excluded (vLLM request_inference_time; SGLang e2e latency, whose queue time is negligible).",
      meanOutputTokens: "Mean generated (output) tokens per request, including reasoning models' internal thinking tokens.",
      concurrencyLittleLaw: "Mean concurrent requests, derived via Little's Law (request rate x mean latency). vLLM models only.",
      kvCacheHitRate: "Fraction of prompt tokens served from the KV cache (0 where prefix caching is disabled).",
    },
    models,
  };

  mkdirSync(join(__dirname, "..", "data"), { recursive: true });
  writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n");
  console.log("Wrote", OUT);
  console.log(JSON.stringify(models, null, 2));
})();
