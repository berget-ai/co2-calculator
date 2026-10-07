#!/usr/bin/env python3
"""
Sanity test for the CO2 calculator's concurrency model (Claude review point 1).

Reconciles the calculator's per-request energy attribution against ACTUAL
measured node energy from DCGM over a trailing window. If the calculator were
correct, summing its attributed energy across all requests in the window should
approximate the real energy the hardware drew. If the calculator over-counts
by ~concurrency (because it fails to divide GPU energy + embodied by
concurrency), the attributed total will be ~concurrency times larger than the
measured total.

Also examines the idle-vs-load power curve (Colin's point): how much does a
node's power draw actually rise with concurrency? A node in a power-saving
state draws a baseline; we measure how power scales with concurrent load.

Usage:
  kubectl --context berget-prod port-forward svc/rancher-monitoring-prometheus 19090:9090 -n cattle-monitoring-system &
  python3 scripts/sanity-energy-reconciliation.py
Env: PROMETHEUS_URL (default http://localhost:19090), WINDOW (default 24h)
"""
import json, os, sys, urllib.parse, urllib.request

PROM = os.environ.get("PROMETHEUS_URL", "http://localhost:19090")
WINDOW = os.environ.get("WINDOW", "24h")

def q(query):
    url = f"{PROM}/api/v1/query?query={urllib.parse.quote(query)}"
    with urllib.request.urlopen(url, timeout=30) as r:
        d = json.load(r)
    if d.get("status") != "success":
        raise RuntimeError(f"Prom error: {d.get('error')}")
    return d["data"]["result"]

def scalar(result, default=0.0):
    try:
        return float(result[0]["value"][1])
    except Exception:
        return default

def by_label(result, label):
    out = {}
    for x in result:
        name = x["metric"].get(label, "?")
        try:
            out[name] = float(x["value"][1])
        except Exception:
            pass
    return out

print(f"Prometheus: {PROM}   Window: {WINDOW}\n")

# ---------------------------------------------------------------------------
# 1. REAL measured energy: integrate DCGM power over the window, per node.
#    DCGM_FI_DEV_TOTAL_ENERGY_CONSUMPTION is a counter in millijoules; rate it
#    and multiply by window seconds -> joules -> kWh. Simpler: avg power (W)
#    over window × window hours = Wh per GPU.
# ---------------------------------------------------------------------------
print("=== 1. REAL measured GPU energy (DCGM, per-GPU draw only) ===")
print("    (DCGM_FI_DEV_POWER_USAGE is GPU board power; it excludes chassis/CPU/NIC,")
print("     so this is a LOWER bound on true whole-node draw.)")
avg_power = by_label(q(f'avg by (Hostname) (avg_over_time(DCGM_FI_DEV_POWER_USAGE[{WINDOW}]))'), "Hostname")
gpu_count = by_label(q('count by (Hostname) (DCGM_FI_DEV_POWER_USAGE)'), "Hostname")
window_h = {"1h":1,"6h":6,"24h":24,"7d":168,"30d":720}.get(WINDOW, 24)

real_node_kwh = {}
for host, w in avg_power.items():
    n = gpu_count.get(host, 0)
    kwh = (w * n * window_h) / 1000.0
    real_node_kwh[host] = kwh
    print(f"  {host:28} {n:.0f} GPUs  avg {w:6.1f} W/GPU  -> {kwh:7.3f} kWh over {WINDOW}")

# ---------------------------------------------------------------------------
# 2. What the calculator ATTRIBUTES, per model (POST-FIX):
#    per-request energy = (idle + incremental) × gpuTime × gpusUsed / productiveBatch
#    total attributed   = per-request energy × num_requests_in_window
#    We mirror the fixed calculator: idle baseline + incremental load, both
#    divided by the productive batch (Little's-Law concurrency, clamped >= 1).
# ---------------------------------------------------------------------------
print("\n=== 2. Calculator-attributed energy per model (post-fix: idle+incremental / productiveBatch) ===")

# Per-model request rate and counts (e2e latency histogram count)
req_rate = by_label(
    q(f'sum by (model_name) (rate(vllm:e2e_request_latency_seconds_count[{WINDOW}]))'),
    "model_name")
# p50 GPU time (queue excluded) per model
p50 = by_label(
    q(f'histogram_quantile(0.5, sum by (le, model_name) (rate(vllm:request_inference_time_seconds_bucket[{WINDOW}])))'),
    "model_name")
# Little's Law concurrency (GPU-seconds consumed per wall-second)
concurrency = by_label(
    q(f'sum by (model_name) (rate(vllm:e2e_request_latency_seconds_sum[{WINDOW}]))'),
    "model_name")

