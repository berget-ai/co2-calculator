/**
 * Core types for inference-time CO₂ estimation.
 *
 * These types represent the dual-grid concept and production-aware
 * hardware allocation that emerged from calibrating against
deployment metrics (Prometheus + vLLM histograms).
 */

// ---------------------------------------------------------------------------
// Model profiles with training CO₂ from manufacturer reports
// ---------------------------------------------------------------------------

export type ModelArchitecture =
| "dense-transformer"
| "mixture-of-experts"
| "embedding"
| "reranker"
| "speech";

export interface ModelProfile {
  /** HuggingFace model ID, e.g. "meta-llama/Llama-3.1-8B-Instruct" */
  modelId: string;
  /** Human-friendly name for display */
  displayName: string;
  architecture: ModelArchitecture;
  /** Total trainable parameters */
  parameters: number;
  /** Model size in bytes (for memory calculation: params × bytes_per_param × overhead) */
  modelSizeBytes?: number;
  /** Total training CO₂ in grams (from manufacturer reports, not heuristics) */
  totalTrainingCO2Grams: number;
  /** Source of the training-CO₂ figure */
  trainingSource: string;
  /** Default calibrated from vLLM production p50 histograms */
  defaultInputTokens: number;
  defaultOutputTokens: number;
  /** Default response time (seconds) from production — p50, the "typical" request */
  defaultResponseTimeSeconds: number;
  /**
   * Typical concurrent requests sharing the node, measured via Little's Law
   * (request rate × mean latency) from production. Optional — falls back to a
   * generic default when unknown (e.g. closed frontier models we don't serve).
   */
  defaultConcurrency?: number;
  /**
   * Fraction of prompt tokens served from the KV prefix cache in production
   * (0-1), measured via vLLM/SGLang. When caching is enabled, this share of
   * the prompt skips the prefill phase, cutting its GPU time. 0 when prefix
   * caching is disabled.
   */
  cachedPromptFraction?: number;
  /** Hugging Face popularity metrics */
  popularity?: {
    downloadsPerMonth: number;
    hfLikes: number;
  };
  /** OpenRouter API usage statistics (requests per day) */
  openRouterStats?: {
    requestsPerDay: number;
    estimatedGlobalRequestsPerDay: number;
  };
}

// ---------------------------------------------------------------------------
// Hardware configurations (node-level, as deployed)
// ---------------------------------------------------------------------------

export interface HardwareConfig {
  /** Human name, e.g. "NVIDIA H200 ×8 node" */
  name: string;
  /** Total GPUs on the node */
  gpuCount: number;
  /** GPU memory per card in GB */
  gpuMemoryGb: number;
  /** Node idle power in watts (chassis + all GPUs at idle) */
  nodeIdleWatts: number;
  /** Node peak power in watts (max TDP all GPUs + chassis) */
  nodePeakWatts: number;
  /** Embodied CO₂ per GPU card in kg CO₂e */
  embodiedPerGpuKg: number;
  /** Embodied CO₂ for other compute (CPU, RAM, SSD, chassis, network, firewalls) per node in kg CO₂e */
  otherComputeEmbodiedKg: number;
  /** Server/chassis overhead power in watts */
  chassisWatts: number;
  /** Form factor description */
  formFactor: string;
}

// ---------------------------------------------------------------------------
// Grid regions (IEA emission factors + time-of-day curves)
// ---------------------------------------------------------------------------

export interface TimeOfDayHour {
  /** 0–23 */
  hour: number;
  /** Relative demand weight (0–1+) */
  demanWeight: number;
}

