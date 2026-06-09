# Advanced Usage: Build Your Own Stack

> This guide shows how European AI inference providers can configure the calculator for their own infrastructure.

## Table of Contents

- [Custom Hardware Configuration](#custom-hardware-configuration)
- [Custom Grid Region](#custom-grid-region)
- [Custom Model Profiles](#custom-model-profiles)
- [Complete Provider Setup](#complete-provider-setup)
- [Integration Examples](#integration-examples)
- [Monitoring & Observability](#monitoring--observability)

---

## Custom Hardware Configuration

Define your exact server specifications:

```typescript
import { HardwareConfig } from "@berget/co2-emissions-calculator";

// Example: Hetzner AX102 with NVIDIA A100
const hetznerAX102: HardwareConfig = {
  name: "Hetzner AX102 · 2× A100",
  gpuCount: 2,
  gpuMemoryGb: 80, // A100 80GB PCIe
  nodeIdleWatts: 350,
  nodePeakWatts: 1_800, // 2×400W GPUs + CPU + chassis
  embodiedPerGpuKg: 1_200, // From NVIDIA PCF data
  chassisWatts: 600,
  formFactor: "2-GPU Server",
};

// Example: OVHcloud with AMD MI210
const ovhcloudMI210: HardwareConfig = {
  name: "OVHcloud · 8× MI210",
  gpuCount: 8,
  gpuMemoryGb: 64, // MI210 64GB HBM2e
  nodeIdleWatts: 800,
  nodePeakWatts: 5_500,
  embodiedPerGpuKg: 850, // Estimated from MI300X data
  chassisWatts: 1_200,
  formFactor: "8-GPU Accelerator",
};

// Example: Small inference node with RTX A6000
const smallInferenceNode: HardwareConfig = {
  name: "Workstation · 2× RTX A6000",
  gpuCount: 2,
  gpuMemoryGb: 48,
  nodeIdleWatts: 150,
  nodePeakWatts: 600,
  embodiedPerGpuKg: 400, // Estimated
  chassisWatts: 300,
  formFactor: "Workstation",
};
```

### Hardware Configuration Guide

| Field | Description | How to Determine |
|-------|-------------|------------------|
| `gpuCount` | Number of GPUs in the node | Physical count |
| `gpuMemoryGb` | VRAM per GPU in GB | From GPU specs (HBM/GDDR6) |
| `nodeIdleWatts` | Power at idle (all GPUs idle) | Measure with PDU or IPMI |
| `nodePeakWatts` | Power at 100% load | Measure during stress test |
| `embodiedPerGpuKg` | Manufacturing CO₂ per GPU | Vendor PCF report or estimate |
| `chassisWatts` | Non-GPU power (CPU, fans, NICs) | ~20-30% of node power |

**Tip**: For `embodiedPerGpuKg`, if you don't have vendor PCF data:
- Use NVIDIA HGX H100 PCF (1,312 kg for 8× H100) as baseline
- Scale by memory: `(basePCF - baseMemory) + baseMemory × (yourMemory / baseMemory)`
- Add system components (RAM, SSD, chassis) from Boavizta model

---

## Custom Grid Region

Add your datacenter location with accurate grid data:

```typescript
import { GridRegion } from "@berget/co2-emissions-calculator";

// Example: Germany (2024 data)
const germany2024: GridRegion = {
  name: "Germany",
  fullLabel: "Germany · 380 g/kWh",
  intensityGPerKwh: 380,
  demandCurve: [
    0.15, 0.12, 0.10, 0.09, 0.10, 0.15, // 00-05: Low wind
    0.30, 0.50, 0.65, 0.75, 0.80, 0.78, // 06-11: Morning ramp
    0.75, 0.72, 0.70, 0.72, 0.75, 0.80, // 12-17: Solar peak
    0.75, 0.65, 0.55, 0.45, 0.35, 0.25, // 18-23: Evening decline
  ],
  lowPeriodFactor: 0.85,
  peakPeriodFactor: 1.15,
  lowPeriodThreshold: 0.20,
  coolingFactor: 1.4, // Moderate climate, mechanical cooling needed
  typicalPue: 1.35,
  waterLitersPerKwh: 0.5, // Cooling towers with recirculation
};

// Example: Norway (hydro-dominated)
const norway2024: GridRegion = {
  name: "Norway",
  fullLabel: "Norway · 15 g/kWh",
  intensityGPerKwh: 15,
  demandCurve: [
    0.20, 0.15, 0.12, 0.10, 0.12, 0.18, // 00-05: Low industrial
    0.35, 0.55, 0.70, 0.80, 0.85, 0.82, // 06-11: Morning
    0.78, 0.75, 0.72, 0.75, 0.80, 0.82, // 12-17: Stable hydro
    0.75, 0.60, 0.50, 0.40, 0.30, 0.25, // 18-23: Evening
  ],
  lowPeriodFactor: 0.70,
  peakPeriodFactor: 1.15,
  lowPeriodThreshold: 0.20,
  coolingFactor: 1.0, // Free-air cooling year-round
  typicalPue: 1.15,
  waterLitersPerKwh: 0.0, // No water needed
};

// Example: France (nuclear-dominated)
const france2024: GridRegion = {
  name: "France",
  fullLabel: "France · 30 g/kWh",
  intensityGPerKwh: 30,
  demandCurve: [
    0.18, 0.15, 0.12, 0.10, 0.12, 0.16, // 00-05: Nuclear baseload
    0.30, 0.50, 0.70, 0.80, 0.85, 0.82, // 06-11: Morning ramp
    0.78, 0.75, 0.72, 0.75, 0.80, 0.85, // 12-17: Peak demand
    0.80, 0.70, 0.60, 0.50, 0.40, 0.30, // 18-23: Evening
  ],
  lowPeriodFactor: 0.85,
  peakPeriodFactor: 1.15,
  lowPeriodThreshold: 0.20,
  coolingFactor: 1.3, // Mixed cooling
  typicalPue: 1.30,
  waterLitersPerKwh: 0.2,
};
```

### Grid Data Sources

| Data Point | Source | URL |
|------------|--------|-----|
| Carbon Intensity | Electricity Maps | https://app.electricitymaps.com |
| Grid Mix | IEA | https://www.iea.org/data-and-statistics |
| PUE Data | Uptime Institute | Annual survey |
| Water Usage | Local utility reports | Varies by region |

---

## Custom Model Profiles

Add models not in the default list:

```typescript
import { ModelProfile } from "@berget/co2-emissions-calculator";

// Example: DeepSeek-V3 (MoE, 671B params)
const deepseekV3: ModelProfile = {
  modelId: "deepseek-ai/DeepSeek-V3",
  displayName: "DeepSeek V3",
  architecture: "mixture-of-experts",
  parameters: 671_000_000_000,
  modelSizeBytes: 671_000_000_000 * 0.5, // INT4 quantization
  totalTrainingCO2Grams: 45_000_000, // Estimated
  trainingSource: "Estimated from training infrastructure (8.1T tokens)",
  defaultInputTokens: 1_000,
  defaultOutputTokens: 500,
  defaultResponseTimeSeconds: 8.0,
};

// Example: Qwen2.5-72B
const qwen25_72b: ModelProfile = {
  modelId: "Qwen/Qwen2.5-72B-Instruct",
  displayName: "Qwen 2.5 72B",
  architecture: "dense-transformer",
  parameters: 72_000_000_000,
  modelSizeBytes: 72_000_000_000 * 2, // FP16
  totalTrainingCO2Grams: 12_000_000, // Estimated
  trainingSource: "Alibaba Cloud training infrastructure (estimated)",
  defaultInputTokens: 1_000,
  defaultOutputTokens: 500,
  defaultResponseTimeSeconds: 10.0,
};

// Example: Custom fine-tuned model
const myFineTunedModel: ModelProfile = {
  modelId: "my-org/my-model-v1",
  displayName: "My Model v1",
  architecture: "dense-transformer",
  parameters: 7_000_000_000,
  modelSizeBytes: 7_000_000_000 * 2,
  totalTrainingCO2Grams: 500_000, // Base model + fine-tuning
  trainingSource: "Fine-tuning on Llama-3.1-8B (estimated)",
  defaultInputTokens: 500,
  defaultOutputTokens: 300,
  defaultResponseTimeSeconds: 1.5,
};
```

### Estimating Training CO₂

If you don't have exact training data:

```typescript
// Rough estimation formula
function estimateTrainingCO2(
  parameters: number,
  trainingTokens: number,
  gpuType: string,
  trainingDays: number,
  gridIntensity: number
): number {
  // FLOPs = 6 × parameters × tokens (for standard training)
  const flops = 6 * parameters * trainingTokens;
  
  // Approximate GPU efficiency
  const gpuEfficiency: Record<string, number> = {
    "H100": 0.5e15, // 0.5 PFLOPS per GPU
    "A100": 0.3e15,
    "MI300X": 0.6e15,
  };
  
  const gpusNeeded = 1024; // Example cluster size
  const gpuHours = trainingDays * 24 * gpusNeeded;
  const totalFlops = gpuHours * gpuEfficiency[gpuType];
  
  // Energy = FLOPs / efficiency
  const energyKwh = flops / totalFlops * gpuHours * 0.7; // 0.7 kW per GPU average
  
  // CO₂ = Energy × Intensity
  return energyKwh * gridIntensity * 1000; // grams
}
```

---

## Complete Provider Setup

Here's a complete example for a fictional European provider:

```typescript
import {
  calculateInference,
  calculateComparisons,
  type ModelProfile,
  type HardwareConfig,
  type GridRegion,
} from "@berget/co2-emissions-calculator";

// ─── 1. Define Your Infrastructure ───

const myHardware: HardwareConfig = {
  name: "EuroAI · 8× H100 Node",
  gpuCount: 8,
  gpuMemoryGb: 80,
  nodeIdleWatts: 700,
  nodePeakWatts: 6_500,
  embodiedPerGpuKg: 850,
  chassisWatts: 1_200,
  formFactor: "8-GPU Accelerator",
};

const myRegion: GridRegion = {
  name: "Netherlands",
  fullLabel: "Netherlands · 236 g/kWh",
  intensityGPerKwh: 236,
  demandCurve: [
    0.15, 0.12, 0.10, 0.09, 0.10, 0.14,
    0.30, 0.50, 0.65, 0.75, 0.80, 0.78,
    0.75, 0.72, 0.70, 0.72, 0.75, 0.80,
    0.75, 0.65, 0.55, 0.45, 0.35, 0.25,
  ],
  lowPeriodFactor: 0.85,
  peakPeriodFactor: 1.15,
  lowPeriodThreshold: 0.20,
  coolingFactor: 1.3,
  typicalPue: 1.30,
  waterLitersPerKwh: 0.3,
};

// ─── 2. Define Your Models ───

const myModels: Record<string, ModelProfile> = {
  "euroai/llama-3.1-8b": {
    modelId: "euroai/llama-3.1-8b",
    displayName: "EuroAI Llama 3.1 8B",
    architecture: "dense-transformer",
    parameters: 8_000_000_000,
    modelSizeBytes: 8_000_000_000 * 2,
    totalTrainingCO2Grams: 1_700_000,
    trainingSource: "Meta + fine-tuning",
    defaultInputTokens: 800,
    defaultOutputTokens: 400,
    defaultResponseTimeSeconds: 1.2,
  },
  // Add more models...
};

// ─── 3. Calculate Emissions ───

function calculateRequestEmissions(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  responseTimeMs: number
) {
  const model = myModels[modelId];
  if (!model) throw new Error(`Unknown model: ${modelId}`);

  const result = calculateInference({
    modelProfile: model,
    hardware: myHardware,
    deploymentGrid: myRegion,
    measuredResponseTimeSeconds: responseTimeMs / 1000,
    inputTokens,
    outputTokens,
    concurrency: 8, // Average concurrent requests
    hourOfDay: new Date().getHours(),
    includeTraining: true,
    lifetimeQueries: 100_000_000,
  });

  return {
    co2Grams: result.totalCO2Grams,
    co2Breakdown: result.components,
    waterLiters: result.waterLiters,
    energyKwh: result.totalEnergyKwh,
    gpusUsed: result.gpusAllocated,
    comparisons: calculateComparisons(result.totalCO2Grams),
  };
}

// ─── 4. Use in Production ───

// Example API response with carbon data
app.post("/v1/chat/completions", async (req, res) => {
  const startTime = Date.now();
  
  // ... run inference ...
  const response = await runInference(req.body);
  
  const duration = Date.now() - startTime;
  const emissions = calculateRequestEmissions(
    req.body.model,
    req.body.messages.length, // approximate input
    response.tokens.length,
    duration
  );

  res.json({
    ...response,
    carbon_footprint: {
      co2_grams: emissions.co2Grams,
      water_liters: emissions.waterLiters,
      energy_kwh: emissions.energyKwh,
      equivalents: {
        microwave_seconds: emissions.comparisons.microwaveSeconds,
        phone_charge_percent: emissions.comparisons.phoneChargePercent,
      },
    },
  });
});
```

---

## Integration Examples

### Express.js Middleware

```typescript
import { Request, Response, NextFunction } from "express";

interface CarbonMetrics {
  co2Grams: number;
  waterLiters: number;
  energyKwh: number;
}

declare global {
  namespace Express {
    interface Response {
      carbonMetrics?: CarbonMetrics;
    }
  }
}

export function carbonTrackingMiddleware(
  hardware: HardwareConfig,
  region: GridRegion
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const startTokens = req.body?.messages?.length || 0;

    res.on("finish", () => {
      const duration = (Date.now() - startTime) / 1000;
      const outputTokens = res.locals.outputTokens || 0;

      const result = calculateInference({
        modelProfile: req.body.model,
        hardware,
        deploymentGrid: region,
        measuredResponseTimeSeconds: duration,
        inputTokens: startTokens,
        outputTokens,
        concurrency: req.app.locals.activeConnections || 1,
        hourOfDay: new Date().getHours(),
        includeTraining: true,
        lifetimeQueries: 100_000_000,
      });

      res.carbonMetrics = {
        co2Grams: result.totalCO2Grams,
        waterLiters: result.waterLiters,
        energyKwh: result.totalEnergyKwh,
      };

      // Log to your monitoring system
      console.log(`[CARBON] ${req.body.model}: ${result.totalCO2Grams.toFixed(6)}g CO₂`);
    });

    next();
  };
}

// Usage
app.use(carbonTrackingMiddleware(myHardware, myRegion));
```

### FastAPI Middleware (Python)

```python
# Python wrapper example
from fastapi import Request, Response
import time
import httpx

class CarbonTracker:
    def __init__(self, hardware_config: dict, region_config: dict):
        self.hardware = hardware_config
        self.region = region_config
    
    async def track(self, request: Request, response: Response, duration_ms: float):
        # Call the TypeScript calculator via subprocess or API
        payload = {
            "modelProfile": request.state.model_profile,
            "hardware": self.hardware,
            "deploymentGrid": self.region,
            "measuredResponseTimeSeconds": duration_ms / 1000,
            "inputTokens": request.state.input_tokens,
            "outputTokens": response.state.output_tokens,
            "concurrency": request.app.state.active_connections,
            "hourOfDay": time.localtime().tm_hour,
            "includeTraining": True,
            "lifetimeQueries": 100_000_000,
        }
        
        # You'd need a small Node.js service or use the JS directly
        # This is a conceptual example
        return payload
```

### Prometheus Metrics

```typescript
import { Counter, Gauge, Histogram } from "prom-client";

// Define metrics
const co2Counter = new Counter({
  name: "inference_co2_grams_total",
  help: "Total CO₂ emissions from inference",
  labelNames: ["model", "region", "hardware"],
});

const waterGauge = new Gauge({
  name: "inference_water_liters_per_request",
  help: "Water usage per inference request",
  labelNames: ["model", "region"],
});

const energyHistogram = new Histogram({
  name: "inference_energy_kwh",
  help: "Energy consumption per request",
  buckets: [0.0001, 0.001, 0.01, 0.1, 1],
  labelNames: ["model"],
});

const pueGauge = new Gauge({
  name: "datacenter_pue",
  help: "Current Power Usage Effectiveness",
  labelNames: ["region"],
});

// Record metrics after each request
function recordMetrics(result: InferenceResult, modelId: string, region: string, hardware: string) {
  co2Counter.labels(modelId, region, hardware).inc(result.totalCO2Grams);
  waterGauge.labels(modelId, region).set(result.waterLiters);
  energyHistogram.labels(modelId).observe(result.totalEnergyKwh);
  pueGauge.labels(region).set(result.deploymentGrid.typicalPue || 1.5);
}
```

---

## Monitoring & Observability

### Structured Logging

```typescript
import { createLogger, format, transports } from "winston";

const carbonLogger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "carbon-metrics.jsonl" }),
  ],
});

function logCarbonMetrics(
  result: InferenceResult,
  context: {
    requestId: string;
    modelId: string;
    userId: string;
    region: string;
  }
) {
  carbonLogger.info("inference_carbon_footprint", {
    request_id: context.requestId,
    model: context.modelId,
    user: context.userId,
    region: context.region,
    co2_mg: result.totalCO2Grams * 1000,
    water_ml: result.waterLiters * 1000,
    energy_wh: result.totalEnergyKwh * 1000,
    gpus_used: result.gpusAllocated,
    components: {
      gpu_operational_mg: result.components.gpuOperational.co2Grams * 1000,
      server_operational_mg: result.components.serverOperational.co2Grams * 1000,
      cooling_mg: result.components.datacenterOverhead.co2Grams * 1000,
      embodied_mg: result.components.embodied.co2Grams * 1000,
      training_mg: result.components.trainingAmortised.co2Grams * 1000,
    },
    grid: {
      name: result.deploymentGrid.name,
      intensity: result.deploymentGrid.intensityGPerKwh,
    },
    timestamp: new Date().toISOString(),
  });
}
```

### Grafana Dashboard

Create a dashboard with these panels:

1. **Total CO₂ Today** (counter)
2. **CO₂ per Request** (heatmap)
3. **Water Usage** (gauge)
4. **Grid Intensity** (graph with time-of-day)
5. **Component Breakdown** (stacked bar)
6. **Model Comparison** (table)

Example query for Grafana (PromQL):
```promql
# CO₂ per model
sum by (model) (inference_co2_grams_total)

# Water usage rate
rate(inference_water_liters_per_request[5m])

# PUE by region
avg by (region) (datacenter_pue)
```

---

## Best Practices

### 1. Update Values Regularly

```typescript
// Schedule annual updates
const UPDATE_SCHEDULE = {
  gridIntensity: "yearly", // IEA publishes new data
  hardwarePCF: "on_change", // When you buy new hardware
  models: "onboarding", // When adding new models
};
```

### 2. Validate Your Estimates

```typescript
// Compare with real measurements
async function validateEstimates() {
  const estimated = calculateInference({...});
  const measured = await measureFromPDU(); // Real power meter
  
  const error = Math.abs(estimated.totalEnergyKwh - measured) / measured;
  console.log(`Estimation error: ${(error * 100).toFixed(1)}%`);
  
  if (error > 0.2) {
    console.warn("Estimation error >20%, review parameters");
  }
}
```

### 3. Document Your Assumptions

```typescript
const ASSUMPTIONS = {
  pue: {
    value: 1.35,
    source: "Uptime Institute 2024 survey",
    confidence: "medium",
  },
  embodied: {
    value: 850,
    source: "NVIDIA HGX H100 PCF extrapolated",
    confidence: "medium",
    note: "Requesting vendor PCF for validation",
  },
  gridIntensity: {
    value: 236,
    source: "Electricity Maps 2024 average",
    confidence: "high",
  },
};
```

---

## FAQ for Providers

**Q: How do I handle shared GPU clusters?**
A: Use the `concurrency` parameter. If 16 requests share 8 GPUs, set `concurrency: 16`.

**Q: What if I don't know my exact PUE?**
A: Use regional averages from Uptime Institute, or measure with rack-level PDUs.

**Q: How do I account for cooling water?**
A: Set `waterLitersPerKwh` based on your cooling method:
- Free-air: 0
- Cooling towers: 0.5-1.0
- Evaporative: 1.5-2.0

**Q: Can I use this for billing/transparency?**
A: Yes! The per-request granularity makes it perfect for customer-facing carbon reports.

**Q: How do I contribute data back?**
A: Open a PR with your measured values. We especially need:
- Vendor PCF reports
- Real-world power measurements
- Regional grid data

---

## Next Steps

1. **Measure your hardware**: Use IPMI or rack PDUs to get real power numbers
2. **Find your grid data**: Check Electricity Maps for your region
3. **Configure your models**: Add all models you serve
4. **Integrate**: Add the calculator to your API middleware
5. **Monitor**: Set up dashboards to track trends
6. **Report**: Share carbon data with your customers

---

**Need help?** Open an issue with your infrastructure details and we'll help you configure the calculator.
