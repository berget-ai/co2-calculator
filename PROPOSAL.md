# Förslag: README-förbättringar för europeiska AI-leverantörer

## Nuvarande problem med README

1. **För Berget-specifik** - Fokuserar på "Berget's infrastructure", "Swedish datacenters"
2. **Ingen leverantörsguide** - Visar inte hur man anpassar för sin egen infrastruktur
3. **Brist på integrationsexempel** - Saknar exempel för vanliga ramverk (FastAPI, Express, etc.)
4. **Ingen regionanpassning** - Visar inte hur man lägger till egna grid-regioner
5. **Ingen hårdvaruanpassning** - Visar inte hur man konfigurerar egna GPU:er

## Föreslagna förbättringar

### 1. Ny struktur på README

```markdown
# CO₂ Impact Calculator for AI Inference

> A vendor-neutral, scientifically-grounded CO₂ emissions calculator for AI inference.
> Based on the Green Software Foundation's SCI-AI specification.

## Quick Start for Providers

### 1. Installera paketet
```bash
npm install @berget/co2-emissions-calculator
```

### 2. Konfigurera för din infrastruktur
```typescript
import { calculateInference, HARDWARE_CONFIGS, GRID_REGIONS } from "@berget/co2-emissions-calculator";

// Använd din egen hårdvara och region
const result = calculateInference({
  modelProfile: MODEL_PROFILES["meta-llama/Llama-3.1-8B-Instruct"],
  hardware: HARDWARE_CONFIGS.h100,  // eller din egen konfig
  deploymentGrid: GRID_REGIONS.germany, // eller din region
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

### 3. Lägg till i din API-middleware
```typescript
// Express.js exempel
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const result = calculateInference({
      modelProfile: req.modelProfile,
      hardware: req.hardwareConfig,
      deploymentGrid: req.gridRegion,
      measuredResponseTimeSeconds: duration,
      inputTokens: req.inputTokens,
      outputTokens: req.outputTokens,
      concurrency: req.activeConnections,
      hourOfDay: new Date().getHours(),
      includeTraining: true,
      lifetimeQueries: 100_000_000,
    });
    
    // Logga eller exponera via metrics
    console.log(`Request CO₂: ${result.totalCO2Grams}g`);
  });
  
  next();
});
```

## Anpassa för din region

### Lägg till egen grid-region
```typescript
import { GridRegion } from "@berget/co2-emissions-calculator";

const myRegion: GridRegion = {
  name: "Netherlands",
  fullLabel: "Netherlands · 236 g/kWh",
  intensityGPerKwh: 236,
  demandCurve: [/* 24 timmars vikter */],
  lowPeriodFactor: 0.85,
  peakPeriodFactor: 1.15,
  lowPeriodThreshold: 0.20,
  coolingFactor: 1.3,
  typicalPue: 1.30,
  waterLitersPerKwh: 0.3,
};
```

## Anpassa för din hårdvara

### Lägg till egen GPU-konfiguration
```typescript
import { HardwareConfig } from "@berget/co2-emissions-calculator";

const myHardware: HardwareConfig = {
  name: "NVIDIA A100 ×4 node",
  gpuCount: 4,
  gpuMemoryGb: 80,
  nodeIdleWatts: 400,
  nodePeakWatts: 2_400,
  embodiedPerGpuKg: 1_200,
  chassisWatts: 800,
  formFactor: "4-GPU Accelerator Node",
};
```

## Integration med monitoring

### Prometheus metrics
```typescript
import { Counter, Gauge } from 'prom-client';

const co2Counter = new Counter({
  name: 'inference_co2_grams_total',
  help: 'Total CO₂ emissions in grams',
  labelNames: ['model', 'region'],
});

const waterGauge = new Gauge({
  name: 'inference_water_liters',
  help: 'Water usage per request',
  labelNames: ['model', 'region'],
});

// I din request handler:
co2Counter.labels(modelId, region).inc(result.totalCO2Grams);
waterGauge.labels(modelId, region).set(result.waterLiters);
```

## Vanliga frågor för leverantörer

### Q: Hur ofta ska jag uppdatera mina värden?
A: Vi rekommenderar:
- Grid-intensitet: Uppdatera årligen (IEA publicerar nya siffror)
- Hårdvara: Uppdatera när du byter hårdvara
- Modeller: Uppdatera när du lägger till nya modeller

### Q: Vilka värden ska jag rapportera till kunder?
A: Vi rekommenderar:
- **Operativa utsläpp** (GPU + Server + Cooling) - varierar med grid
- **Embodied utsläpp** (hårdvara) - konstant per request
- **Totalt** (operativt + embodied + training) - full livscykel

### Q: Hur hanterar jag delade GPU:er?
A: Använd `concurrency`-parametern. Om 8 requests delar 8 GPU:er:
```typescript
concurrency: 8, // Varje request får 1/8 av GPU-tiden
```

### Q: Kan jag använda detta för att jämföra med andra leverantörer?
A: Ja! Använd samma modell och samma grid-region för rättvis jämförelse:
```typescript
// Jämför din infrastruktur med en annan leverantör
const myResult = calculateInference({ ...myConfig, deploymentGrid: GRID_REGIONS.germany });
const theirResult = calculateInference({ ...theirConfig, deploymentGrid: GRID_REGIONS.germany });
```

## Bidra med data

Om du har tillgång till:
- **Hårdvara PCF** (Product Carbon Footprint) från leverantörer
- **Mätvärden** från produktion (power draw, response times)
- **Regionala grid-data** för nya regioner

Bidra gärna tillbaka till projektet!
```

## Konkreta kodändringar som behövs

### 1. Exportera fler typer
```typescript
// src/index.ts
export type {
  InferenceParams,
  InferenceResult,
  ModelProfile,
  HardwareConfig,
  GridRegion,
} from "./types.js";
```

### 2. Lägg till helper för att skapa custom region
```typescript
// src/calculator.ts
export function createGridRegion(config: Omit<GridRegion, 'fullLabel'>): GridRegion {
  return {
    ...config,
    fullLabel: `${config.name} · ${config.intensityGPerKwh} g/kWh`,
  };
}
```

### 3. Lägg till helper för att skapa custom hardware
```typescript
// src/calculator.ts
export function createHardwareConfig(config: HardwareConfig): HardwareConfig {
  return config;
}
```

### 4. Skapa exempel-mapp med integrationsexempel
```
examples/
  express-middleware/
    index.ts
    README.md
  fastapi-middleware/
    main.py
    README.md
  prometheus-metrics/
    metrics.ts
    README.md
  custom-region/
    netherlands.ts
    README.md
  custom-hardware/
    a100-4gpu.ts
    README.md
```

## Sammanfattning av förbättringar

| Problem | Lösning |
|---------|---------|
| För Berget-specifik | Gör generisk, nämn Berget som exempel |
| Ingen leverantörsguide | Skapa "Quick Start for Providers" |
| Saknar integrationsexempel | Lägg till Express/FastAPI/Prometheus exempel |
| Ingen regionanpassning | Dokumentera hur man lägger till regioner |
| Ingen hårdvaruanpassning | Dokumentera hur man konfigurerar GPU:er |
| Ingen monitoring-guide | Lägg till Prometheus/Datadog exempel |
| Brist på FAQ | Skapa leverantörs-FAQ |

## Nästa steg

1. Uppdatera README.md med ny struktur
2. Skapa `examples/` mapp med integrationsexempel
3. Lägg till `createGridRegion()` och `createHardwareConfig()` helpers
4. Skapa CONTRIBUTING.md för leverantörer som vill bidra med data
5. Lägg till `PROVIDERS.md` med detaljerad guide för olika scenarier