# Map model -> node/hardware. From the fleet: Gemma + Mistral on H200 (airon),
# GLM/Kimi on B300 (6gai), small models on L4 (gpu-004). We only have vLLM
# metrics for the vllm-served models here; match by known serving cluster.
# Power heuristic mirrors calculator.ts: nodeIdle/gpuCount + (peak-idle)/gpuCount*0.25
HARDWARE = {
    "berget-airon-gpu-001": {"gpuCount": 8, "idle": 800, "peak": 6500},  # H200
    "berget-gpu-6gai-001":  {"gpuCount": 8, "idle": 800, "peak": 7000},  # B300
    "berget-gpu-004":       {"gpuCount": 4, "idle": 200, "peak": 400},   # L4
}

# Per-GPU idle baseline and incremental load, mirroring the fixed calculator.
def idle_per_gpu(host):
    h = HARDWARE.get(host)
    return (h["idle"]/h["gpuCount"]) if h else None

def incr_per_gpu(host):
    h = HARDWARE.get(host)
    return ((h["peak"]-h["idle"])/h["gpuCount"])*0.25 if h else None

print("\n  model                                  req/s    p50(s)  batch   req/win  attr(kWh)")
total_attr = 0.0
model_rows = []
for name, rate in sorted(req_rate.items()):
    if rate <= 0: continue
    t = p50.get(name)
    if not t: continue
    # Productive batch size: Little's-Law concurrency, clamped to >= 1.
    batch = max(1.0, concurrency.get(name, 1.0))
    n_req = rate * window_h * 3600
    # Assume H200 node for vllm models (adjust per known mapping below)
    host = "berget-airon-gpu-001"
    if "GLM" in name or "Kimi" in name:
        host = "berget-gpu-6gai-001"
    idle_w = idle_per_gpu(host)
    incr_w = incr_per_gpu(host)
    # Post-fix per-request energy: (idle + incremental) × gpuTime × gpusUsed / batch
    per_req_kwh = ((idle_w + incr_w) * (t/3600.0) * 1) / batch / 1000.0
    attr_kwh = per_req_kwh * n_req
    total_attr += attr_kwh
    model_rows.append((name, rate, t, batch, n_req, attr_kwh, host))
    print(f"  {name[:38]:38} {rate:7.4f}  {t:6.2f}  {batch:5.2f}  {n_req:8.0f}  {attr_kwh:9.4f}  ({host})")

# ---------------------------------------------------------------------------
# 3. The reconciliation
# ---------------------------------------------------------------------------
print("\n=== 3. RECONCILIATION ===")
# Which nodes host these models? Compare attributed vs measured on those nodes.
# NOTE: 'measured' here is GPU-board draw only (DCGM), a LOWER bound on the
# whole-node figure. Attributed should sit BELOW it once the chassis/CPU share
# and other tenants are accounted for — if it EXCEEDS measured GPU draw, the
# per-request model is over-attributing (the batch-sharing error).
for host, kwh in real_node_kwh.items():
    print(f"  measured GPU draw {host:18} {kwh:8.3f} kWh")
print(f"  attributed (vllm models, post-fix)   {total_attr:8.3f} kWh")
print()
print("  Expectation after the fix: attributed <= measured GPU draw.")
print("  If attributed >> measured, per-request energy is still over-attributed.")

# ---------------------------------------------------------------------------
# 4. Idle-vs-load power curve (Colin's point): power vs concurrency over time.
# ---------------------------------------------------------------------------
print("\n=== 4. IDLE vs LOAD power (does the node power-save when idle?) ===")
# Per-node power quantiles over the window: p10 (~idle floor) vs p90 (~loaded).
for host in avg_power:
    p10 = scalar(q(f'quantile_over_time(0.10, avg by (Hostname) (DCGM_FI_DEV_POWER_USAGE{{Hostname="{host}"}})[{WINDOW}:1m])'))
    p50p = scalar(q(f'quantile_over_time(0.50, avg by (Hostname) (DCGM_FI_DEV_POWER_USAGE{{Hostname="{host}"}})[{WINDOW}:1m])'))
    p90 = scalar(q(f'quantile_over_time(0.90, avg by (Hostname) (DCGM_FI_DEV_POWER_USAGE{{Hostname="{host}"}})[{WINDOW}:1m])'))
    p99 = scalar(q(f'quantile_over_time(0.99, avg by (Hostname) (DCGM_FI_DEV_POWER_USAGE{{Hostname="{host}"}})[{WINDOW}:1m])'))
    hw = HARDWARE.get(host, {})
    peak_per = (hw.get("peak",0)/hw.get("gpuCount",1)) if hw else 0
    idle_per = (hw.get("idle",0)/hw.get("gpuCount",1)) if hw else 0
    print(f"  {host:28} p10 {p10:6.1f}  p50 {p50p:6.1f}  p90 {p90:6.1f}  p99 {p99:6.1f} W/GPU   (spec idle~{idle_per:.0f} peak~{peak_per:.0f})")

print("\nDone.")
