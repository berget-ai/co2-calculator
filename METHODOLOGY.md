# Methodology: AI CO₂ Impact Calculator for Berget AI

**Document Version**: 3.0  
**Date**: 2026-08-07  
**Authors**: Christian Landgren, Berget AI  
**External input**: Comments on specific sections (embodied amortisation, utilisation) from a researcher at the Stockholm Environment Institute (SEI); these were targeted suggestions, not a full-institute review or endorsement of the document.  
**License**: CC BY 4.0

**Changes in 3.0** (driven by external review and our own production reconciliation):
- §3.2a (new): GPU energy, idle baseline, server and embodied carbon are now divided by the productive batch size. The previous version credited each concurrent request with the full wall-clock GPU time, over-counting energy and embodied carbon by roughly the concurrency factor.
- §3.5: the per-GPU power draw is split into an idle baseline (measured, §8.2) and an incremental load; the idle baseline is now attributed rather than dropped.
- §4.1/§4.2: embodied per-GPU is the whole node ÷ GPU count (no "surrounding node" term on top of that, which would double-count the node's own components).
- §4.2b (new): a separate **supporting infrastructure** embodied term (databases, logging/storage, network gear) is included — it is genuinely distinct hardware, not part of the GPU node's chassis or measured power draw, and is needed to reconcile against real-world consumption. Region-independent.
- §2.2: the cooling comparison is corrected — Texas spends ~5.3× more energy on cooling per unit of IT work than Sweden (previously mis-stated as "57%").
- §6.2: the worked example is generated from the same code as the live calculator (`scripts/generate-methodology-example.mjs`), so document and site figures agree.

---

## Executive Summary

This document details the methodology behind Berget AI's CO₂ emissions calculator for AI inference. The calculator estimates the **operational and hardware-embodied** carbon footprint of a single inference query — GPU compute energy, idle baseline, infrastructure overhead, cooling and amortised manufacturing emissions — running on Berget's 100% fossil-free infrastructure in Sweden. **Model training is excluded by default** (the option exists in the API but is off in the app); Section 5 explains why, and what it would add. We say this plainly up front because the system boundary must match what the numbers actually include.

We adopt the **core SCI formula** from the Green Software Foundation's Software Carbon Intensity for AI (SCI-AI) specification [9]:

```
SCI = (E × I) + M, per R
```

Where:
- `E` = energy consumed by the software (kWh)
- `I` = carbon intensity of the grid powering it (g/kWh)
- `M` = embodied emissions (manufacturing + disposal carbon of the hardware)
- `R` = the functional unit (we use **per query**, not per FLOP/token/parameter as SCI-AI suggests for providers)

**Deviations from SCI-AI**: We adopt only the core formula above. We do not employ the full SCI-AI lifecycle analysis (Inception → Design & Development → Deployment → Operation & Monitoring → End of Life) — we focus on the Operation & Monitoring phase. Our functional unit is **per query** (arguably more intuitive for end-users than per FLOP or per training token). Our embodied emissions amortisation differs from the SCI-AI `M = TE × (TiR/EL) × (RR/ToR)` formula (see Section 4.1 for our approach).

Additional adaptations:
- Swedish grid conditions and Berget's Power Purchase Agreements
- Time-of-day marginal carbon intensity variation
- Multi-modal inference (text, embedding, speech)
- Hardware procurement conditions (new vs. refurbished)
- Production-calibrated concurrency and response time models
- **Measured production values** for Berget's own models (GPU time, output tokens, concurrency, cache-hit rate), pulled from our Prometheus metrics rather than estimated — see Section 3.0

**Key finding**: A single query to Gemma 4 31B on Berget's infrastructure produces approximately **24.7 mg CO₂e** in total emissions excluding training, compared to ~120.5 mg on the US average grid. For **operational** emissions only (energy consumed during inference) the reduction is **~62×** (1.57 mg vs 97.3 mg), demonstrating the impact of grid decarbonisation; including the grid-independent embodied cost, the total reduction is **~4.9×**. Because the Swedish grid is so clean, the embodied share of hardware manufacturing and supporting infrastructure is the dominant part of the remaining total (~94%).

**Why the difference between ~62× and ~4.9×?** Operational emissions (compute + idle + server + cooling energy) depend on the grid carbon intensity, so Sweden's clean grid gives a ~62× advantage. However, embodied emissions (hardware manufacturing) are **independent of the inference grid** — they depend on where the hardware was manufactured, not where inference runs. Since embodied emissions are the same regardless of inference location, they dilute the operational advantage to ~4.9× when comparing total emissions (training excluded from both figures). We report both numbers rather than only the larger one.

---

## 1. System Boundary

We adopt the **Consumer boundary** from SCI-AI, covering:

| Component | Included | Notes |
|-----------|----------|-------|
| **Operational energy (compute)** | ✅ incremental GPU + server during inference | Measured wall-clock GPU time ÷ productive batch (§3.2a) |
| **GPU idle baseline** | ✅ standby draw attributed per request | Measured via DCGM (§3.5, §8.2a) |
| **Datacenter overhead** | ✅ PUE factor, grid-specific | 1.15 for Swedish free-air cooling (§2.2) |
| **Hardware embodied (GPU node)** | ✅ whole-node ÷ GPU count, amortised ÷ batch | §4.2 |
| **Supporting infra embodied** | ✅ DB/logging/network, amortised ÷ batch | Separate from node chassis; region-independent (§4.2b) |
| **Training amortisation** | ⚠️ Optional, **off by default** in the app | See Section 5 for rationale and what it adds |
| **Network transmission** | ❌ Excluded | Assumed negligible for co-located API |
| **End-user device** | ❌ Excluded | Out of scope per SCI-AI |

---

## 2. Carbon Intensity: Grid Regions

### 2.1 Grid Composition

Berget's datacenters draw electricity from the Swedish national grid with 100% fossil-free Power Purchase Agreements (PPAs). However, the calculator uses the **Swedish national grid carbon intensity** (8 g CO₂/kWh), not the PPA-adjusted intensity. This is because:

1. **PPAs are financial instruments, not physical power routing** — they certify that renewable energy is produced somewhere on the grid, but the actual electrons consumed by the datacenter come from the grid mix
2. **Conservative accounting** — using grid intensity rather than PPA intensity avoids undercounting emissions
3. **Comparability** — all regions in the calculator use grid intensity, enabling apples-to-apples comparisons

**The 8 g figure — source, method and date.** Rather than derive our own production-mix weighted average (which is sensitive to whether hydro/wind are counted at 0 operational or at lifecycle ~10-12 g, and to how upstream infrastructure is allocated), we adopt an externally-published, dated figure so a reader can check it against a known methodology. We use **8 g CO₂e/kWh**, the location-based, production-mix average for Sweden reported by **Electricity Maps (2024 annual average)** [1a]. This is a consumption-side, location-based intensity (no green-tariff or PPA adjustment), consistent with how we treat every other region.

Two honesty notes:

- **Location-based vs lifecycle.** A pure *operational* Swedish mix (hydro, wind, nuclear at ~0 direct emissions) computes to ~2-3 g; a full *lifecycle* figure (including plant construction and fuel supply, hydro ~10, wind ~12, nuclear ~5, solar ~40 g) computes to ~12 g. Our 8 g sits between these — it reflects Electricity Maps' location-based accounting, which includes some but not all upstream. We flag this because it is the single number a procurement team will cross-check, and the answer changes with the methodology chosen.
- **No double-counting with time-of-day.** We deliberately do **not** inflate the average further for "marginal peak demand" here, because Section 3.7 already applies a separate time-of-day peak factor (×1.15). Transmission/distribution losses (~6%) are within the source figure's own uncertainty and are not added separately.

**Note on PPAs**: While Berget holds PPAs for 100% fossil-free electricity, we do not use a PPA-adjusted intensity of 0 g/kWh. This would undercount the actual grid-level emissions associated with electricity consumption. The PPA ensures that renewable energy is added to the grid equivalent to our consumption, but the calculator reports the physical grid intensity for transparency and comparability.

### 2.2 Climate-Advantageous Cooling

A significant but often overlooked factor is **datacenter cooling efficiency**, which varies dramatically by climate:

| Climate | Cooling Method | PUE | Cooling energy per unit of IT work |
|---------|---------------|-----|------------------------------------|
| **Nordics (Sweden, Norway)** | Free-air cooling | 1.15 | 0.15 (baseline) |
| Quebec | Free-air cooling | 1.15 | 0.15 |
| France | Mixed (free-air + mechanical) | 1.30 | 0.30 |
| Ireland | Temperate maritime | 1.25 | 0.25 |
| Germany | Mechanical cooling required | 1.35 | 0.35 |
| US Average | Mechanical cooling | 1.50 | 0.50 |
| US East | Heavy mechanical cooling | 1.60 | 0.60 |
| Texas | Extreme cooling needs | 1.80 | 0.80 |
| India | Extreme cooling + humidity | 2.00 | 1.00 |

*The last column is the cooling energy as a fraction of the IT energy (PUE − 1), which is the quantity that actually scales with climate. Total facility energy is PUE × IT energy.*

**Sources for PUE values**:
- **Nordics (1.15)**: Uptime Institute Global Data Center Survey 2024 [2] — Nordic datacenters consistently achieve PUE 1.1-1.2 due to free-air cooling
- **US Average (1.50)**: Uptime Institute 2024 [2] — industry average PUE has plateaued at ~1.55 since 2022
- **Hot climates (1.80-2.00)**: IEA "Electricity 2024" report [1] — PUE degrades significantly in hot/humid climates requiring mechanical cooling
- **Quebec (1.15)**: Hydro-Québec datacenter efficiency program — comparable to Nordics due to cold climate
- PUE values for other regions are interpolated based on climate conditions and the Uptime Institute range

**Key insight**: Sweden's cold climate eliminates the need for energy-intensive mechanical cooling. This gives Nordic datacenters a **structural efficiency advantage** beyond just the clean grid:
- Sweden: PUE 1.15 (cooling adds only 15% overhead)
- Texas: PUE 1.80 (cooling adds 80% overhead)
- India: PUE 2.00 (cooling adds 100% overhead)

Measured correctly against the IT load, the cooling energy itself (not total facility energy) is **0.15 vs 0.80 of IT energy** — i.e. a GPU in Texas spends **~5.3× more energy on cooling** than the same GPU in Sweden, or equivalently Sweden uses **~81% less cooling energy**. (Total facility energy, PUE × IT, is 1.80/1.15 ≈ 1.57× higher in Texas — a different, smaller figure that is easy to confuse with the cooling-specific one.) This is before accounting for the carbon-intensity difference.

### 2.3 Water Usage for Cooling

Water consumption for datacenter cooling varies by climate (see Appendix E for details). Nordic datacenters use **zero water** for cooling (free-air cooling), while datacenters in hot climates can consume 1.5-2.0 L/kWh IT energy for evaporative cooling. This is reported as contextual information alongside CO₂ emissions but is not included in the carbon footprint calculation.

**Note**: Water figures refer to **datacenter cooling water consumption** (evaporative cooling, cooling towers), not water used for hydroelectric or nuclear power generation upstream in the grid.

### 2.4 Supported Grid Regions

The calculator supports 15 grid regions with IEA emission factors and climate-specific PUE:

| Region | Key | Intensity (g/kWh) | PUE | Characteristics |
|--------|-----|-------------------|-----|-----------------|
| Sweden | `sweden` | 8 | 1.15 | Hydro, nuclear, wind |
| Norway | `norway` | 15 | 1.15 | Hydro-dominant |
| France | `france` | 30 | 1.30 | Nuclear-dominant |
| Quebec | `quebec` | 40 | 1.15 | Hydro |
| Ireland | `ireland` | 150 | 1.25 | Mixed, data center hub |
| Germany | `germany` | 280 | 1.35 | 20% renewable |
| US Average | `usa` | 380 | 1.50 | Mixed |
| US East (PJM) | `useast` | 400 | 1.60 | Gas + nuclear + coal |
| Texas (ERCOT) | `texas` | 420 | 1.80 | Gas + wind |
| California (CAISO) | `california` | 450 | 1.50 | Gas + solar |
| Japan | `japan` | 550 | 1.60 | Mixed, post-Fukushima |
| India | `india` | 700 | 2.00 | Coal-heavy |
| Poland | `poland` | 750 | 1.40 | Coal-dominant |
| China | `china` | 850 | 1.60 | Coal-heavy |
| Global Average | `global` | 500 | 1.50 | IEA world average |

### 2.5 Time-of-Day Variation

Each grid region has a demand curve (24 hours) and adjustment factors:

```
CI_eff = CI_base × factor
```

Where:
- `CI_base` = the region's average carbon intensity (g/kWh) from IEA data [1]
- `factor` = a multiplier that adjusts for time-of-day demand:
  - `lowPeriodFactor` (e.g., 0.70 for Sweden) — applied when demand is below `lowPeriodThreshold`, typically at night when renewable generation exceeds demand
  - `peakPeriodFactor` (e.g., 1.15 for Sweden) — applied during peak demand hours when fossil peaker plants may be dispatched
- `lowPeriodThreshold` = the demand weight (0-1 scale) below which the low period factor applies. A threshold of 0.20 means hours with demand < 20% of peak (typically 00:00-05:00) use the low factor.

**Source for factors**: These are simplified approximations based on:
- IEA Electricity 2024 report [1] — time-of-day carbon intensity patterns
- ENTSO-E transparency platform — Nordic grid demand curves
- EPA eGRID [8] — US regional demand patterns

The factors are conservative: actual marginal emissions can vary more dramatically, but these simplified factors avoid over-claiming precision where grid dispatch data is not publicly available.

| Region | Low Period Factor | Peak Period Factor | Low Threshold |
|--------|-------------------|-------------------|---------------|
| Sweden | 0.70 | 1.15 | 0.20 |
| Germany | 0.80 | 1.15 | 0.20 |
| US Average | 0.85 | 1.10 | 0.20 |
| China | 0.90 | 1.10 | 0.20 |

---

## 3. Operational Carbon: Response-Time Method

The key methodological insight is that **per-request GPU time** is more accurate for estimating per-request energy consumption than theoretical throughput (tokens/second) because:

1. **Throughput varies enormously** with temperature, sampling strategy, prompt caching, and KV-cache pressure
2. **Response time is directly measurable** via API latency metrics (time-to-first-token + streaming duration)
3. **Concurrency must be accounted for** — a request taking 5 seconds on a GPU shared by 8 clients only consumes 5/8 = 0.625 seconds of exclusive GPU time

### 3.0 Measured production values (Berget-operated models)

For the models Berget AI operates ourselves, the baseline quantities in this section are **measured**, not estimated. Because we own the hardware and the serving stack, we export per-model metrics to Prometheus (vLLM and SGLang) and read the operating point directly:

| Quantity | Source metric | What we take |
|---|---|---|
| Baseline GPU time | `vllm:request_inference_time_seconds` / `sglang_e2e_request_latency_seconds` | **p50**, queue wait **excluded** |
| Output tokens/request | `vllm:generation_tokens_total` ÷ request count | mean |
| Concurrency | derived via **Little's Law** (request rate × mean latency) | mean |
| Cache-hit rate | `vllm:prefix_cache_hits_total` ÷ `vllm:prefix_cache_queries_total` | fraction of prompt served from KV cache |

Two measurement choices are worth stating explicitly:

- **GPU time excludes queueing.** A request's energy is the time the model is *actually computing*, not the time it spends waiting for a free slot. We therefore use `request_inference_time` (pure GPU work) rather than end-to-end latency. Where only end-to-end latency is available (SGLang) the queue time is negligible (~4 ms) so end-to-end ≈ GPU time.
- **Concurrency is derived, not read.** The raw `num_requests_running` gauge can count idle batch slots as "running" and badly overstates true concurrency (we observed ~98 reported vs ~6.7 implied for our busiest model). We instead derive it via Little's Law: concurrency = request rate × mean latency.

The calibration is automated in `packages/co2-calculator/scripts/calibrate-from-prometheus.mjs`, which re-reads these metrics over a trailing window and rewrites the `defaultResponseTimeSeconds`, `defaultOutputTokens`, `defaultConcurrency` and `cachedPromptFraction` fields in `packages/co2-calculator/src/models.ts`. Running it moved our baseline GPU times substantially (in both directions) relative to the editorial estimates they replaced — which is exactly the point of measuring.

The measured aggregates themselves are published in `packages/co2-calculator/data/calibration.json` (exported by `scripts/export-calibration-data.mjs`) so the numbers behind the model profiles can be inspected directly. The file contains only per-model aggregates — p50 GPU time, mean output tokens, concurrency and cache-hit rate — never raw request data, prompts or user data.

Models we do **not** operate (closed frontier models such as Claude, GPT-5, Gemini) have no Prometheus data; their parameters remain EcoLogits estimates and their concurrency falls back to a generic default, as described in Section 3.2.

### 3.1 Token-Based Time Adjustment

Response time scales with token count, but sub-linearly. This is because tokens are processed in parallel during the prefill phase (input tokens are batched), and the decode phase has fixed overhead per step regardless of sequence length. We model this with a square root function, which captures diminishing returns: doubling the token count does not double the processing time.

```
tokenRatio = (inputTokens + outputTokens) / (defaultInputTokens + defaultOutputTokens)
tokenAdjustedTime = measuredResponseTimeSeconds × √tokenRatio
```

Where:
- `tokenRatio` = how many more tokens this query has compared to the baseline (default) query
- `tokenAdjustedTime` = the estimated GPU processing time for this specific query, adjusted from the baseline response time based on token count
- `√tokenRatio` = square root models sub-linear scaling (diminishing returns from parallel token processing)

### 3.2 Concurrency Impact

When many requests hit the server simultaneously, each request takes longer due to resource contention (queueing, memory bandwidth, KV cache pressure):

```
if concurrency ≤ 8:
    concurrencyAdjustedTime = tokenAdjustedTime
else:
    delayFactor = 1 + log₂(concurrency/8) × 0.15
    concurrencyAdjustedTime = tokenAdjustedTime × delayFactor
```

**Example**: At concurrency=16, delayFactor = 1 + 1 × 0.15 = 1.15 (15% longer)

**Trade-off**: Higher concurrency increases per-request GPU time (each request takes longer), but the fixed server infrastructure cost (chassis power, PUE overhead) is divided among all concurrent requests (see Section 3.6). This creates a trade-off:
- Higher concurrency → more GPU time per request → higher per-request GPU CO₂
- Higher concurrency → lower infrastructure cost per request → lower per-request server CO₂

**Note on the 0.15 coefficient**: This factor is empirically calibrated against production vLLM deployments. It represents the marginal latency increase per doubling of concurrency beyond the baseline of 8 concurrent requests. The logarithmic form reflects diminishing marginal delay: as concurrency increases, each additional request adds progressively less queueing/contention overhead. Our production measurements could not constrain this coefficient more tightly (true concurrency is low and bursty for most models, so the curve is under-determined in the data), so we keep it as a documented approximation rather than a fitted value.

**Deriving concurrency instead of passing it.** The `concurrency` parameter is optional. When it is omitted, the calculator derives it from the model's measured production concurrency (Section 3.0) scaled by the time-of-day traffic pattern (Section 3.7): a popular model at peak hour shares the node with more requests than a quiet model at night. For models we do not operate, concurrency falls back to a generic default of 8. This keeps the common case data-driven while still allowing an explicit value for scenario analysis.

### 3.2a Sharing the GPU: the wall-clock correction

This is the single most consequential accounting choice in the model, and the one an outside reviewer is most likely to check, so we state it precisely.

**What the metric measures.** vLLM's `request_inference_time_seconds` is **wall-clock residency time**, not exclusive GPU time. Verified against the source (`vllm/v1/metrics/stats.py`): `inference_time = last_token_ts − scheduled_ts`, a monotonic-clock interval stamped once per finished request. With continuous batching, N requests resident on the same GPU each record the **full** duration they were resident — even though they shared the device. Our production data confirms the overlap directly: for the busiest model, `rate(request_inference_time_seconds_sum)` is ~10 GPU-seconds per wall-second, i.e. ~10 requests are concurrently in the RUNNING phase. A single GPU can only deliver 1 GPU-second per wall-second, so those 10 requests are physically sharing it.

**The physical consequence.** A GPU is one device with one power draw. Batching does not multiply the energy (or the manufacturing carbon already spent); it amortises them across the batch. If we credited each of the 10 concurrent requests with the full wall-clock duration's worth of GPU energy and embodied carbon, we would count the same GPU-second — and the same manufacturing footprint — ten times over.

**The correction.** Every shared cost is therefore divided by the number of requests genuinely sharing the GPU (the *productive batch size*), and applied to **this request's own** GPU time:

```
sharedPerRequest = sharedRate × (thisRequestGpuTime / productiveBatch)
```

Applied uniformly to: incremental GPU compute energy, the GPU idle baseline, the server chassis energy, and embodied amortisation. We take the productive batch size to be the measured end-to-end concurrency (Little's Law: request rate × mean latency), which counts the requests resident on the node — exactly the denominator that divides a shared fixed cost.

**Conservation check.** Because each request bears its *own* token-adjusted GPU time, a short request bears little and a long reasoning request bears proportionally more. Summed across the real (right-skewed) request mix, the attributed embodied carbon converges to the GPU's full manufacturing amortisation: with the measured mean GPU time the attributed and actual amortisation rates match to within ~16% (the residual is the p50/mean skew of using a single representative request). The same holds for energy, reconciled against measured node draw in Section 8.2.

This is also why the on-prem case (Section 3.2c) is so much heavier per request: with concurrency forced to 1 there is no batch to share any of these costs across.

### 3.2b Caching (KV prefix cache)

When the KV prefix cache is enabled, a repeated prompt prefix does not need to be re-prefilled: the model skips the parallel (prefill) phase for the cached share of the input and goes straight to decoding. That shortens the request's GPU time, and because each request then occupies the GPU for less time, more requests fit on the same hardware — so the fixed server and embodied costs are shared across more of them. Caching is therefore a *compounding* lever: it reduces per-request GPU energy **and** increases the sharing denominator at the same time.

We model this by scaling the effective input tokens with the model's measured cache-hit rate (Section 3.0):

```
effectiveInputTokens = inputTokens × (1 − cachedPromptFraction)   // caching enabled
effectiveInputTokens = inputTokens                                  // caching disabled
```

`cachedPromptFraction` is the measured fraction of prompt tokens served from the KV cache in production (e.g. ~0.6 for a well-cached chat workload, 0 where prefix caching is disabled). When caching is turned off (`caching: false`) the full prompt is prefilled every request. Reasoning models are the clearest case: they emit many internal "thinking" tokens before the answer, so anything that avoids re-prefilling a long shared system prompt has an outsized effect on their GPU time — which is why cache-hit rate and output-token volume are both measured per model.

We deliberately expose caching as a *scenario* rather than a user default. Configuring KV caching well on your own deployment requires the right serving framework, cache management and spare KV memory, so it is an advantage a dedicated provider can offer that a typical on-prem setup cannot easily replicate.

### 3.2c Deployment: shared vs on-prem

The `deployment` parameter models who owns the infrastructure:

- **`shared` (default)**: the node is shared with other tenants, so the fixed server infrastructure and embodied hardware costs are divided across the concurrent requests (Section 3.6).
- **`onprem`**: you run the model on your own server. Concurrency is forced to 1, so the node's **entire** infrastructure and embodied footprint lands on your queries alone.

The on-prem case captures a real accounting point: a privately-owned GPU is paid for — in energy and in amortised manufacturing carbon — for the whole month, **whether or not it is used**. Spread over a lightly-loaded month, that fixed cost per request can exceed the operational energy by an order of magnitude. This is the quantitative form of the intuition that a busy shared GPU usually beats a private one that mostly waits; Section 3.6 shows how the fixed costs are otherwise shared.

### 3.3 GPU Allocation Heuristic (Memory-Aware)

Models are allocated GPUs based on **memory requirements**, not just parameter count. This is critical because different GPUs have vastly different memory capacities:

| GPU | Memory per GPU | Max Model Size (FP16) |
|-----|---------------|----------------------|
| NVIDIA H100 | 80 GB HBM3 | ~64B parameters |
| NVIDIA H200 | 141 GB HBM3e | ~112B parameters |
| AMD MI300X | 192 GB HBM3 | ~153B parameters |
| NVIDIA L4 | 24 GB GDDR6 | ~19B parameters |

**Memory calculation:**
```
modelMemoryGb = parameters × bytesPerParam × overheadFactor / (1024³)
// 1024³ = 1,073,741,824 — converts bytes to GiB (gibibytes)
bytesPerParam = 2.0 for FP16, 0.5 for INT4
overheadFactor = 1.2 (KV cache, activations, etc.)
```

**Note on overheadFactor**: The 1.2× overhead accounts for memory required beyond model weights: KV cache (scales with sequence length and concurrency), activation buffers, and framework overhead (CUDA context, memory fragmentation). This is a heuristic based on production vLLM deployments — actual overhead varies from 1.1× (short sequences, low concurrency) to 1.5× (long sequences, high concurrency with large KV cache). For models with very long context windows (128K+ tokens), this factor may underestimate memory needs.

**GPU allocation:**
```
gpusNeeded = ceil(modelMemoryGb / gpuMemoryGb)
gpusAllocated = min(gpusNeeded, gpusOnNode)
```

**Example**: A 120B model in FP16 needs ~268 GB memory:
- H100 (80 GB): needs 4 GPUs (268 / 80 = 3.35 → 4)
- H200 (141 GB): needs 2 GPUs (268 / 141 = 1.90 → 2)
- MI300X (192 GB): needs 2 GPUs (268 / 192 = 1.40 → 2)

**Note on GPU count and emissions**: Using GPUs with more memory can reduce the number of GPUs needed per request. However, fewer GPUs does not automatically mean lower emissions — GPUs with more memory typically consume more power and may have higher embodied carbon. The emissions impact depends on:
1. **Operational**: Per-GPU power draw (higher-memory GPUs often have higher TDP) vs. the power saved by using fewer GPUs
2. **Embodied**: Per-GPU manufacturing carbon (higher-memory GPUs may have more HBM, which is carbon-intensive to manufacture)

Our calculator accounts for both factors by using hardware-specific power and embodied carbon values. The net emissions effect of using fewer, more powerful GPUs depends on the specific hardware configuration and cannot be generalised without these assumptions stated explicitly.

### 3.4 Power Calculation

GPU power is interpolated between idle and peak based on **utilisation**.

**Key finding from LLMCO2** (Fu et al., 2024): Inference utilisation is significantly lower than training due to the memory-bound decode phase. Their measurements on A100 show **10-40%** of peak throughput for typical inference workloads, compared to 50%+ for training.

**Important caveat**: LLMCO2 also warns that utilisation is "highly variable" and that equation-based models using simple parameter-based heuristics are "inaccurate." Utilisation depends on batch size, prompt length, KV cache pressure, sampling strategy, and framework-level optimisations — not just model size.

**Reference**: Fu, Z., Chen, F., Zhou, S., Li, H., & Jiang, L. (2024). LLMCO2: Advancing Accurate Carbon Footprint Prediction for LLM Inferences. arXiv:2410.02950. https://arxiv.org/abs/2410.02950

**Alternative GPU energy model from EcoLogits** (Rincé & Banse, 2025): Using the ML.ENERGY Leaderboard dataset, EcoLogits fits a parametric model for GPU energy consumption per output token:

```
E_gpu(token) = α × e^(β × B) × P_active + γ
```

Where:
- `P_active` = active parameters (total for dense, per-expert for MoE)
- `B` = batch size (default 64)
- `α = 1.17×10⁻⁶`, `β = -1.12×10⁻²`, `γ = 4.05×10⁻⁵`

This model is **linear in parameters** and **exponential in batch size**, validated against production vLLM deployments on NVIDIA H100 GPUs.

**Reference**: Rincé, S., & Banse, A. (2025). EcoLogits: Evaluating the Environmental Impacts of Generative AI. Journal of Open Source Software, 10(111), 7471. https://doi.org/10.21105/joss.07471

**Our utilisation model**:

We use a **fixed midpoint of 25%** (the center of the 10-40% range from LLMCO2) rather than parameter-based tiers. This is a conservative heuristic that:
1. Acknowledges the 10-40% range from LLMCO2 measurements
2. Avoids unsupported claims that parameter count determines utilisation
3. Can be refined with EcoLogits' parametric model when more data is available

The uncertainty (±15 percentage points) is documented in Section 9 (Limitations & Uncertainties).

We split the per-GPU power draw into its two physically distinct parts — an **idle baseline** and an **incremental load** — because they are attributed differently:

```
utilization = 0.25   // Midpoint of 10-40% range from LLMCO2

idlePerGpuWatts        = nodeIdleWatts / gpuCount
incrementalPerGpuWatts = ((nodePeakWatts - nodeIdleWatts) / gpuCount) × utilization
```

**Example** (H200 node, 8 GPUs):
- Idle baseline: 800W total → **100W per GPU**, drawn around the clock regardless of load
- Incremental at 25% utilisation: (5,000 − 800) / 8 × 0.25 = **131W per GPU**, drawn only while processing

*Previous versions used parameter-based tiers (15%/25%/35% based on model size). This was removed following SEI review (Babis, 2026) noting that LLMCO2 advises against primitive estimations of utilisation based on model attributes.*

### 3.5 Energy Calculation (compute + idle baseline)

**Incremental compute energy** — the extra power drawn while actually processing, shared across the productive batch (Section 3.2a):

```
gpuTimeHours = concurrencyAdjustedTime / 3,600
gpuEnergyKwh = (incrementalPerGpuWatts × gpuTimeHours × gpusUsed) / (productiveBatch × 1,000)
```

**GPU idle baseline** — the standby draw the node burns simply by being powered on, attributed to this request's share of it. Our own DCGM measurements (Section 8.2) show this is substantial and is **not** a deep sleep state: an idle B300 draws ~122 W per GPU at 0% utilisation (spec ~125 W), an idle L4 ~40 W. A node that is mostly waiting still spends most of its energy here, so dropping it would silently remove the dominant term for lightly-loaded models. It is shared across the same productive batch:

```
idleEnergyKwh = (idlePerGpuWatts × gpuTimeHours × gpusUsed) / (productiveBatch × 1,000)
```

### 3.6 Server Infrastructure

Server chassis power is a fixed per-node cost, divided across the productive batch sharing the node (Section 3.2a):

```
serverEnergyKwh = (chassisWatts × gpuTimeHours) / (1,000 × productiveBatch)
```

### 3.7 PUE Overhead

PUE (Power Usage Effectiveness) varies by climate and cooling method (see Section 2.2 for the full PUE table and sources). It applies to **all** IT energy — compute, idle and server:

```
overheadCO2 = (gpuOperationalCO2 + gpuIdleCO2 + serverOperationalCO2) × (PUE - 1)
```

For Sweden: `overheadCO2 = operationalCO2 × 0.15` (15% overhead)
For Texas: `overheadCO2 = operationalCO2 × 0.80` (80% overhead)

This climate advantage compounds with the clean grid — Swedish inference has both lower carbon intensity AND lower cooling overhead (quantified in Section 2.2).

### 3.8 Operational Carbon Total

```
gpuOperationalCO2   = gpuEnergyKwh  × effectiveIntensity   // incremental compute
gpuIdleCO2          = idleEnergyKwh × effectiveIntensity   // idle baseline
serverOperationalCO2 = serverEnergyKwh × effectiveIntensity
totalOperationalCO2 = gpuOperationalCO2 + gpuIdleCO2 + serverOperationalCO2 + overheadCO2
```

---

## 4. Embodied Carbon

### 4.1 Hardware Manufacturing Emissions

Manufacturing emissions are amortised **per GPU-second over projected lifetime utilisation**, then allocated to this request's share of the productive batch (Section 3.2a):

```
projectedActiveSeconds = GPU_LIFETIME_SECONDS × PROJECTED_LIFETIME_UTILIZATION
embodiedPerGpuGrams = (embodiedPerGpuKg × 1,000) / projectedActiveSeconds
embodiedCO2 = embodiedPerGpuGrams × gpuTimeSeconds × gpusUsed / productiveBatch
```

The division by `productiveBatch` is essential (Section 3.2a): embodied carbon is a fixed one-off cost, and with continuous batching N concurrent requests share the same wall-clock residency. Crediting each of them with the full residency would count the same manufacturing footprint N times over. Each request instead bears its own GPU time's share — short requests a little, long requests proportionally more — and the total across the real request mix conserves the GPU's full manufacturing footprint.

Where:
- `GPU_LIFETIME_SECONDS` = 5 × 365 × 24 × 3,600 = 157,680,000 seconds
- `PROJECTED_LIFETIME_UTILIZATION` = 0.50 (50% active over 5 years)
- `projectedActiveSeconds` = 78,840,000 seconds

**Why projected lifetime utilisation?** Embodied emissions have already occurred with certainty — the GPU was manufactured regardless of how much it is used. To ensure the full embodied carbon is accounted for over the hardware's lifetime, we amortise based on the GPU's projected active time, not its actual per-query utilisation.

If we amortised per actual query GPU-time (which reflects only 10-35% utilisation), less than half of embodied emissions would be accounted for over 5 years. This would systematically undercount the manufacturing carbon footprint.

**Projected utilisation of 50%**: GPUs in inference deployments typically run at 30-70% utilisation over their lifetime (batching, multiple tenants, scheduled maintenance). We use 50% as a conservative midpoint.

**Two different "utilisation" figures — don't confuse them.** The **25%** in Section 3.4 is *compute intensity while working*: when the GPU is processing a batch, it draws ~25% of its peak power (the memory-bound decode phase keeps it well below peak). The **50%** here is *share of calendar time active*: over its 5-year life the GPU is processing (rather than idle/standby) about half the time. They multiply to very different effects and answer different questions — one sets the power draw during work, the other sets over how much useful output the manufacturing cost is spread. A reader could otherwise read them as contradicting each other.

**Example** (H200, 1,000 kg embodied, 2.5s GPU time, 1 GPU, productive batch 6):
- Per active second: (1,000 × 1,000) / 78,840,000 = **0.0127 g CO₂/s**
- For 2.5s GPU time on 1 GPU shared by 6: 0.0127 × 2.5 / 6 = **0.0053 g CO₂**

**Note**: This approach was adopted following SEI review (Babis, 2026): *"The simplest tweak seems to be dividing total embodied emissions by projected lifetime utilisation in GPU-seconds."* The further division by the productive batch (Section 3.2a) was added after review noted that the un-shared form counts the same manufacturing carbon once per concurrent request.

### 4.2 Hardware Configurations

| Hardware | GPUs | Node Idle | Node Peak | Embodied/GPU | Chassis |
|----------|------|-----------|-----------|--------------|---------|
| NVIDIA H200 | 8 | 800W | 6,500W | 1,000 kg | 1,200W |
| NVIDIA H100 | 8 | 700W | 6,500W | 850 kg | 1,200W |
| AMD MI300X | 8 | 1,000W | 7,000W | 1,000 kg | 1,500W |
| NVIDIA A100 | 8 | 600W | 3,200W | 1,200 kg | 1,000W |
| NVIDIA L4 | 4 | 200W | 400W | 300 kg | 600W |
| Refurbished H200 | 8 | 800W | 6,500W | 0 kg | 1,200W |

**Note on Embodied Carbon Values — what "per GPU" includes:**
NVIDIA and AMD do NOT publish per-GPU embodied carbon LCAs. The `Embodied/GPU` values above are the **whole node's** manufacturing footprint divided by its GPU count — so each per-GPU figure already carries that GPU's share of the node's CPU, DRAM, SSD, chassis, PSUs and NIC. They are derived from server-level product carbon footprint reports (best-estimate ~7 t for an 8-GPU H200 node → ~875 kg/GPU, rounded up to a conservative 1,000 kg). These estimates have ±30-50% uncertainty.

### 4.2b Supporting infrastructure (databases, logging, network)

Separate from the GPU node's own chassis (already inside `Embodied/GPU`) is the **supporting infrastructure** that serves a node but is not part of its measured power draw: database servers, logging/object-storage servers and network gear (top-of-rack switches, firewalls). This is genuinely distinct hardware — not a double-count of node components — and must be included for the totals to reconcile against real-world consumption. It is roughly equivalent across regions, so it does not change the *relative* Sweden-vs-rest comparison, only the absolute level.

We allocate **4,000 kg CO₂e per 8-GPU node** (≈ 3× 1U servers at 1,000 kg, 2× firewalls at 300 kg, 2× switches at 200 kg) and **2,500 kg per small (L4) node**, amortised over projected lifetime active time and divided across the node's concurrent requests — the same method as the GPU embodied term. This is a coarse allocation and a stated candidate for refinement against inventory data.

**Exception — NVIDIA H200 (Supermicro AS-8125GS-TNHR):**
Component-level estimates are derived from two sources:
1. **NVIDIA HGX H100 PCF** (1,312 kg CO₂e) — the ONLY vendor-published Product Carbon Footprint for GPU accelerator boards [4]. Used as the baseline for GPU-board emissions.
2. **Boavizta component model** (https://www.boavizta.org/) — open-source LCA tool for estimating embodied carbon of IT hardware components (DRAM, SSD, CPU, chassis).

| Component | Embodied CO₂ | Notes |
|-----------|-------------|-------|
| NVIDIA HGX H200 8-GPU baseboard | 1.6-2.2 t CO₂e | Extrapolated from H100 PCF with HBM scaling (see calculation below) |
| 1.5 TB DDR5 RDIMM (24×64 GB) | 2.0-4.6 t CO₂e | Boavizta component model |
| SSD (2×7.68 TB + boot) | 0.5-1.0 t CO₂e | Boavizta component model |
| 2× EPYC CPU | 0.1-0.3 t CO₂e | CPU portion |
| Chassis, motherboard, PSUs, fans, risers, assembly | 0.8-1.8 t CO₂e | Supermicro AS-8125GS-TNHR: 8U, 75.3 kg |
| Basic NIC / management / 10-100G | 0.05-0.2 t CO₂e | Network infrastructure |
| 8×400G/NDR NICs (optional) | +0.4-0.9 t CO₂e | Full RDMA networking |
| **Total server (without 400G NICs)** | **5-10 t CO₂e** | Best estimate: **7 t CO₂e** |
| **Total server (with 400G NICs)** | **5.5-10.5 t CO₂e** | Conservative: **8 t CO₂e** |
| **Per GPU** | **625-1,250 kg** | Conservative: **1,000 kg** |

**H200 GPU-board calculation** (extrapolated from NVIDIA HGX H100 PCF [4]):

The NVIDIA HGX H100 PCF reports 1,312 kg CO₂e cradle-to-gate for the 8-GPU baseboard (8× H100 + 640 GB HBM3). Of this, 546 kg is attributed to HBM3 memory (per NVIDIA's PCF breakdown).

```
H100 baseboard: 1,312 kg total (8× H100 + 640 GB HBM3, of which 546 kg is memory)
H200 has: 8×141 GB = 1,128 GB HBM3e (vs 640 GB HBM3 on H100)

H200 estimate = (non-memory portion) + (memory portion scaled by capacity)
             = (1,312 - 546) + 546 × (1,128 / 640)
             = 766 + 963
             ≈ 1,729 kg CO₂e for the 8-GPU baseboard
```

The 8-GPU baseboard alone extrapolates to ≈1,729 kg (216 kg per GPU-board, board only). But the calculator's per-GPU figure must carry the **whole node**, since the node is what we deploy and power. The full-server best estimate is ~7 t for the node, which is ~875 kg per GPU once the CPU, DRAM, SSD, chassis and NIC are divided across the 8 GPUs. We round that up to a conservative **1,000 kg per GPU**, all-inclusive. (The 216 kg GPU-board-only figure is shown here only to document the extrapolation; it is **not** what the calculator uses, and no further node term is added on top of the 1,000 kg.)

**Exception — AMD MI300X (Supermicro AS-8125GS-TNMR2):**
We have a detailed component-level estimate for this specific configuration:

| Component | Embodied CO₂ | Notes |
|-----------|-------------|-------|
| 8× AMD MI300X + UBB + 1.5 TB HBM3 | 2.0-4.0 t CO₂e | Triangulated from NVIDIA HGX H100 PCF (1,312 kg) |
| 1.5 TB DDR5 RDIMM (24×64 GB) | 2.0-4.6 t CO₂e | Boavizta component model |
| SSD (2×7.68 TB + 960 GB) | 0.4-1.2 t CO₂e | Boavizta component model |
| Chassis, motherboard, PSUs, fans, NICs, cables | 0.8-1.8 t CO₂e | Supermicro AS-8125GS-TNMR2: 8U, 75.3 kg |
| 2× AMD EPYC 9654 (96 cores, 360W TDP) | 0.1-0.3 t CO₂e | CPU portion |
| **Total server** | **5-12 t CO₂e** | Best estimate: **7 t CO₂e** |
| **Per GPU** | **625-1,500 kg** | Conservative: **1,000 kg** |

**Exception — NVIDIA H100 (Supermicro AS-8125GS-TNHR):**
NVIDIA HGX H100 PCF = 1,312 kg CO₂e cradle-to-gate (8× H100 + 640 GB HBM3)
This is the ONLY vendor-published PCF for GPU accelerator boards found.
Per GPU: 1,312 kg / 8 = **164 kg** (GPU-board only)
Full server estimate: ~5.5-7.5 t CO₂e total → **700-950 kg per GPU**

Key data points from vendor server LCAs:
- Dell R750 (2020, A100 option): 2,181-3,880 kg CO2 total embodied
- HP ProLiant DL380 gen10+ (2021, GPU option): 2,181 kg CO2 embodied
- Dell C4130 (2016, GPU server): 12,700 kg CO2 total embodied
- **NVIDIA HGX H100 PCF**: 1,312 kg CO₂e cradle-to-gate (8× H100 + 640 GB HBM3)

Academic references:
- Gupta et al. "Chasing Carbon", HPCA 2021: Manufacturing dominates lifecycle emissions for data center hardware
- Ji et al. SCARIF, ISVLSI 2024: Chip area × process node methodology for estimating accelerator carbon

**Recommended actions:**
1. Request PAIA/PCF cradle-to-gate from Supermicro/NVIDIA for H200 (AS-8125GS-TNHR)
2. Request PAIA/PCF cradle-to-gate from Supermicro/AMD for MI300X (AS-8125GS-TNMR2)
3. NVIDIA H100 PCF is already public (1,312 kg), use as baseline for comparisons

### 4.3 Refurbished Hardware

Refurbished GPUs have **zero embodied carbon** attributed to inference because:
- Manufacturing emissions were already amortised in their first lifecycle
- Extending hardware life defers new manufacturing

**Impact on total emissions**: The exact reduction depends on the model, grid, and hardware configuration. For a typical configuration (Gemma 4 31B on H200 in Sweden, training excluded), embodied emissions account for roughly **94%** of the total — because the grid is so clean and the request so short. Note that the refurbished choice zeroes only the GPU node's own manufacturing share (§4.2); the supporting-infrastructure share (§4.2b) is assumed to be a running service cost and remains. Setting embodied to zero (refurbished) therefore removes that share. The exact percentage varies by grid (cleaner grids show a higher embodied share) and model size.

**Refurbished = 0 kg rests on an explicit premise**: the hardware has already passed its ~5-year amortisation life, so its manufacturing footprint is fully spent in its first lifecycle. If you buy *two-year-old* hardware this does not hold — some embodied carbon remains to amortise — and since the embodied term is the dominant share of a clean-grid total, this assumption is the one most worth challenging. It is a convention, stated openly, not a measurement.

---

## 5. Training Amortisation

### 5.1 Training CO₂ Sources

Training emissions are estimated from disclosed or extrapolated data. The values below are **tonnes of CO₂e** and are the same figures the calculator uses (`totalTrainingCO2Grams` in `src/models.ts`, stored in grams); they are reproduced here so the document and the code do not drift apart. (An earlier version of this table mislabelled tonnes as kilograms and listed models no longer in the catalogue — a unit error of roughly 250× on some rows.)

| Model | Training CO₂ (tonnes) | Source |
|-------|----------------------|--------|
| Mistral Small 24B | 3,200 | Mistral AI environmental report |
| Mistral Medium 128B | 17,000 | SCI-AI extrapolation |
| GLM 5.2 (753B MoE) | 52,000 | Parameter-scaling estimate (undisclosed) |
| Gemma 4 31B | 4,100 | Google DeepMind sustainability |
| Kimi K3 (2.8T MoE) | 140,000 | Parameter-scaling estimate (undisclosed) |
| Claude Opus 4.5 | 33,500 | EcoLogits parameter estimate (undisclosed) |
| Claude Sonnet 4.5 | 22,000 | EcoLogits parameter estimate (undisclosed) |
| GPT-5 | 15,000 | EcoLogits parameter estimate (undisclosed) |
| GPT-5 Pro | 180,000 | EcoLogits parameter estimate (undisclosed) |
| Gemini 2.5 Pro | 100,000 | EcoLogits parameter estimate (undisclosed) |
| Mistral Large 123B | 16,000 | EcoLogits / Mistral AI environmental report |
| E5 Embedding | 0.28 | Microsoft Research |
| Whisper Large v3 | 1.2 | OpenAI GPU-day estimates |

Disclosed figures are preferred where they exist (Mistral, Google, Microsoft); the rest are parameter-scaling estimates and carry the highest uncertainty.

For models without disclosed training data, we estimate using a simplified scaling formula:

```
CO₂_training (tonnes) ≈ P_params × 0.15 × T_hours × CI_training / 1e6
```

Where:
- `P_params` = number of parameters (in billions). This is the model's total parameter count (e.g., 70 for a 70B model)
- `0.15` = estimated GPU power per billion parameters during training (kW/B params). This is derived from observed training power consumption: a 70B model typically trains on ~256 H100 GPUs drawing ~700W each = ~180 kW total, or ~2.6 kW per billion parameters. The 0.15 factor accounts for the fact that not all GPUs are at peak power throughout training (checkpointing, evaluation, debugging)
- `T_hours` = estimated training duration in hours. This is inferred from model size and publicly available training compute estimates (e.g., Chinchilla scaling laws suggest ~20 tokens per parameter for optimal training)
- `CI_training` = carbon intensity of the grid where training occurred (g/kWh). When unknown, we assume US average (380 g/kWh) as a conservative estimate
- `/ 1e6` = converts grams to tonnes

**Important**: This formula has ±50% uncertainty (see Section 9). Disclosed training data is always preferred when available.

**Amortisation note**: Training emissions are amortised using `estimatedLifetimeQueries` (the projected total queries over the model's operational lifetime), not `lifetimeQueries` (actual queries to date). This ensures that early in a model's lifecycle, when few queries have been made, the per-query training cost is not inflated.

### 5.2 Amortisation

```
C_training_per_query = CO₂_training_grams / estimatedLifetimeQueries
```

Default: `estimatedLifetimeQueries = 100,000,000` (100M queries)

**Basis for default**: The 100M default is a conservative estimate based on:
- OpenRouter API statistics for popular models (e.g., GPT-4o Mini has >10B lifetime requests as of 2025)
- Typical model lifecycle: models are typically deployed for 12-24 months before being replaced by newer versions
- For models with available usage data (OpenRouter API), we use actual lifetime query counts instead of the default
- The default is intentionally conservative (lower than typical) to avoid undercounting per-query training cost

---

## 6. Total Carbon per Query

### 6.1 Complete Formula

```
C_total = C_gpuCompute + C_gpuIdle + C_server + C_overhead + C_embodiedGpu + C_training
```

Where (all shared costs divided by the productive batch, Section 3.2a):
- `C_gpuCompute` = incremental GPU compute energy × grid CI / batch
- `C_gpuIdle` = GPU idle-baseline energy × grid CI / batch
- `C_server` = server infrastructure energy × grid CI / batch
- `C_overhead` = (C_gpuCompute + C_gpuIdle + C_server) × (PUE − 1)
- `C_embodiedGpu` = manufacturing CO₂ amortised per GPU-second × this request's GPU time / batch
- `C_training` = total training CO₂ / expected lifetime queries

### 6.2 Example Calculation

**Query**: Gemma 4 31B, 600 tokens in / 482 tokens out, Sweden, 14:00, NVIDIA H200 hardware, shared deployment, caching enabled. (Training excluded, as in the app.)

**This example is generated from the same code as the live calculator** (`scripts/generate-methodology-example.mjs`, run against `dist/index.js`), so the figures here and the published site figure are one and the same. Token counts, baseline time, productive batch and cache-hit rate come from production Prometheus metrics (Section 3.0); only the grid, hardware and climate factors are modelled.

At 14:00 the effective grid intensity is the base CI scaled by the day factor: `8 × 1.15 ≈ 9.2 g/kWh` (Section 3.7), applied to all IT energy (compute, idle and server).

| Component | Calculation | Result |
|-----------|-------------|--------|
| Baseline GPU time | measured p50, queue excluded | 2.02 s |
| Effective input tokens | 600 × (1 − 0.33 cache) | 402 |
| Token ratio | (402+482)/(600+482) | 0.82 |
| Token-adjusted time | 2.02 × √0.82 | 1.83 s |
| GPU batch (Little's Law) | measured; divides GPU costs | 3 |
| Node batch (whole request load) | divides chassis + infra | 6 |
| Effective intensity | 8 × 1.15 (day) | 9.2 g/kWh |
| GPUs used | 31B params, H200 (141 GB) | 1 |
| Incremental GPU power | (peak−idle)/8 × 0.25 | 178 W |
| Idle baseline per GPU | idle/8 | 100 W |
| GPU compute CO₂ | incremental energy × 9.2 / 3 | 277 µg |
| GPU idle CO₂ | idle energy × 9.2 / 3 | 156 µg |
| Server CO₂ | chassis energy × 9.2 / 6 | 933 µg |
| Cooling overhead | (compute+idle+server) × 0.15 | 205 µg |
| Embodied GPU | 0.0127 g/s × 1.83 s / 3 | 7.72 mg |
| Embodied supporting infra | 0.0507 g/s × 1.83 s / 6 | 15.44 mg |
| **Total (excl. training)** | | **≈ 24.7 mg** |

**Two denominators, kept separate.** The GPU-related fixed costs (compute energy, idle standby, GPU embodied) are divided by the **GPU batch** — the requests genuinely resident on this model's GPU, measured via Little's Law (3 for Gemma). The node-level fixed costs (server chassis energy and the supporting-infrastructure embodied term) are divided by the **node batch** — the whole node's request load (6), which is broader because the supporting stack serves every request on the node, not just one model's GPU batch. Using one denominator for both would understate the GPU share; we keep them separate so the boundary is explicit (Section 3.2a).

**Note**: Operational emissions only (compute + idle + server + cooling, excluding embodied and training) are **≈ 1.57 mg**. Embodied carbon is **~94%** of this total, dominated by the *supporting infrastructure* term (databases, logging/object-storage and network gear, Section 4.2b) — the GPU node's own manufacturing (7.72 mg) is the smaller embodied share. This supporting infrastructure is genuinely separate from the GPU node's chassis and measured power draw, is needed for the totals to reconcile against real-world consumption, and is roughly equivalent across regions, so it does not change the *relative* Sweden-vs-rest comparison.

---

## 7. Comparison Helpers

The calculator converts CO₂ to relatable equivalents using a **fixed reference intensity** (EU average ≈ 300 g/kWh) for the *everyday-equivalence* helpers, so they read consistently regardless of which grid the user selects:

```
ledBulbSeconds = (co2Grams / 300) / 0.01 kW × 3,600
carKm = co2Grams / 120
phoneChargePercent = (co2Grams / 15) × 100
flightPermille = (co2Grams / 90,000) × 1,000
```

**Why a fixed reference for these?** Using the selected grid's intensity would give counter-intuitive results for an everyday equivalence — a cleaner grid would show *longer* bulb times for the same CO₂ amount. The fixed reference answers: *"What does this CO₂ amount to in everyday terms?"*

**The microwave comparison is deliberately different.** It is not an everyday-equivalence helper but a **clean-baseline contrast**: we price both the AI request and the microwave on **Sweden's grid (8 g/kWh)** — the cleanest we offer:

```
microwaveSeconds = co2Grams / ((0.8 kW / 3,600) × 8 g/kWh)
```

This anchors every activity at the *lowest available* CO₂ cost rather than normalising to a dirtier grid where the same request would look smaller. The deliberate consequence is that a tiny CO₂ amount maps to *many* seconds of microwaving — because on a clean grid a second of anything costs almost nothing. Read it as "this many clean seconds", not "a large footprint". The surrounding copy states this explicitly so the larger second-count is not misread as a larger footprint.

---

## 8. Validation & Benchmarks

### 8.1 Validation approach — and an honest caveat

We deliberately do **not** present a "matches published research within 20%" table, for two reasons. First, the figures most often cited for per-token inference energy come from *training* papers (e.g. Patterson et al. 2021) or from models with different system boundaries, batch sizes and units, so a like-for-like row is not defensible. Second, any single "within X%" cell implies a precision the inputs do not support (Section 9 gives ±30-50% on embodied and ±15 points on utilisation).

The strongest validation available to us is instead **reconciliation against our own measured power draw**, because we own the hardware and meter it directly (Section 8.2a). A secondary, external cross-check is a like-for-like comparison against the EcoLogits parametric model for the same model and configuration; we present that as a range rather than a point, because EcoLogits' coefficients are fitted on H100 ML.ENERGY data and carry their own uncertainty.

### 8.2a Reconciliation against measured node energy

The decisive test of the model is whether its *attributed* energy, summed over all requests in a window, matches the energy the hardware *actually drew* (measured with DCGM). This is the check that catches the batch-sharing error of Section 3.2a: if we failed to divide by the productive batch, attributed energy would exceed measured draw by roughly the concurrency factor.

Using production Prometheus + DCGM over a 24 h window (script: `scripts/sanity-energy-reconciliation.py`):

- **GPU time is wall-clock and overlapping.** For the busiest model, `rate(request_inference_time_seconds_sum)` is ~10 GPU-s per wall-second — about 10 requests concurrently in the RUNNING phase on hardware that can only deliver ~1 GPU-s per wall-second each. This is the direct measurement that forces the Section 3.2a division.
- **Idle baseline is real and large.** An idle B300 draws ~122 W per GPU at 0% utilisation (spec ~125 W); an idle L4 ~40 W. Nodes do **not** drop to near-zero when unloaded, which is why the idle baseline is attributed (Section 3.5) rather than ignored.
- **After the correction**, the calculator's attributed operational energy sits *below* total measured node draw, as it should: the node also runs system services, other tenants and baseline load that a per-request model does not claim. Before the correction, attributed energy for a busy model could exceed the node's physical draw — the signature of the double-count.

We publish the reconciliation script so the reader can re-run it against the same metrics.

### 8.2 Berget Specific

On Berget's infrastructure, Gemma 4 31B, 600 tokens in / 482 tokens out, shared deployment, caching enabled. **Figures generated from the calculator** (`scripts/generate-methodology-example.mjs`):

| Component | Sweden (8 g/kWh, PUE 1.15) | US Average (380 g/kWh, PUE 1.50) |
|-----------|---------------------------|----------------------------------|
| GPU compute | 277 µg | 13.16 mg |
| GPU idle baseline | 156 µg | 7.39 mg |
| Server | 933 µg | 44.33 mg |
| Cooling overhead | 205 µg | 32.44 mg |
| **Operational subtotal** | **≈ 1.57 mg** | **≈ 97.32 mg** |
| Embodied GPU | 7.72 mg | 7.72 mg |
| Embodied supporting infra | 15.44 mg | 15.44 mg |
| **TOTAL (excl. training)** | **≈ 24.73 mg** | **≈ 120.47 mg** |

**Key insight**: operational emissions (the energy consumed during inference: compute + idle + server + cooling) are **~62×** lower on the Swedish grid, because they scale directly with grid carbon intensity. Embodied carbon is **independent of the grid** — it depends on hardware manufacturing, not where inference runs — so it does not change between columns. That holds for both embodied terms: the GPU node's own manufacturing (7.72 mg) and the supporting infrastructure (15.44 mg — databases, logging/storage and network gear, Section 4.2b), which is roughly equivalent wherever the service runs.

For a fair comparison of **operational efficiency only** (excluding the fixed embodied cost):
- Sweden: **≈ 1.57 mg** operational CO₂e
- US Average: **≈ 97.32 mg** operational CO₂e
- **Reduction: ~62×**

For **total emissions** (including embodied, excluding training):
- Sweden: **≈ 24.73 mg** total CO₂e
- US Average: **≈ 120.47 mg** total CO₂e
- **Reduction: ~4.9×**

The two ratios answer different questions, and we report both deliberately: **~62×** is the operational (grid-driven) advantage; **~4.9×** is the all-in advantage once the grid-independent embodied cost (GPU node + supporting infrastructure) is included. Quoting only the larger number would overstate the case.

**Climate advantage compounds the grid advantage**: Sweden's free-air cooling (PUE 1.15 → 0.15 cooling per unit of IT work) vs US mechanical cooling (PUE 1.50 → 0.50) means ~3.3× less cooling energy, in addition to the cleaner grid.

---

## 9. Limitations & Uncertainties

1. **Training data**: Extrapolated values may vary ±50% from actuals. Disclosed data preferred where available.
2. **GPU power**: Measured power vs. rated TDP can differ by 20-40% depending on workload characteristics.
3. **Embodied carbon**: Manufacturer LCAs are often proprietary; proxy data used.
4. **Time-of-day**: Marginal CI factors are simplified from complex power market dynamics.
5. **Model-specific efficiency**: Architecture factors are heuristic, calibrated against benchmarks but not exact.
6. **Concurrency model**: Logarithmic delay factor is empirically fitted; actual behavior varies by framework.

---

*See Appendix D for the complete reference list.*

---

## Appendix A: Model-Specific Parameters

| Model | Params | FLOPs/Token | Arch. Efficiency | Power Draw | Training CO₂ (tonnes) |
|-------|--------|-------------|------------------|------------|----------------------|
| Mistral Small 24B | 24B | 36 GFLOP | 0.78 | 300W | **3,200** |
| Mistral Medium 128B | 128B | 210 GFLOP | 0.82 | 800W | **17,000** (est.) |
| GLM 5.2 (753B MoE) | 753B | 1,000 GFLOP | 0.65 | 1,000W | **52,000** (est.) |
| Gemma 4 31B | 31B | 62 GFLOP | 0.80 | 400W | **4,100** |
| Kimi K3 (2.8T MoE) | 2.8T | 2,400 GFLOP | 0.60 | 1,400W | **140,000** (est.) |
| E5 Embedding | 560M | 0.7 GFLOP | 0.65 | 100W | **0.28** |
| Whisper Large v3 | 1.55B | 2.2 GFLOP | 0.70 | 120W | **1.2** |

**Note**: Training CO₂ values are in **tonnes** and match the calculator's `totalTrainingCO2Grams` (Section 5.1); they are estimated from disclosed or extrapolated data. Values marked (est.) have higher uncertainty (±50%). An earlier version of this appendix mislabelled the training column as kilograms — a unit error of roughly 250× on some rows; the figures above are tonnes.

## Appendix B: Swedish Grid Hourly Demand Curve

| Hour | Demand Weight | Effective CI (g/kWh) | Generation Mix |
|------|-------------|---------------------|----------------|
| 00-05 | 0.02-0.05 | 5.6-6.4 | Hydro + wind surplus |
| 06-11 | 0.05-0.50 | 6.8-9.2 | Ramping demand |
| 12-17 | 0.40-0.55 | 9.2-10.4 | Peak, potential import |
| 18-23 | 0.10-0.40 | 7.2-8.8 | Decreasing demand |

## Appendix C: Implementation Notes

### C.1 Code Structure

The calculator is implemented in TypeScript with the following modules:

- `types.ts` — Core interfaces (ModelProfile, HardwareConfig, GridRegion, etc.)
- `models.ts` — Model profiles with training CO₂ data
- `hardware.ts` — Hardware configurations and demand curves
- `grids.ts` — Grid regions with IEA emission factors
- `calculator.ts` — Main calculation engine

### C.2 Key Constants

```typescript
const GPU_LIFETIME_SECONDS = 5 * 365 * 24 * 3_600; // 157,680,000
const PROJECTED_LIFETIME_UTILIZATION = 0.50;       // 50% active over 5 years
// PUE is NOT a global constant — it is per-grid (grid.typicalPue, §2.2),
// e.g. 1.15 Sweden, 1.80 Texas. The cooling overhead is (PUE − 1) × IT CO₂.
```

### C.3 Component Breakdown

The calculator returns a detailed breakdown:

```typescript
interface InferenceResult {
  totalCO2Grams: number;
  components: {
    gpuOperational: InferenceComponent;      // Incremental GPU compute energy × grid CI / batch
    gpuIdle: InferenceComponent;             // GPU idle baseline × grid CI / batch
    serverOperational: InferenceComponent;   // Server energy × grid CI / batch
    datacenterOverhead: InferenceComponent;  // PUE overhead (grid-specific, e.g. ×0.15 Sweden)
    embodiedGpu: InferenceComponent;         // GPU embodied amortised / batch
    embodiedOther: InferenceComponent;       // Other compute embodied (currently 0 — see §4.2)
    trainingAmortised: InferenceComponent;   // Training CO₂ / lifetime queries
  };
  totalEnergyKwh: number;
  gpusAllocated: number;
  effectiveIntensityGPerKwh: number;
  timing: { isLowPeriod, periodFactor, hourOfDay };
}
```

---

## Appendix D: References

### Grid & Infrastructure

[1] **IEA (2024).** "Electricity Emissions Factors by Country". International Energy Agency. https://www.iea.org/data-and-statistics

[1a] **Electricity Maps (2024).** "Sweden — annual average carbon intensity, location-based production mix". https://app.electricitymaps.com/zone/SE (used for the 8 g CO₂e/kWh Swedish figure; see §2.1 for the location-based vs lifecycle caveat)

[2] **Uptime Institute (2024).** "Global Data Center Survey 2024". https://uptimeinstitute.com/resources/research-and-reports

[8] **EPA (2023).** "eGRID Database". U.S. Environmental Protection Agency. https://www.epa.gov/egrid

### Inference Energy & Carbon Footprint

**Fu, Z., Chen, F., Zhou, S., Li, H., & Jiang, L. (2024).** LLMCO2: Advancing Accurate Carbon Footprint Prediction for LLM Inferences. *arXiv:2410.02950*. https://arxiv.org/abs/2410.02950

*Key finding*: Inference GPU utilisation is 10-40% of peak (significantly lower than training), due to memory-bound decode phase. The paper also warns that equation-based models using simple parameter-based heuristics are inaccurate.

**Rincé, S., & Banse, A. (2025).** EcoLogits: Evaluating the Environmental Impacts of Generative AI. *Journal of Open Source Software, 10(111)*, 7471. https://doi.org/10.21105/joss.07471

*Key finding*: Parametric GPU energy model (α × e^(β×B) × P_active + γ) validated against production vLLM deployments.

**Podder, S., Date, H., & Murthy, S. (2026).** Green prompt engineering for sustainable generative AI. *Environmental Science and Ecotechnology, 30*, 100684. https://doi.org/10.1016/j.ese.2026.100684

*Key finding*: Optimized prompting reduces LLM inference energy and CO₂ emissions by 32-48%.

**Luccioni, S. et al. (2024).** "Power Hungry Processing: Watts Driving the Cost of AI Deployment?". FAccT 2024. arXiv:2311.16863.

### Training CO₂ & Model Data

[5] **Meta AI. (2024).** Llama 3.1 Model Card. https://ai.meta.com/blog/meta-llama-3-1/

**Mistral AI. (2024).** Mistral Small 3.2 Release. https://mistral.ai/news/

**Google DeepMind. (2024).** Gemma 4 Technical Report. https://ai.google.dev/gemma

[6] **OpenAI. (2024).** GPT-OSS: Open Source Language Models. https://openai.com/index/oss/

[7] **Patterson, D. et al. (2022).** "The Carbon Footprint of Machine Learning Training Will Plateau, Then Shrink". IEEE Computer.

[8] **Patterson, D. et al. (2021).** "Carbon Emissions and Large Neural Network Training". arXiv:2104.10350.

### Hardware & Embodied Carbon

[3] **Dell Technologies (2023).** "Life Cycle Assessment of PowerEdge Servers".

[4] **NVIDIA (2024).** "NVIDIA Product Sustainability" / HGX H100 PCF Summary. https://images.nvidia.com/aem-dam/Solutions/documents/HGX-H100-PCF-Summary.pdf

[10] **Gupta, U. et al. (2021).** "Chasing Carbon: The Elusive Environmental Footprint of Computing". HPCA 2021. arXiv:2011.02839.

[11] **Ji, S. et al. (2024).** "SCARIF: A Framework for Sustainable Computer Architecture Research". ISVLSI 2024. arXiv:2401.06270.

**Boavizta.** Open-source IT hardware LCA tool. https://www.boavizta.org/

### Software Carbon Intensity

[9] **Green Software Foundation (2024).** "Software Carbon Intensity for AI (SCI-AI) Specification v2.0". https://sci.greensoftware.foundation/

### Water Usage

**Siddik, M. et al. (2021).** "The environmental footprint of data centers in the United States." *Environmental Research Letters*. https://doi.org/10.1088/1748-9326/ac8e40

**US Department of Energy.** "Data Center Energy Usage Report 2024."

---

## Appendix E: Water Usage for Datacenter Cooling

Water consumption for datacenter cooling varies dramatically by climate. This data is reported alongside CO₂ emissions for context but is not included in the carbon footprint calculation.

**Important**: These figures refer to **datacenter cooling water consumption** (evaporative cooling, cooling towers), not water used for hydroelectric or nuclear power generation upstream in the grid.

| Climate | Cooling Method | Water (L/kWh IT) |
|---------|---------------|------------------|
| **Nordics (Sweden, Norway)** | Free-air cooling | **0.0** |
| Quebec | Free-air cooling | **0.0** |
| France | Mixed | 0.2 |
| Ireland | Temperate maritime | 0.3 |
| Germany | Cooling towers | 0.5 |
| US Average | Mechanical + evaporative | 0.8 |
| US East | Cooling towers | 1.0 |
| Texas | Evaporative (dry climate) | 1.5 |
| California | Coastal + mechanical | 0.7 |
| India | Evaporative (water scarcity) | 2.0 |

**Sources**: 
- Siddik, M. et al. (2021). "The environmental footprint of data centers in the United States." *Environmental Research Letters*, 21, 034001. https://doi.org/10.1088/1748-9326/ac8e40
- US Department of Energy. "Data Center Energy Usage Report 2024."
- Nature (2021). "The environmental footprint of data centers."

**Key insight**: Nordic datacenters use **zero water** for cooling because free-air cooling doesn't require evaporation. In contrast, a datacenter in Texas or India can consume **1.5-2.0 liters of water per kWh** of IT energy — a significant environmental concern in water-scarce regions.

For a single inference query using 0.0001 kWh:
- Sweden: **0 ml** water
- Texas: **0.15 ml** water
- India: **0.20 ml** water

While small per query, at scale (millions of queries) this becomes significant: 1 million queries in India = **200 liters** of water vs **0 liters** in Sweden.

---

*Document maintained by Berget AI. For questions: engineering@berget.ai*
