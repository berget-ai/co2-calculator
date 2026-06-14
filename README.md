# CO₂ Impact Calculator for AI Inference

> A vendor-neutral, scientifically-grounded CO₂ emissions calculator for AI inference workloads. Based on the [Green Software Foundation's SCI-AI specification](https://github.com/Green-Software-Foundation/sci-ai).

[![Test](https://github.com/berget-ai/co2-emissions-calculator/actions/workflows/test.yml/badge.svg)](https://github.com/berget-ai/co2-emissions-calculator/actions)
[![Coverage](https://img.shields.io/codecov/c/github/berget-ai/co2-emissions-calculator)](https://codecov.io/gh/berget-ai/co2-emissions-calculator)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**🌍 [Live Calculator](https://co2.berget.ai)** — See it in action with Berget AI's infrastructure.

---

## Why This Exists

Most AI providers don't show customers the carbon cost of inference. This library makes it trivial to:

- Calculate per-request CO₂ emissions
- Compare different hardware configurations
- Account for regional grid differences
- Include embodied carbon from manufacturing
- Track water usage for cooling

**Built for European AI providers** who want transparency and compliance with emerging sustainability regulations.

---

## Quick Start

### Install

```bash
npm install @berget/co2-emissions-calculator
```

### Basic Usage

```typescript
import { calculateInference, MODEL_PROFILES, HARDWARE_CONFIGS, GRID_REGIONS } from "@berget/co2-emissions-calculator";

const result = calculateInference({
  modelProfile: MODEL_PROFILES["meta-llama/Llama-3.1-8B-Instruct"],
  hardware: HARDWARE_CONFIGS.h100,
  deploymentGrid: GRID_REGIONS.germany,
  measuredResponseTimeSeconds: 1.2,
  inputTokens: 800,
  outputTokens: 400,
  concurrency: 8,
  hourOfDay: 14,
  includeTraining: true,
  lifetimeQueries: 100_000_000,
});

console.log(`CO₂: ${result.totalCO2Grams} g per request`);
console.log(`Water: ${result.waterLiters} L per request`);
```

### What's Included

- **14 pre-configured models** (Llama, Mistral, Gemma, GLM, Whisper, etc.)
- **15 grid regions** with real carbon intensity data
- **6 hardware configurations** (H100, H200, MI300X, A100, L4)
- **Full component breakdown**: GPU, server, cooling, embodied, training

---

## For AI Providers

### Build Your Own Stack

Every provider has different hardware, locations, and models. See **[ADVANCED_USAGE.md](./ADVANCED_USAGE.md)** for:

- Configuring custom hardware (your exact servers)
- Adding custom grid regions (your datacenter locations)
- Defining custom models (your fine-tuned variants)
- Integration examples (Express, FastAPI, Prometheus)
- Monitoring and observability setup

### Example: Custom Provider Setup

```typescript
import { calculateInference, type HardwareConfig, type GridRegion } from "@berget/co2-emissions-calculator";

// Your infrastructure
const myHardware: HardwareConfig = {
  name: "MyProvider · 8× H100",
  gpuCount: 8,
  gpuMemoryGb: 80,
  nodeIdleWatts: 700,
  nodePeakWatts: 6_500,
  embodiedPerGpuKg: 850,
  chassisWatts: 1_200,
  formFactor: "8-GPU Accelerator",
};

// Your datacenter location
const myRegion: GridRegion = {
  name: "Netherlands",
  fullLabel: "Netherlands · 236 g/kWh",
  intensityGPerKwh: 236,
  demandCurve: [/* 24-hour weights */],
  lowPeriodFactor: 0.85,
  peakPeriodFactor: 1.15,
  lowPeriodThreshold: 0.20,
  coolingFactor: 1.3,
  typicalPue: 1.30,
  waterLitersPerKwh: 0.3,
};

// Calculate emissions for any request
const result = calculateInference({
  modelProfile: myModel,
  hardware: myHardware,
  deploymentGrid: myRegion,
  // ... request details
});
```

---

## Methodology

The calculator follows the **SCI-AI specification** with these components:

| Component | What It Covers | Typical Range |
|-----------|---------------|---------------|
| **GPU Operational** | Energy used by GPUs during inference | 0.1–50 mg CO₂ |
| **Server Infrastructure** | CPU, memory, networking | 0.01–1 mg CO₂ |
| **Cooling (PUE)** | Datacenter overhead | 15–100% of operational |
| **Hardware Embodied** | Manufacturing amortized over lifetime | 1–50 mg CO₂ |
| **Training Amortized** | Training CO₂ / expected lifetime queries | 0.3 mg–4,200 mg CO₂ |

**Key features:**
- Memory-aware GPU allocation (H100 80GB vs MI300X 192GB)
- Climate-specific PUE (Sweden 1.15 vs Texas 1.80)
- Water usage tracking (0 L for free-air cooling)
- Time-of-day grid intensity variation

**Key finding** (Llama 3.1 8B, 800 in / 400 out tokens):

| Location | Operational | Embodied | Training¹ | **Total** |
|----------|-------------|----------|-----------|-----------|
| Sweden (8 g/kWh, PUE 1.15) | 1.0 mg | 24 mg | 4,200 mg | **~4,225 mg** |
| US Average (380 g/kWh, PUE 1.50) | 50 mg | 24 mg | 4,200 mg | **~4,274 mg** |
| **Reduction** | **~48×** | 1× | 1× | **~1.01×** |

¹ Training amortized over 100 M lifetime queries using Meta's published 420 t CO₂e training figure. With 1 B queries the training share drops 10×, making the grid choice more impactful.

See **[METHODOLOGY.md](./METHODOLOGY.md)** for full details.

---

## Pre-Configured Data

### Models (14)

**Text generation**

| Model | Parameters | Memory | Training CO₂ | Source |
|-------|-----------|--------|--------------|--------|
| Llama 3.1 8B | 8B | 16 GB (FP16) | 420 t CO₂e | Meta sustainability report |
| Llama 3.3 70B | 70B | 140 GB (FP16) | 2,040 t CO₂e | Meta sustainability report |
| Mistral Small 24B | 24B | 48 GB (FP16) | 3,200 t CO₂e | Mistral AI env. report |
| Mistral Medium 128B | 128B | 256 GB (FP16) | 17,000 t CO₂e | SCI-AI extrapolation |
| GPT-OSS 117B | 117B (MoE) | 58 GB (MXFP4) | 15,000 t CO₂e | OpenAI est. |
| Gemma 4 31B | 31B | 61 GB (FP16) | 4,100 t CO₂e | Google DeepMind |
| GLM 4.7 358B | 358B (MoE) | 179 GB (INT4) | 25,000 t CO₂e | Zhipu AI |
| Kimi K2.6 1.1T | 1.1T (MoE) | 550 GB (INT4) | 50,000 t CO₂e | Scaling estimate |

**Embeddings & reranking**

| Model | Parameters | Memory | Training CO₂ | Source |
|-------|-----------|--------|--------------|--------|
| E5 Multilingual Large | 560M | 1.1 GB (FP16) | 280 kg | Microsoft Research |
| E5 Multilingual Instruct | 560M | 1.1 GB (FP16) | 320 kg | Microsoft Research |
| BGE Reranker v2-m3 | 278M | 556 MB (FP16) | 150 kg | BAAI |

**Speech-to-text**

| Model | Parameters | Memory | Training CO₂ | Source |
|-------|-----------|--------|--------------|--------|
| Whisper Large v3 | 1.55B | 3.1 GB (FP16) | 1,200 kg | OpenAI est. |
| KB Whisper Large (Swedish) | 1.55B | 3.1 GB (FP16) | 400 kg | KBLab fine-tune |
| NB Whisper Large (Norwegian) | 1.55B | 3.1 GB (FP16) | 400 kg | NbAiLab fine-tune |

[Full list →](./packages/co2-calculator/src/models.ts)

### Grid Regions (15)

| Region | Key | Intensity | PUE | Cooling | Water |
|--------|-----|-----------|-----|---------|-------|
| Sweden | `sweden` | 8 g/kWh | 1.15 | Free-air | 0.0 L/kWh |
| Norway | `norway` | 15 g/kWh | 1.15 | Free-air | 0.0 L/kWh |
| France | `france` | 30 g/kWh | 1.30 | Mixed | 0.2 L/kWh |
| Quebec | `quebec` | 40 g/kWh | 1.15 | Free-air | 0.0 L/kWh |
| Ireland | `ireland` | 150 g/kWh | 1.25 | Temperate | 0.3 L/kWh |
| Germany | `germany` | 280 g/kWh | 1.35 | Mechanical | 0.5 L/kWh |
| US Average | `usa` | 380 g/kWh | 1.50 | Mechanical | 0.8 L/kWh |
| US East (PJM) | `useast` | 400 g/kWh | 1.60 | Mechanical | 1.0 L/kWh |
| Texas (ERCOT) | `texas` | 420 g/kWh | 1.80 | Extreme | 1.5 L/kWh |
| California (CAISO) | `california` | 450 g/kWh | 1.50 | Moderate | 0.7 L/kWh |
| Japan | `japan` | 550 g/kWh | 1.60 | Mechanical | 0.8 L/kWh |
| India | `india` | 700 g/kWh | 2.00 | Extreme | 2.0 L/kWh |
| Poland | `poland` | 750 g/kWh | 1.40 | Mechanical | 0.5 L/kWh |
| China | `china` | 850 g/kWh | 1.60 | Mechanical | 1.0 L/kWh |
| Global Average | `global` | 500 g/kWh | 1.50 | Mixed | 0.8 L/kWh |

Sources: IEA 2024, EPA eGRID 2023, Hydro-Québec 2024.

[Full list →](./packages/co2-calculator/src/grids.ts)

### Hardware (6)

| Configuration | Key | GPUs | Memory/GPU | Node Peak | Embodied/GPU |
|--------------|-----|------|-----------|-----------|--------------|
| NVIDIA H100 ×8 | `h100` | 8 | 80 GB HBM3 | 6,500 W | 850 kg |
| NVIDIA H200 ×8 | `h200` | 8 | 141 GB HBM3e | 6,500 W | 1,000 kg |
| AMD MI300X ×8 | `mi300x` | 8 | 192 GB HBM3 | 7,000 W | 1,000 kg |
| NVIDIA A100 ×8 | `a100` | 8 | 80 GB HBM2e | 3,200 W | 1,200 kg |
| NVIDIA L4 ×4 (2U) | `l4-2u` | 4 | 24 GB GDDR6 | 400 W | 300 kg |
| NVIDIA L4 ×2 (1U) | `l4-1u` | 2 | 24 GB GDDR6 | 250 W | 300 kg |

Embodied carbon estimates have ±30–50% uncertainty (NVIDIA/AMD do not publish per-GPU LCAs). The H100 value is anchored to the [NVIDIA HGX H100 PCF](https://www.nvidia.com/en-us/sustainability/) (1,312 kg CO₂e for the full 8-GPU baseboard).

[Full list →](./packages/co2-calculator/src/hardware.ts)

---

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Check coverage
npm run coverage

# Build library
npm run build

# Start demo app
npm run dev
```

---

## Contributing

We especially need:
- **Hardware PCF data** from vendors (NVIDIA, AMD, Supermicro)
- **Regional grid data** for new locations
- **Real-world measurements** to validate estimates
- **Integration examples** for more frameworks

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## License

MIT License — see [LICENSE](./LICENSE).

---

## References

1. IEA (2024). *Electricity emissions factors by country*. International Energy Agency. <https://www.iea.org/data-and-statistics>
2. EPA (2023). *eGRID — Emissions & Generation Resource Integrated Database*. U.S. Environmental Protection Agency. <https://www.epa.gov/egrid>
3. Hydro-Québec (2024). *Annual Report — Generation*. <https://www.hydroquebec.com>
4. Green Software Foundation (2024). *Software Carbon Intensity for AI (SCI-AI) Specification v2.0*. <https://github.com/Green-Software-Foundation/sci-ai>
5. Gupta, U. et al. (2021). *Chasing Carbon: The Elusive Environmental Footprint of Computing*. HPCA 2021. arXiv:2011.02839.
6. Ji, S. et al. (2024). *SCARIF: Towards Carbon Footprint Estimation for Integrated Circuit Design*. ISVLSI 2024. arXiv:2401.06270.
7. Fu, Z. et al. (2024). *LLMCO2: Advancing Accurate Carbon Footprint Prediction for LLM Inferences*. arXiv:2410.02950.
8. Patterson, D. et al. (2022). *The Carbon Footprint of Machine Learning Training Will Plateau, Then Shrink*. IEEE Computer. arXiv:2204.05149.
9. Luccioni, S. et al. (2024). *Power Hungry Processing: Watts Driving the Cost of AI Deployment?* FAccT 2024. arXiv:2311.16863.
10. Meta Platforms (2024). *Llama 3.1 Model Card — Sustainability Section*. <https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct>
11. NVIDIA (2024). *HGX H100 Product Carbon Footprint (PCF) — cradle-to-gate*. <https://www.nvidia.com/en-us/sustainability/>
12. Dell Technologies (2023). *Life Cycle Assessment of PowerEdge Servers*.
13. Boavizta (2024). *boaviztapi — Component-level embodied carbon model*. <https://github.com/Boavizta/boaviztapi>

---

## How to Cite

If you use this calculator or its methodology in academic work, please cite:

**Plain text:**

> Landgren, C. & Berget AI (2026). *CO₂ Impact Calculator for AI Inference* (v2.3). Berget AI.
> Methodology reviewed by Stockholm Environment Institute (SEI). Available at: <https://github.com/berget-ai/co2-calculator>. Licensed CC BY 4.0.

**BibTeX:**

```bibtex
@software{berget_co2_calculator_2026,
  author       = {Landgren, Christian and {Berget AI}},
  title        = {{CO\textsubscript{2} Impact Calculator for AI Inference}},
  year         = {2026},
  version      = {2.3},
  license      = {MIT / CC BY 4.0},
  url          = {https://github.com/berget-ai/co2-calculator},
  note         = {Methodology (METHODOLOGY.md) reviewed by Stockholm Environment Institute (SEI).
                  Based on the Green Software Foundation SCI-AI specification.}
}
```

**CITATION.cff** (GitHub native):  
A `CITATION.cff` file is included in the repository root for one-click citation export.

---

**Built by Berget AI** · [berget.ai](https://berget.ai) · [API Docs](https://berget.ai/docs)

*Developed in collaboration with Stockholm Environment Institute (SEI) and Climate TRACE.*
