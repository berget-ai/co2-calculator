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

- **15 pre-configured models** (Llama, Mistral, GPT-OSS, Whisper, etc.)
- **13 grid regions** with real carbon intensity data
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
| **GPU Operational** | Energy used by GPUs during inference | 0.1-10 mg CO₂ |
| **Server Infrastructure** | CPU, memory, networking | 0.01-1 mg CO₂ |
| **Cooling (PUE)** | Datacenter overhead | 15-100% of operational |
| **Hardware Embodied** | Manufacturing amortized over lifetime | 1-50 mg CO₂ |
| **Training Amortized** | Training CO₂ divided by expected queries | 0.1-20 mg CO₂ |

**Key features:**
- Memory-aware GPU allocation (H100 80GB vs MI300X 192GB)
- Climate-specific PUE (Sweden 1.15 vs Texas 1.80)
- Water usage tracking (0 L for free-air cooling)
- Time-of-day grid intensity variation

See **[METHODOLOGY.md](./METHODOLOGY.md)** for full details.

---

## Pre-Configured Data

### Models (15)

| Model | Parameters | Memory (FP16) | Training CO₂ |
|-------|-----------|---------------|--------------|
| Llama 3.1 8B | 8B | 16 GB | 1.7 kg |
| Llama 3.3 70B | 70B | 140 GB | 9.3 kg |
| Mistral Small 24B | 24B | 48 GB | 3.2 kg |
| Mistral Medium 128B | 128B | 256 GB | 17 kg (est.) |
| GPT-OSS 120B | 120B | 240 GB | 16 kg (est.) |
| Kimi K2.6 (INT4) | 1.1T | 550 GB | 50 kg (est.) |
| E5 Embedding | 560M | 1.1 GB | 0.28 kg |
| Whisper Large v3 | 1.5B | 3 GB | 1.2 kg (est.) |

[Full list →](./packages/co2-calculator/src/models.ts)

### Grid Regions (13)

| Region | Intensity | PUE | Cooling |
|--------|-----------|-----|---------|
| Sweden | 8 g/kWh | 1.15 | Free-air |
| Norway | 15 g/kWh | 1.15 | Free-air |
| France | 30 g/kWh | 1.30 | Mixed |
| Germany | 280 g/kWh | 1.35 | Mechanical |
| US Average | 380 g/kWh | 1.50 | Mechanical |
| Texas | 420 g/kWh | 1.80 | Extreme |
| India | 700 g/kWh | 2.00 | Extreme |

[Full list →](./packages/co2-calculator/src/grids.ts)

### Hardware (6)

| Configuration | GPUs | Memory/GPU | Embodied/GPU |
|--------------|------|-----------|--------------|
| NVIDIA H100 ×8 | 8 | 80 GB HBM3 | 850 kg |
| NVIDIA H200 ×8 | 8 | 141 GB HBM3e | 1,000 kg |
| AMD MI300X ×8 | 8 | 192 GB HBM3 | 1,000 kg |
| NVIDIA A100 ×8 | 8 | 80 GB HBM2e | 1,200 kg |
| NVIDIA L4 ×4 | 4 | 24 GB GDDR6 | 300 kg |

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

**Built by Berget AI** · [berget.ai](https://berget.ai) · [API Docs](https://berget.ai/docs)

*Developed in collaboration with Stockholm Environment Institute (SEI) and Climate TRACE.*
