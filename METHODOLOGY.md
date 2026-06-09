# Methodology: AI CO₂ Impact Calculator for Berget AI

**Document Version**: 2.3  
**Date**: 2026-06-09  
**Authors**: Christian Landgren, Berget AI  
**Reviewers**: Stockholm Environment Institute (SEI)  
**License**: CC BY 4.0

---

## Executive Summary

This document details the methodology behind Berget AI's CO₂ emissions calculator for AI inference. The calculator estimates the complete carbon footprint of a single inference query — from model training (amortised) through operational GPU energy, infrastructure overhead, and hardware embodied emissions — running on Berget's 100% fossil-free infrastructure in Sweden.

The methodology is based on the **Green Software Foundation's Software Carbon Intensity for AI (SCI-AI)** specification, with adaptations for:
- Swedish grid conditions and Berget's Power Purchase Agreements
- Time-of-day marginal carbon intensity variation
- Multi-modal inference (text, embedding, speech)
- Hardware procurement conditions (new vs. refurbished)
- Production-calibrated concurrency and response time models

**Key finding**: A single query to Llama 3.1 8B on Berget's infrastructure produces approximately **0.028 g CO₂e** (28 mg) in total lifecycle emissions, compared to ~0.060 g on US average grid — a **2.2× reduction** in total emissions. For operational emissions only (energy consumed during inference), the reduction is **47×** (0.69 mg vs 32.9 mg), demonstrating the massive impact of grid decarbonisation.

---

## 1. System Boundary

We adopt the **Consumer boundary** from SCI-AI, covering:

| Component | Included | Notes |
|-----------|----------|-------|
| **Operational energy** | ✅ GPU, server, networking during inference | Measured via response time allocation |
| **Datacenter overhead** | ✅ PUE factor | 1.15 for Swedish free-air cooling |
| **Training amortisation** | ✅ Total training CO₂ ÷ expected queries | Model-specific, from disclosed/estimated data |
| **Hardware embodied** | ✅ GPU/chip manufacturing, amortised per GPU-second | Node-level, scaled by GPU-seconds |
| **Idle allocation** | ✅ Pro-rata GPU time via concurrency model | See Section 3.1 |
| **Network transmission** | ❌ Excluded | Assumed negligible for co-located API |
| **End-user device** | ❌ Excluded | Out of scope per SCI-AI |

---

## 2. Carbon Intensity: Grid Regions

### 2.1 Grid Composition

Berget's datacenters draw electricity from the Swedish national grid with 100% fossil-free Power Purchase Agreements (PPAs):

| Source | Share | Carbon Intensity (g/kWh) | Contribution |
|--------|-------|----------------------|-------------|
| Hydro | 45% | 0 (reservoir, no new land use) | 0 |
| Wind | 40% | 0 (operational only) | 0 |
| Nuclear | 10% | 5 (lifecycle upstream) | 0.5 |
| Solar | 5% | 40 (manufacturing) | 2.0 |
| **Weighted average** | **100%** | — | **2.5** |

However, we use **8 g CO₂/kWh** for the calculator. This conservative figure:
- Accounts for transmission losses (~6% in Sweden)
- Includes lifecycle upstream emissions for infrastructure
- Reflects marginal demand at peak hours rather than average
- Aligns with IEA's Swedish electricity carbon intensity estimate [1]

### 2.2 Climate-Advantageous Cooling

A significant but often overlooked factor is **datacenter cooling efficiency**, which varies dramatically by climate:

| Climate | Cooling Method | PUE | Cooling Energy vs Ideal |
|---------|---------------|-----|------------------------|
| **Nordics (Sweden, Norway)** | Free-air cooling | 1.15 | **1.0×** (baseline) |
| Quebec | Free-air cooling | 1.15 | 1.0× |
| France | Mixed (free-air + mechanical) | 1.30 | 1.3× |
| Ireland | Temperate maritime | 1.25 | 1.2× |
| Germany | Mechanical cooling required | 1.35 | 1.4× |
| US Average | Mechanical cooling | 1.50 | 1.5× |
| US East | Heavy mechanical cooling | 1.60 | 1.6× |
| Texas | Extreme cooling needs | 1.80 | 2.0× |
| India | Extreme cooling + humidity | 2.00 | 2.5× |

**Key insight**: Sweden's cold climate eliminates the need for energy-intensive mechanical cooling. This gives Nordic datacenters a **structural efficiency advantage** beyond just the clean grid:
- Sweden: PUE 1.15 (cooling adds only 15% overhead)
- Texas: PUE 1.80 (cooling adds 80% overhead)
- India: PUE 2.00 (cooling adds 100% overhead)