export interface GridRegion {
  /** Short name, e.g. "Sweden" */
  name: string;
  /** Longer description for display */
  fullLabel: string;
  /** Average carbon intensity in g CO₂e / kWh */
  intensityGPerKwh: number;
  /** Time-of-day demand curve (24 entries) */
  demandCurve: number[];
  /** Low-period adjustment factor */
  lowPeriodFactor: number;
  /** Peak-period adjustment factor */
  peakPeriodFactor: number;
  /** Threshold below which demand is considered low */
  lowPeriodThreshold: number;
  /** Climate cooling factor: multiplier on cooling energy vs ideal free-air cooling
   *  1.0 = free-air cooling (Nordics)
   *  1.5 = moderate climate (Central Europe)
   *  2.5 = hot climate (desert regions)
   */
  coolingFactor: number;
  /** Typical PUE for this climate */
  typicalPue: number;
  /** Water usage for cooling (liters per kWh of IT energy)
   *  0.0 = no water (free-air cooling)
   *  0.5-1.0 = moderate (cooling towers with recirculation)
   *  2.0+ = high (evaporative cooling in hot/dry climates)
   */
  waterLitersPerKwh: number;
}

// ---------------------------------------------------------------------------
// Inference request parameters
// ---------------------------------------------------------------------------

export interface InferenceParams {
  modelProfile: ModelProfile;
  hardware: HardwareConfig;
  /** Where the inference actually runs */
  deploymentGrid: GridRegion;
  /** Grid to use for energy-equivalent comparisons (optional) */
  referenceGrid?: GridRegion;
  measuredResponseTimeSeconds: number;
  inputTokens: number;
  outputTokens: number;
  /**
   * Concurrent requests sharing the node (for overhead sharing). Optional:
   * when omitted it is derived from the model's measured production
   * concurrency (defaultConcurrency) scaled by the time-of-day traffic
   * pattern. Forced to 1 when deployment is "onprem".
   */
  concurrency?: number;
  /**
   * "shared" (default): the node is shared with other tenants, so fixed
   * server/embodied costs are split across concurrent requests.
   * "onprem": you run the model on your own server — concurrency is 1 and the
   * entire infrastructure + embodied footprint lands on your queries alone.
   */
  deployment?: "shared" | "onprem";
  /**
   * Whether the KV prefix cache is used. When true (default), the model's
   * measured cachedPromptFraction of the prompt skips prefill, reducing GPU
   * time. When false, the full prompt is prefilled every request.
   */
  caching?: boolean;
  /** Hour of day (0-23) for time-of-day adjustment */
  hourOfDay: number;
  /** Whether to include amortised training CO₂ */
  includeTraining: boolean;
  /** Amortisation denominator (expected lifetime queries) */
  lifetimeQueries: number;
}

// ---------------------------------------------------------------------------
// Inference result breakdown
// ---------------------------------------------------------------------------

export interface InferenceComponent {
  /** grams CO₂e */
  co2Grams: number;
  /** kWh consumed */
  energyKwh: number;
  /** Description for UI */
  label: string;
}

export interface InferenceResult {
  /** Total per-query CO₂ in grams */
  totalCO2Grams: number;
  /** Per component */
  components: {
    /** Incremental GPU compute energy (shared across the concurrent batch) */
    gpuOperational: InferenceComponent;
    /** GPU idle/standby baseline, attributed to this request's share of the node */
    gpuIdle: InferenceComponent;
    serverOperational: InferenceComponent;
    datacenterOverhead: InferenceComponent; // grid-specific PUE factor (grid.typicalPue)
    embodiedGpu: InferenceComponent;
    embodiedOther: InferenceComponent;
    trainingAmortised: InferenceComponent;
  };
  /** Total energy consumed (all components, all GPUs) */
  totalEnergyKwh: number;
  /** Number of GPUs actually used for this model size */
  gpusAllocated: number;
  /** Effective carbon intensity after time-of-day */
  effectiveIntensityGPerKwh: number;
  /** Time-of-day info */
  timing: {
    isLowPeriod: boolean;
    periodFactor: number;
    hourOfDay: number;
  };
  /** Grid info for display */
  deploymentGrid: {
    name: string;
    intensityGPerKwh: number;
  };
  /** Water usage for cooling (liters per query) */
  waterLiters: number;
}
