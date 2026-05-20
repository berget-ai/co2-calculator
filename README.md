# @berget/co2-emissions-calculator

[![Test](https://github.com/berget-ai/co2-emissions-calculator/actions/workflows/test.yml/badge.svg)](https://github.com/berget-ai/co2-emissions-calculator/actions)
[![Coverage](https://img.shields.io/codecov/c/github/berget-ai/co2-emissions-calculator)](https://codecov.io/gh/berget-ai/co2-emissions-calculator)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A scientifically-grounded CO₂ emissions calculator for AI inference, based on the [Software Carbon Intensity for AI (SCI-AI) specification](https://github.com/Green-Software-Foundation/sci-ai). Developed in collaboration with the [Stockholm Environment Institute (SEI)](https://www.sei.org) and [Climate TRACE](https://climatetrace.org).

**🌍 [Live Calculator](https://co2.berget.ai)** — Estimate your AI carbon footprint interactively.

---

## Features

- 🌍 **SCI-AI Compliant**: Follows the Green Software Foundation's SCI-AI specification
- ⚡ **100% Fossil-Free Infrastructure**: Berget's Swedish datacenters run on wind, hydro, and solar
- 📊 **Model-Aware Estimates**: Covers all 15 models available in [api.berget.ai](https://api.berget.ai/v1/models)
- 🔬 **Validated Methodology**: Peer-reviewed approach with SEI and Climate TRACE
- 📦 **Multi-Modal**: Text generation, embeddings, reranking, and speech-to-text
- 🎯 **Type-Safe**: Full TypeScript with Vitest test coverage >95%
- 🎨 **Interactive Calculator**: Brand-aligned live calculator deployed on GitHub Pages

---

## Quick Start

### As an npm library

```bash
npm install @berget/co2-emissions-calculator
```

```typescript
import { estimateCO2 } from "@berget/co2-emissions-calculator";

const result = estimateCO2({
  tokenCount: 1000,
  modelId: "meta-llama/Llama-3.1-8B-Instruct",
  carbonIntensity: 8, // Berget's average in Sweden
});

console.log(`${result.co2Grams.toFixed(3)} g CO₂e per query`);
```

### Using the calculator

Visit **[co2.berget.ai](https://co2.berget.ai)** to explore interactively, or open `examples/live-calculator.html` locally.

```bash
# Open the calculator in your browser
open examples/live-calculator.html
```

---

## Supported Models

| Model | Parameters | Type | Training CO₂ |
|-------|-----------|------|-------------|
| Llama 3.1 8B | 8B | Text | 1.7 kg |
| Llama 3.3 70B | 70B | Text | 9.3 kg |
| Mistral Small 24B | 24B | Text | 3.2 kg |
| Mistral Medium 128B | 128B | Text | 17 kg (est.) |
| GPT-OSS 120B | 120B | Text | 16 kg (est.) |
| GLM 4.7 47B | 47B | Text | 6.3 kg (est.) |
| Gemma 4 31B | 31B | Text | 4.1 kg (est.) |
| Kimi K2.6 (INT4, 1.1T) | 1.1T | Text | 128 kg (est.) |
| E5 Embedding | 560M | Embedding | 0.28 kg |
| E5 Instruct | 560M | Embedding | 0.32 kg |
| BGE Reranker | 300M | Reranking | 0.15 kg (est.) |
| Whisper Large v3 | 1.5B | Speech | 1.2 kg (est.) |
| KB Whisper | 1.5B | Speech | 0.4 kg (est.) |
| NB Whisper (Norwegian) | 1.5B | Speech | 0.4 kg (est.) |

---

## Methodology & Research

The methodology is documented in detail in **[METHODOLOGY.md](./METHODOLOGY.md)** for use in research collaborations, including our work with:

- **Stockholm Environment Institute (SEI)** — Methodology review and validation
- **Climate TRACE** — Emissions factors and datacenter carbon accounting

### Key Principles

1. **Operational Carbon**: `Energy (kWh) × Carbon Intensity (g CO₂/kWh)`
2. **Embodied Carbon**: Hardware manufacturing amortised over expected lifetime
3. **Training Amortisation**: Total training CO₂ divided over expected inference volume
4. **Time-of-Day Adjustment**: Swedish grid demand curve affects marginal carbon intensity
5. **Infrastructure Overhead**: PUE factor accounts for datacenter cooling/power delivery

---

## Infrastructure: 100% Fossil-Free

Berget's datacenters in Sweden operate on a **100% fossil-free energy mix**:

- **Carbon Intensity**: ~8 g CO₂/kWh (grid mix, not residual!)
- **Sources**: Wind (40%), Hydro (50%), Solar (10%) via Power Purchase Agreements
- **Reference**: Swedish Energy Agency, Berget PPA documentation
- **Comparison**: EU average ~300 g/kWh, coal-heavy regions ~700 g/kWh

This makes inference on Berget's infrastructure **30-100× lower carbon** than on fossil-heavy grids.

---

## Development

```bash
# Install dependencies
npm install

# Run tests (Vitest)
npm test

# Check coverage
npm run coverage

# Build library
npm run build

# Start API server
npm run start:api
```

---

## GitHub Pages Deployment

The calculator is automatically deployed to GitHub Pages on every push to `main`:

1. Workflow defined in `.github/workflows/pages.yml`
2. Pushes `examples/live-calculator.html` as `index.html` to `gh-pages`
3. Custom domain: **co2.berget.ai**

---

## Contributing

Contributions are welcome. Please read our contributing guidelines and ensure tests pass before submitting a PR.

---

## License

MIT License — see [LICENSE](./LICENSE).

---

**Made with ❤️ by Berget AI** · [berget.ai](https://berget.ai) · [API Docs](https://berget.ai/docs)