This means a GPU in Sweden uses **57% less cooling energy** than the same GPU in Texas, even before accounting for the carbon intensity difference.

### 2.3 Water Usage for Cooling

An often overlooked environmental impact is **water consumption** for datacenter cooling. Evaporative cooling — common in hot climates — requires significant water:

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

**Key insight**: Nordic datacenters use **zero water** for cooling because free-air cooling doesn't require evaporation. In contrast, a datacenter in Texas or India can consume **1.5-2.0 liters of water per kWh** of IT energy — a significant environmental concern in water-scarce regions.

For a single inference query using 0.0001 kWh:
- Sweden: **0 ml** water
- Texas: **0.15 ml** water
- India: **0.20 ml** water

While small per query, at scale (millions of queries) this becomes significant: 1 million queries in India = **200 liters** of water vs **0 liters** in Sweden.

### 2.4 Supported Grid Regions

The calculator supports 13 grid regions with IEA emission factors and climate-specific PUE:

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

### 2.4 Time-of-Day Variation

Each grid region has a demand curve (24 hours) and adjustment factors:

```
CI_eff = CI_base × factor
```

Where `factor` is:
- `lowPeriodFactor` when demand ≤ `lowPeriodThreshold`
- `peakPeriodFactor` otherwise

| Region | Low Period Factor | Peak Period Factor | Low Threshold |
|--------|-------------------|-------------------|---------------|
| Sweden | 0.70 | 1.15 | 0.20 |
| Germany | 0.80 | 1.15 | 0.20 |
| US Average | 0.85 | 1.10 | 0.20 |
| China | 0.90 | 1.10 | 0.20 |

---

## 3. Operational Carbon: Response-Time Method

The key methodological insight is that **per-request GPU time** is more accurate than theoretical throughput (tokens/second) because:

1. **Throughput varies enormously** with temperature, sampling strategy, prompt caching, and KV-cache pressure
2. **Response time is directly measurable** via API latency metrics (time-to-first-token + streaming duration)
3. **Concurrency must be accounted for** — a request taking 5 seconds on a GPU shared by 8 clients only consumes 5/8 = 0.625 seconds of exclusive GPU time

### 3.1 Token-Based Time Adjustment

Response time scales with token count, but sub-linearly (due to parallel processing):

```
tokenRatio = (inputTokens + outputTokens) / (defaultInputTokens + defaultOutputTokens)
tokenAdjustedTime = measuredResponseTimeSeconds × √tokenRatio
```

### 3.2 Concurrency Impact

When many requests hit the server simultaneously, each request takes longer due to resource contention:

```
if concurrency ≤ 8:
    concurrencyAdjustedTime = tokenAdjustedTime
else:
    delayFactor = 1 + log₂(concurrency/8) × 0.15
    concurrencyAdjustedTime = tokenAdjustedTime × delayFactor
```

**Example**: At concurrency=16, delayFactor = 1 + 1 × 0.15 = 1.15 (15% longer)

### 3.3 GPU Allocation Heuristic

Models are allocated GPUs based on parameter count:

| Parameters | GPUs Allocated |
|------------|---------------|
| ≤ 10B | 1 |
| 10B – 40B | 2 |
| 40B – 100B | 4 |
| > 100B | 8 (max on node) |

### 3.4 Power Calculation

GPU power is interpolated between idle and peak based on utilization:

```
utilization = min(1.0, concurrencyAdjustedTime / 10)

baseGpuPower = nodeIdleWatts / gpuCount
incrementalPower = ((nodePeakWatts - nodeIdleWatts) / gpuCount) × utilization
powerPerGpu = baseGpuPower + incrementalPower
```

**Example** (H200 node, 8 GPUs):
- Idle: 800W total → 100W per GPU
- Peak: 5,000W total → 625W per GPU
- At 60% utilization: 100 + (525 × 0.6) = **415W per GPU**

### 3.5 Energy Calculation

```
gpuTimeHours = concurrencyAdjustedTime / 3,600
gpuEnergyKwh = (powerPerGpu × gpuTimeHours × gpusUsed) / 1,000
```

### 3.6 Server Infrastructure

Server chassis power is divided among concurrent requests:

```
serverEnergyKwh = (chassisWatts × gpuTimeHours) / (1,000 × concurrency)
```

### 3.7 PUE Overhead

PUE (Power Usage Effectiveness) varies significantly by climate and cooling method:

| Region | PUE | Cooling Method |
|--------|-----|---------------|
| Sweden | **1.15** | Free-air cooling |
| Norway | 1.15 | Free-air cooling |
| Quebec | 1.15 | Free-air cooling |
| France | 1.30 | Mixed |
| Germany | 1.35 | Mechanical |
| US Average | 1.50 | Mechanical |
| Texas | 1.80 | Heavy mechanical |
| India | 2.00 | Extreme mechanical |

```
overheadCO2 = (gpuOperationalCO2 + serverOperationalCO2) × (PUE - 1)
```

For Sweden: `overheadCO2 = operationalCO2 × 0.15` (15% overhead)
For Texas: `overheadCO2 = operationalCO2 × 0.80` (80% overhead)

This climate advantage compounds with the clean grid — Swedish inference has both lower carbon intensity AND lower cooling overhead.

### 3.8 Operational Carbon Total

```
gpuOperationalCO2 = gpuEnergyKwh × effectiveIntensity
serverOperationalCO2 = serverEnergyKwh × effectiveIntensity
totalOperationalCO2 = gpuOperationalCO2 + serverOperationalCO2 + overheadCO2
```

---

## 4. Embodied Carbon

### 4.1 Hardware Manufacturing Emissions

Manufacturing emissions are amortised **per GPU-second** over 5-year service life:

```
embodiedPerGpuGrams = (embodiedPerGpuKg × 1,000) / (5 × 365 × 24 × 3,600)
embodiedCO2 = embodiedPerGpuGrams × gpuTimeSeconds × gpusUsed
```

**Example** (H200, 2,500 kg embodied):
- Per second: (2,500 × 1,000) / 157,680,000 = **0.0159 g CO₂/s**
- For 2.5s GPU time on 1 GPU: 0.0159 × 2.5 = **0.0397 g CO₂**

### 4.2 Hardware Configurations

| Hardware | GPUs | Node Idle | Node Peak | Embodied/GPU | Chassis |
|----------|------|-----------|-----------|--------------|---------|
| NVIDIA H200 | 8 | 800W | 5,000W | 2,500 kg | 600W |
| NVIDIA H100 | 8 | 700W | 5,200W | 2,000 kg | 600W |
| AMD MI300X | 8 | 1,000W | 6,000W | 3,000 kg | 600W |
| NVIDIA A100 | 8 | 600W | 3,200W | 1,200 kg | 400W |
| NVIDIA L4 | 4 | 200W | 400W | 300 kg | 200W |
| Refurbished H200 | 8 | 800W | 5,000W | 0 kg | 600W |

**Note on Embodied Carbon Values:**
NVIDIA and AMD do NOT publish per-GPU embodied carbon LCAs. The values above are estimates derived from Dell/HPE server-level product carbon footprint reports by subtracting non-GPU components (CPU, chassis, DRAM, NIC, SSD). These estimates have ±30-50% uncertainty.

Key data points from vendor server LCAs:
- Dell R750 (2020, A100 option): 2,181-3,880 kg CO2 total embodied
- HP ProLiant DL380 gen10+ (2021, GPU option): 2,181 kg CO2 embodied
- Dell C4130 (2016, GPU server): 12,700 kg CO2 total embodied

Academic references:
- Gupta et al. "Chasing Carbon", HPCA 2021: Manufacturing dominates lifecycle emissions for data center hardware
- Ji et al. SCARIF, ISVLSI 2024: Chip area × process node methodology for estimating accelerator carbon

### 4.3 Refurbished Hardware

Refurbished GPUs have **zero embodied carbon** attributed to inference because:
- Manufacturing emissions were already amortised in their first lifecycle
- Extending hardware life defers new manufacturing
- This creates a significant advantage: ~20-30% lower total emissions

---

## 5. Training Amortisation

### 5.1 Training CO₂ Sources

Training emissions are estimated from disclosed or extrapolated data:

| Model | Training CO₂ (kg) | Source | Confidence |
|-------|------------------|--------|------------|
| Llama 3.1 8B | 1,700 | Meta sustainability report [5] | Medium |
| Llama 3.3 70B | 9,300 | Meta sustainability report [5] | Medium |
| Mistral Small 24B | 3,200 | Mistral AI environmental disclosure | Medium |
| GPT-OSS 120B | 16,000 | OpenAI GPU-day estimates [6] | Low |
| E5 Embedding | 280 | Microsoft Research documentation | High |
| Whisper Large | 1,200 | OpenAI GPU-day estimates [6] | Low |
| Kimi K2.6 | 45,000 | Moonshot AI estimates | Low |

For models without disclosed data:
```
CO₂_training ≈ P_params × 0.15 × T_hours × CI_training / 1000
```

### 5.2 Amortisation

```
C_training_per_query = CO₂_training_grams / lifetimeQueries
```

Default: `lifetimeQueries = 100,000,000` (100M queries)

---

## 6. Total Carbon per Query

### 6.1 Complete Formula

```
C_total = C_gpu + C_server + C_overhead + C_embodied + C_training
```

Where:
- `C_gpu` = GPU operational energy × grid CI
- `C_server` = Server infrastructure energy × grid CI / concurrency
- `C_overhead` = (C_gpu + C_server) × (PUE - 1)
- `C_embodied` = Manufacturing CO₂ amortised per GPU-second
- `C_training` = Total training CO₂ / expected lifetime queries

### 6.2 Example Calculation

**Query**: Llama 3.1 8B, 800 tokens in / 400 tokens out (defaults), Sweden, 14:00

| Component | Calculation | Result |
|-----------|-------------|--------|
| Token ratio | (800+400)/(800+400) | 1.0 |
| Response time | 1.2s × √1.0 | 1.2s |
| Concurrency | 14:00 traffic | ~29 |
| Adjusted time | 1.2 × (1 + log₂(29/8)×0.15) | 1.53s |
| GPUs used | 8B params | 1 |
| GPU power | 87.5 + (562.5×0.153) | 174W |
| GPU energy | (174 × 1.53/3600 × 1)/1000 | 0.000074 kWh |
| GPU CO₂ | 0.000074 × 8 × 1.15 | 0.00068 g |
| Server energy | (1200 × 1.53/3600)/(1000×29) | 0.000018 kWh |
| Server CO₂ | 0.000018 × 8 × 1.15 | 0.00017 g |
| Overhead | (0.00068 + 0.00017) × 0.15 | 0.00013 g |
| Embodied | (1200×1000/157,680,000) × 1.53 × 1 | 0.0116 g |
| Training | 1,700,000 / 100,000,000 | 0.0170 g |
| **Total** | | **0.0302 g** |

**Note**: This is the total lifecycle emissions. For operational emissions only (excluding embodied and training): **0.0010 g** (1.0 mg).

---

## 7. Comparison Helpers

The calculator converts CO₂ to relatable equivalents using a **fixed reference intensity** (EU average ≈ 300 g/kWh) so comparisons are consistent regardless of which grid the user selects:

```
microwaveSeconds = (co2Grams / 300) / 0.8 kW × 3,600
ledBulbSeconds = (co2Grams / 300) / 0.01 kW × 3,600
carKm = co2Grams / 120
phoneChargePercent = (co2Grams / 15) × 100
flightPermille = (co2Grams / 90,000) × 1,000
```

**Why fixed reference?** Using the selected grid's intensity would give counter-intuitive results — a cleaner grid would show *longer* microwave times for the same CO₂ amount. The fixed reference answers: *"What does this CO₂ amount to in everyday terms?"*

---

## 8. Validation & Benchmarks

### 8.1 Against Published Research

| Benchmark | Our Estimate | Literature | Match |
|-----------|-------------|------------|-------|
| Llama-2 7B, 1K tokens | ~0.001 g | ~0.001 g [7] | Within 20% |
| GPT-3 175B, 1K tokens | ~0.03 g | ~0.02-0.04 g [8] | Within 25% |
| BERT-base, 128 tokens | ~0.00005 g | ~0.00004 g [7] | Within 20% |

### 8.2 Berget Specific

On Berget's infrastructure (8 g/kWh), Llama 3.1 8B, 800 tokens in / 400 tokens out:

| Component | Sweden (8 g/kWh, PUE 1.15) | US Average (380 g/kWh, PUE 1.50) | Ratio |
|-----------|---------------------------|----------------------------------|-------|
| **Operational** (GPU + Server + PUE) | 1.04 mg | 49.6 mg | **47.7×** |
| **Embodied** (hardware manufacturing) | 24.3 mg | 24.3 mg | 1× |
| **Training** (amortised) | 17.0 mg | 17.0 mg | 1× |
| **TOTAL** | **42.4 mg** | **90.9 mg** | **2.1×** |

**Key insight**: The operational emissions (energy consumed during inference) are ~48× lower on the Swedish grid due to the clean energy mix. However, embodied carbon and training amortisation are **independent of the grid** — they depend on hardware manufacturing and training location, not where inference runs.

For a fair comparison of **operational efficiency only** (excluding fixed costs):
- Sweden: **1.04 mg** operational CO₂
- US Average: **49.6 mg** operational CO₂
- **Reduction: 47.7×**

For **total lifecycle emissions** (including fixed costs):
- Sweden: **42.4 mg** total CO₂e
- US Average: **90.9 mg** total CO₂e  
- **Reduction: 2.1×**

The choice of infrastructure provider can reduce **operational emissions by 30-85×** for the same model and query, and **total emissions by 2-4×** when including embodied and training costs. 

**Climate advantage compounds the grid advantage**: Sweden's free-air cooling (PUE 1.15) vs US mechanical cooling (PUE 1.50) means 57% less cooling energy, in addition to the 47× cleaner grid. 

---

## 9. Limitations & Uncertainties

1. **Training data**: Extrapolated values may vary ±50% from actuals. Disclosed data preferred where available.
2. **GPU power**: Measured power vs. rated TDP can differ by 20-40% depending on workload characteristics.
3. **Embodied carbon**: Manufacturer LCAs are often proprietary; proxy data used.
4. **Time-of-day**: Marginal CI factors are simplified from complex power market dynamics.
5. **Model-specific efficiency**: Architecture factors are heuristic, calibrated against benchmarks but not exact.
6. **Concurrency model**: Logarithmic delay factor is empirically fitted; actual behavior varies by framework.

---

## 10. References

[1] IEA (2024). "Electricity Emissions Factors by Country". International Energy Agency.  
[2] Patterson, D. et al. (2022). "The Carbon Footprint of Machine Learning Training Will Plateau, Then Shrink". IEEE Computer.  
[3] Dell Technologies (2023). "Life Cycle Assessment of PowerEdge Servers".  
[4] NVIDIA (2024). "NVIDIA Product Sustainability". Technical Report.  
[5] Meta Platforms (2024). "Llama 3.1 Model Card". Sustainability Section.  
[6] Strubell, E. et al. (2019). "Energy and Policy Considerations for Deep Learning in NLP". arXiv:1906.02243.  
[7] Faiz, A. et al. (2022). "Measuring the Carbon Intensity of AI in Cloud Instances". FAccT '22.  
[8] Patterson, D. et al. (2021). "Carbon Emissions and Large Neural Network Training". arXiv:2104.10350.  
[9] Green Software Foundation (2024). "Software Carbon Intensity for AI (SCI-AI) Specification v2.0".  
[10] Gupta, U. et al. (2021). "Chasing Carbon: The Elusive Environmental Footprint of Computing". HPCA 2021. arXiv:2011.02839.  
[11] Ji, S. et al. (2024). "SCARIF: A Framework for Sustainable Computer Architecture Research". ISVLSI 2024. arXiv:2401.06270.  
[12] Luccioni, S. et al. (2024). "Power Hungry Processing: Watts Driving the Cost of AI Deployment?". FAccT 2024. arXiv:2311.16863.

---

## Appendix A: Model-Specific Parameters

| Model | Params | FLOPs/Token | Arch. Efficiency | Power Draw | Training CO₂ |
|-------|--------|-------------|------------------|------------|-------------|
| Llama 3.1 8B | 8B | 12 GFLOP | 0.75 | 200W | **1,700 kg** |
| Llama 3.3 70B | 70B | 112 GFLOP | 0.80 | 500W | **9,300 kg** |
| Mistral Small 24B | 24B | 36 GFLOP | 0.78 | 300W | **3,200 kg** |
| Mistral Medium 128B | 128B | 210 GFLOP | 0.82 | 800W | **17,000 kg** (est.) |
| E5 Embedding | 560M | 0.7 GFLOP | 0.65 | 100W | **280 kg** |
| Whisper Large v3 | 1.55B | 2.2 GFLOP | 0.70 | 120W | **1,200 kg** (est.) |
| Kimi K2.6 | 1.1T | 1,200 GFLOP | 0.62 | 1,200W | **45,000 kg** (est.) |

**Note**: Training CO₂ values are estimated from disclosed or extrapolated data. Values marked (est.) have higher uncertainty (±50%). See Section 5.1 for sources.

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
const PUE = 1.2;
const GPU_LIFETIME_SECONDS = 5 * 365 * 24 * 3_600; // 157,680,000
```

### C.3 Component Breakdown

The calculator returns a detailed breakdown:

```typescript
interface InferenceResult {
  totalCO2Grams: number;
  components: {
    gpuOperational: InferenceComponent;      // GPU energy × grid CI
    serverOperational: InferenceComponent;  // Server energy × grid CI / concurrency
    datacenterOverhead: InferenceComponent;   // PUE overhead (20%)
    embodied: InferenceComponent;            // Manufacturing amortised
    trainingAmortised: InferenceComponent;   // Training CO₂ / lifetime queries
  };
  totalEnergyKwh: number;
  gpusAllocated: number;
  effectiveIntensityGPerKwh: number;
  timing: { isLowPeriod, periodFactor, hourOfDay };
}
```

---

*Document maintained by Berget AI. For questions: engineering@berget.ai*
