import { useState, useMemo, lazy, Suspense } from "react";
import {
  Zap, Server, Snowflake, Droplets, Recycle, Factory, Coffee, Code, MessageSquare, Leaf, Wrench, Globe, Check, Sparkles, RefreshCw
} from "lucide-react";
import {
  calculateInference,
  calculateComparisons,
  fmtTime,
  MODEL_PROFILES,
  HARDWARE_CONFIGS,
  GRID_REGIONS,
  getConcurrencyFromTrafficPattern,
  getEstimatedLifetimeQueries,
} from "@berget/co2-calculator";
import { useModelData, mergeModelData } from "./hooks/useModelData";

// Lazy load GlobeSelector to avoid loading Three.js on initial page load
const GlobeSelector = lazy(() => 
  import("./components/GlobeSelector").then(module => ({ 
    default: module.GlobeSelector 
  }))
);

// ─── Source Citation Component ───
function SourceCitation({ source, url }: { source: string; url?: string }) {
  return (
    <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "0.25rem", fontStyle: "italic" }}>
      Source: {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "underline" }}>
          {source}
        </a>
      ) : source}
    </div>
  );
}
const C = {
  // Backgrounds
  night: "var(--berget-background, #0A0A0A)",
  slate: "var(--berget-card, #121212)",
  
  // Text
  peak: "var(--berget-foreground, #FFFFFF)",
  cloud: "var(--berget-foreground-alt, rgba(255,255,255,0.72))",
  muted: "var(--berget-muted-foreground, rgba(255,255,255,0.65))",
  
  // Primary = Stone (cream/white) - main action color
  stone: "var(--berget-primary, #E5DDD5)",
  stoneHover: "var(--berget-primary-hover, #F0EAE4)",
  
  // Secondary = Moss - subtle accent
  moss: "var(--berget-secondary, #60A580)",
  mossDim: "var(--berget-secondary-hover, rgba(96,165,128,0.15))",
  
  // Accent = Sage - even more subtle
  sage: "var(--berget-accent, #8EB29F)",
  
  // Cards and surfaces
  card: "var(--berget-card, #121212)",
  ghost: "var(--berget-ghost, rgba(26,26,26,0.4))",
  ghostHover: "var(--berget-ghost-hover, rgba(26,26,26,0.6))",
  
  // Border system - Stone with subtle opacity
  border: "var(--berget-border, rgba(229,221,213,0.05))",
  borderHover: "var(--berget-border-hover, rgba(229,221,213,0.10))",
  borderStrong: "var(--berget-border-strong, rgba(229,221,213,0.08))",
  borderMoss: "var(--berget-border-moss, rgba(96,165,128,0.20))",
  
  // Status
  danger: "var(--berget-destructive-foreground, #D1392E)",
  warning: "var(--berget-warning, #CFFF8B)",
  info: "var(--berget-info, #3975D6)",
  
  // Effects
  glow: "var(--berget-glow, rgba(229,221,213,0.1))",
};

// ─── Component Colors - Monochromatic with subtle moss accent ───
const COMPONENT_COLORS = {
  gpu: { bg: "hsl(45 15% 88%)", label: "GPU Inference", icon: Zap },      // Stone
  server: { bg: "hsl(0 0% 100%)", label: "Server & DC", icon: Server },       // White
  overhead: { bg: "hsl(0 0% 65%)", label: "Cooling", icon: Snowflake },           // Muted gray
  embodied: { bg: "hsl(0 0% 40%)", label: "Hardware", icon: Recycle },           // Darker gray
  training: { bg: "hsl(151 29% 49%)", label: "Training", icon: Factory },        // Moss (only accent)
};

// ─── OpenRouter pricing data (per 1M tokens) ───
const OPENROUTER_PRICING: Record<string, { prompt: number; completion: number }> = {
  "mistralai/Mistral-Small-3.2-24B-Instruct-2506": { prompt: 0.10, completion: 0.30 },
  "google/gemma-4-31B-it": { prompt: 0.10, completion: 0.30 },
  "openai/gpt-oss-120b": { prompt: 0.039, completion: 0.18 },
  "mistralai/Mistral-Medium-3.5-128B": { prompt: 0.40, completion: 2.00 },
  "zai-org/GLM-4.7": { prompt: 0.60, completion: 2.20 },
  "moonshotai/Kimi-K2.6": { prompt: 0.60, completion: 2.50 },
};

// ─── Model Popularity Data (from Hugging Face) ───
const getModelPopularity = (modelId: string): { queries: number; label: string } => {
  const profile = MODEL_PROFILES[modelId];
  if (!profile?.popularity) return { queries: 0, label: "Unknown" };
  
  const downloads = profile.popularity.downloadsPerMonth;
  // Estimate queries based on downloads (not all downloads = queries)
  const estimatedQueries = downloads * 10; // Rough estimate: 10 queries per download
  
  if (estimatedQueries > 50_000_000) return { queries: estimatedQueries, label: "Very Popular" };
  if (estimatedQueries > 10_000_000) return { queries: estimatedQueries, label: "Popular" };
  if (estimatedQueries > 1_000_000) return { queries: estimatedQueries, label: "Growing" };
  return { queries: estimatedQueries, label: "Niche" };
};

const MODEL_CATEGORIES = {
  popular: {
    label: "Popular Models",
    description: "Most used models across providers",
    icon: Sparkles,
    models: [
      { id: "mistralai/Mistral-Small-3.2-24B-Instruct-2506", name: "Mistral Small 24B" },
      { id: "google/gemma-4-31B-it", name: "Gemma 4 31B" },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "anthropic/claude-3-5-sonnet", name: "Claude 3.5 Sonnet" },
      { id: "meta-llama/Llama-3.3-70B-Instruct", name: "Llama 3.3 70B" },
      { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B" },
    ],
    defaultModel: "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
    responseTime: 0.8,
  },
  chat: {
    label: "Chat & Conversations",
    description: "Customer support, Q&A, writing assistance",
    icon: MessageSquare,
    models: [
      { id: "mistralai/Mistral-Small-3.2-24B-Instruct-2506", name: "Mistral Small 24B" },
      { id: "google/gemma-4-31B-it", name: "Gemma 4 31B" },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "anthropic/claude-3-5-sonnet", name: "Claude 3.5 Sonnet" },
      { id: "meta-llama/Llama-3.3-70B-Instruct", name: "Llama 3.3 70B" },
      { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B" },
      { id: "mistralai/Mistral-Medium-3.5-128B", name: "Mistral Medium 128B" },
    ],
    defaultModel: "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
    responseTime: 0.8,
  },
  code: {
    label: "Code & Analysis",
    description: "Software development, complex reasoning, research",
    icon: Code,
    models: [
      { id: "google/gemma-4-31B-it", name: "Gemma 4 31B" },
      { id: "zai-org/GLM-4.7", name: "GLM 4.7 47B" },
      { id: "moonshotai/Kimi-K2.6", name: "Kimi K2.6 1.1T MoE" },
      { id: "openai/gpt-4o", name: "GPT-4o" },
      { id: "anthropic/claude-3-opus", name: "Claude 3 Opus" },
    ],
    defaultModel: "zai-org/GLM-4.7",
    responseTime: 3.5,
  },
};

function formatCO2(grams: number): string {
  if (grams < 0.001) return `${(grams * 1000000).toFixed(1)} µg`;
  if (grams < 1) return `${(grams * 1000).toFixed(1)} mg`;
  if (grams < 1000) return `${grams.toFixed(1)} g`;
  if (grams < 1000000) return `${(grams / 1000).toFixed(1)} kg`;
  if (grams < 1000000000) return `${(grams / 1000000).toFixed(1)} t`;
  return `${(grams / 1000000000).toFixed(1)} kt`;
}

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i + 1 === step ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: i + 1 <= step ? "hsl(45 15% 88%)" : "rgba(229, 221, 213, 0.05)",
            transition: "all 0.3s ease",
          }}
        />
      ))}
      <span style={{ fontSize: "0.75rem", color: C.muted, marginLeft: "0.5rem" }}>
        {step}/{total}
      </span>
    </div>
  );
}

function Card({ children, selected, onClick }: { children: React.ReactNode; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "1.5rem",
        borderRadius: 12,
        border: `1px solid ${selected ? "rgba(229, 221, 213, 0.15)" : "rgba(229, 221, 213, 0.05)"}`,
        background: selected ? "rgba(229, 221, 213, 0.08)" : "rgba(26, 26, 26, 0.4)",
        cursor: onClick ? "pointer" : "default",
        textAlign: "left",
        color: C.cloud,
        width: "100%",
        transition: "all 0.2s ease",
      }}
    >
      {children}
    </button>
  );
}

export function CO2Calculator() {
  const [step, setStep] = useState(1);
  const [modelCategory, setModelCategory] = useState<"popular" | "chat" | "code">("popular");
  const [selectedModel, setSelectedModel] = useState(MODEL_CATEGORIES.popular.defaultModel);
  const [region, setRegion] = useState("usa");
  const [lifetimeQueries, setLifetimeQueries] = useState(100_000_000);
  const [gpuCondition, setGpuCondition] = useState<"new" | "refurbished">("new");
  const [otherComputeCondition, setOtherComputeCondition] = useState<"new" | "refurbished">("new");
  const [concurrency, setConcurrency] = useState(8);
  
  // Fetch dynamic model data from EcoLogits and OpenRouter
  const { data: fetchedModelData, loading: modelsLoading, error: modelsError, refresh: refreshModels } = useModelData();
  
  // Merge static and dynamic models
  const allModels = useMemo(() => 
    mergeModelData(MODEL_PROFILES, fetchedModelData),
    [fetchedModelData]
  );

  const category = MODEL_CATEGORIES[modelCategory];
  const model = allModels[selectedModel];
  const grid = GRID_REGIONS[region];

  const result = useMemo(() => {
    if (!model || !grid) return null;
    const hw = {
      ...HARDWARE_CONFIGS.h200,
      embodiedPerGpuKg: gpuCondition === "refurbished" ? 0 : HARDWARE_CONFIGS.h200.embodiedPerGpuKg,
      otherComputeEmbodiedKg: otherComputeCondition === "refurbished" ? 0 : HARDWARE_CONFIGS.h200.otherComputeEmbodiedKg,
    };
    
    return calculateInference({
      modelProfile: model,
      hardware: hw,
      deploymentGrid: grid,
      measuredResponseTimeSeconds: category.responseTime,
      inputTokens: model.defaultInputTokens,
      outputTokens: model.defaultOutputTokens,
      concurrency,
      hourOfDay: 14,
      includeTraining: false,
      lifetimeQueries,
    });
  }, [model, grid, gpuCondition, otherComputeCondition, category, concurrency, lifetimeQueries]);

  // Calculate results for all models in current category for comparison
  const modelComparisons = useMemo(() => {
    if (!grid) return [];
    const hw = {
      ...HARDWARE_CONFIGS.h200,
      embodiedPerGpuKg: gpuCondition === "refurbished" ? 0 : HARDWARE_CONFIGS.h200.embodiedPerGpuKg,
      otherComputeEmbodiedKg: otherComputeCondition === "refurbished" ? 0 : HARDWARE_CONFIGS.h200.otherComputeEmbodiedKg,
    };

    return category.models.map(m => {
      const profile = allModels[m.id];
      if (!profile) return null;
      
      // Each model has its own fixed lifetime based on real usage data
      const modelLifetimeQueries = getEstimatedLifetimeQueries(m.id);
      
      const res = calculateInference({
        modelProfile: profile,
        hardware: hw,
        deploymentGrid: grid,
        measuredResponseTimeSeconds: category.responseTime,
        inputTokens: profile.defaultInputTokens,
        outputTokens: profile.defaultOutputTokens,
        concurrency,
        hourOfDay: 14,
        includeTraining: false,
        lifetimeQueries: modelLifetimeQueries,
      });

      const popularity = getModelPopularity(m.id);
      
      return {
        id: m.id,
        name: m.name,
        parameters: profile.parameters,
        totalCO2: res.totalCO2Grams,
        gpuOperational: res.components.gpuOperational.co2Grams,
        embodied: res.components.embodiedGpu.co2Grams + res.components.embodiedOther.co2Grams,
        popularity: popularity?.label || "Unknown",
        popularityQueries: popularity?.queries || 0,
        lifetimeQueries: modelLifetimeQueries,
      };
    }).filter(Boolean);
  }, [grid, gpuCondition, otherComputeCondition, category, concurrency]);

  const totalSteps = 7;

  // Navigation handlers
  const canGoBack = step > 1;
  const canGoNext = step < 7;
  
  const goBack = () => canGoBack && setStep(step - 1);
  const goNext = () => canGoNext && setStep(step + 1);

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: C.night, 
      color: C.cloud, 
      fontFamily: "var(--berget-font-sans, 'DM Sans', system-ui, sans-serif)",
      paddingBottom: "160px",
    }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: "1rem 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Leaf size={20} strokeWidth={1.5} style={{ color: C.moss }} />
            <div>
              <div style={{ fontWeight: 600, color: C.peak, fontSize: "0.875rem" }}>CO₂ Impact Calculator</div>
            </div>
          </div>
          <StepIndicator step={step} total={totalSteps} />
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        
        {/* STEP 1: Use Case + Model */}
        {step === 1 && (
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              What are you building?
            </h1>
            <p style={{ color: C.muted, marginBottom: "1.5rem" }}>
              Select your use case and model
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {Object.entries(MODEL_CATEGORIES).map(([key, cat]) => (
                <Card
                  key={key}
                  selected={modelCategory === key}
                  onClick={() => {
                    setModelCategory(key as "popular" | "chat" | "code");
                    setSelectedModel(cat.defaultModel);
                    setLifetimeQueries(getEstimatedLifetimeQueries(cat.defaultModel));
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}>
                    <cat.icon size={32} strokeWidth={1.5} />
                  </div>
                  <div style={{ fontWeight: 600, color: C.peak, fontSize: "1rem" }}>{cat.label}</div>
                  <div style={{ fontSize: "0.75rem", color: C.muted }}>{cat.description}</div>
                </Card>
              ))}
            </div>

            <div style={{ background: C.ghost, borderRadius: 12, padding: "1rem", border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <div style={{ fontSize: "0.75rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Model
                </div>
                {modelsLoading && (
                  <div style={{ fontSize: "0.75rem", color: C.moss, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <RefreshCw size={12} className="spin" /> Loading models...
                  </div>
                )}
                {fetchedModelData && (
                  <button
                    onClick={refreshModels}
                    style={{
                      fontSize: "0.75rem",
                      color: C.muted,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                    title="Refresh model data"
                  >
                    <RefreshCw size={12} /> Refresh
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {category.models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      setLifetimeQueries(getEstimatedLifetimeQueries(m.id));
                    }}
                    style={{
                      padding: "0.5rem 0.75rem",
                      borderRadius: 6,
                      border: `1px solid ${selectedModel === m.id ? C.moss : C.border}`,
                      background: selectedModel === m.id ? C.mossDim : "transparent",
                      color: selectedModel === m.id ? C.moss : C.cloud,
                      cursor: "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
              {modelsError && (
                <div style={{ fontSize: "0.75rem", color: C.danger, marginTop: "0.5rem" }}>
                  Error loading models: {modelsError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Region */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              Where is it running?
            </h1>
            <p style={{ color: C.muted, marginBottom: "1.5rem" }}>
              Grid carbon intensity varies dramatically by location
            </p>

            {/* Globe - lazy loaded with fallback */}
            <div style={{ 
              background: C.ghost, 
              borderRadius: 12, 
              border: `1px solid ${C.border}`,
              overflow: "hidden",
              marginBottom: "1.5rem",
              minHeight: 420,
            }}>
              <Suspense fallback={
                <div style={{ 
                  height: 420, 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  color: C.muted,
                }}>
                  Loading 3D globe...
                </div>
              }>
                <GlobeSelector
                  selectedRegion={region}
                  onRegionSelect={setRegion}
                  showMode="intensity"
                />
              </Suspense>
            </div>

            {/* Compact region list */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", 
              gap: "0.5rem",
            }}>
              {Object.entries(GRID_REGIONS).map(([key, g]) => (
                <button
                  key={key}
                  onClick={() => setRegion(key)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: 6,
                    border: `1px solid ${region === key ? C.moss : C.border}`,
                    background: region === key ? C.mossDim : "transparent",
                    color: region === key ? C.moss : C.cloud,
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: g.intensityGPerKwh < 50 ? "#60A580" : 
                               g.intensityGPerKwh < 300 ? "#D4A574" : "#D1392E",
                    display: "inline-block",
                  }} />
                  <span style={{ flex: 1 }}>{g.name}</span>
                  <span style={{ color: C.muted, fontSize: "0.65rem" }}>{g.intensityGPerKwh}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Compare Models */}
        {step === 3 && (
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              Compare Models
            </h1>
            <p style={{ color: C.muted, marginBottom: "1.5rem" }}>
              See how your model compares to others — by size, emissions, and popularity.
            </p>

            {/* Model comparison */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {modelComparisons.map((comp) => {
                if (!comp) return null;
                const isSelected = comp.id === selectedModel;
                
                return (
                  <button
                    key={comp.id}
                    onClick={() => {
                      setSelectedModel(comp.id);
                      setLifetimeQueries(comp.lifetimeQueries);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem 1rem",
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? C.moss : C.border}`,
                      background: isSelected ? C.mossDim : C.ghost,
                      cursor: "pointer",
                      textAlign: "left",
                      color: C.cloud,
                      width: "100%",
                    }}
                  >
                    {/* Model info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 600, color: C.peak }}>{comp.name}</span>
                        {isSelected && <span style={{ color: C.moss }}>✓</span>}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.25rem" }}>
                        {(comp.parameters / 1_000_000_000).toFixed(1)}B params · {(comp.lifetimeQueries / 1_000_000_000).toFixed(1)}B lifetime queries
                      </div>
                    </div>

                    {/* CO₂ per query */}
                    <div style={{ textAlign: "right", minWidth: 100 }}>
                      <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600 }}>
                        {formatCO2(comp.totalCO2)}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: C.muted }}>CO₂/query</div>
                    </div>

                    {/* Visual bar */}
                    <div style={{ width: 80, display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ fontSize: "0.6rem", color: C.muted, textAlign: "right" }}>Total</div>
                      <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          width: `${Math.min(100, (comp.totalCO2 / 0.05) * 100)}%`,
                          height: "100%",
                          background: comp.totalCO2 < 0.01 ? "#60A580" : comp.totalCO2 < 0.03 ? "#8EB29F" : "#D4A574",
                          borderRadius: 3,
                        }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Insight */}
            {modelComparisons.length > 1 && (
              <div style={{ 
                marginTop: "1rem", 
                padding: "1rem", 
                background: "rgba(96, 165, 128, 0.08)", 
                borderRadius: 8,
                border: `1px solid ${C.borderMoss}`,
              }}>
                <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600, marginBottom: "0.5rem" }}>
                  Key Insight
                </div>
                <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                  Larger models generally produce more CO₂ per query due to higher GPU power draw.
                  However, efficient hardware and clean grids can offset this — a 70B model on Swedish hydro
                  can have lower emissions than an 8B model on a coal-heavy grid.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Hardware */}
        {step === 4 && (
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              Hardware
            </h1>
            <p style={{ color: C.muted, marginBottom: "1.5rem" }}>
              GPU and supporting infrastructure — new or refurbished?
            </p>

            {/* GPU Selection */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: C.peak, marginBottom: "0.75rem" }}>
                GPU (NVIDIA H200 ×8)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <Card 
                  selected={gpuCondition === "new"} 
                  onClick={() => setGpuCondition("new")}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}><Sparkles size={32} strokeWidth={1.5} /></div>
                  <div style={{ fontWeight: 600, color: C.peak }}>New GPU</div>
                  <div style={{ fontSize: "0.75rem", color: C.muted }}>Full embodied carbon</div>
                  <div style={{ fontSize: "0.875rem", color: C.danger, marginTop: "0.5rem" }}>
                    +{formatCO2((HARDWARE_CONFIGS.h200.embodiedPerGpuKg * 1000) / (5 * 365 * 24 * 3600) * 2)} per query
                  </div>
                </Card>
                <Card 
                  selected={gpuCondition === "refurbished"} 
                  onClick={() => setGpuCondition("refurbished")}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}><Recycle size={32} strokeWidth={1.5} /></div>
                  <div style={{ fontWeight: 600, color: C.peak }}>Refurbished GPU</div>
                  <div style={{ fontSize: "0.75rem", color: C.muted }}>Zero embodied carbon</div>
                  <div style={{ fontSize: "0.875rem", color: C.moss, marginTop: "0.5rem" }}>
                    0 g per query
                  </div>
                </Card>
              </div>
            </div>

            {/* Other Compute Selection */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: C.peak, marginBottom: "0.75rem" }}>
                Other Compute (CPU, RAM, SSD, Network)
              </div>
              <div style={{ fontSize: "0.75rem", color: C.muted, marginBottom: "0.75rem" }}>
                3× 1U servers + 2× firewalls + 2× switches
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <Card 
                  selected={otherComputeCondition === "new"} 
                  onClick={() => setOtherComputeCondition("new")}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}><Factory size={32} strokeWidth={1.5} /></div>
                  <div style={{ fontWeight: 600, color: C.peak }}>New Infrastructure</div>
                  <div style={{ fontSize: "0.75rem", color: C.muted }}>Full embodied carbon</div>
                  <div style={{ fontSize: "0.875rem", color: C.danger, marginTop: "0.5rem" }}>
                    +{formatCO2((HARDWARE_CONFIGS.h200.otherComputeEmbodiedKg * 1000) / (5 * 365 * 24 * 3600) / 8)} per query
                  </div>
                </Card>
                <Card 
                  selected={otherComputeCondition === "refurbished"} 
                  onClick={() => setOtherComputeCondition("refurbished")}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}><Recycle size={32} strokeWidth={1.5} /></div>
                  <div style={{ fontWeight: 600, color: C.peak }}>Refurbished Infrastructure</div>
                  <div style={{ fontSize: "0.75rem", color: C.muted }}>Zero embodied carbon</div>
                  <div style={{ fontSize: "0.875rem", color: C.moss, marginTop: "0.5rem" }}>
                    0 g per query
                  </div>
                </Card>
              </div>
            </div>

            <Card>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ color: C.peak, fontWeight: 600 }}>Concurrent Requests</span>
                  <span style={{ color: C.moss }}>{concurrency}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={64}
                  step={1}
                  value={concurrency}
                  onChange={(e) => setConcurrency(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.25rem" }}>
                  More concurrent requests = lower cost per request (shared infrastructure)
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* STEP 5: Results */}
        {step === 5 && result && (
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              Your Carbon Footprint
            </h1>
            <p style={{ color: C.muted, marginBottom: "1.5rem" }}>
              Complete breakdown per request
            </p>

            {/* Total with Globe Background */}
            <div style={{ 
              position: "relative",
              borderRadius: 12, 
              padding: "1.5rem", 
              border: `1px solid ${C.borderStrong}`,
              marginBottom: "1.5rem",
              textAlign: "center",
              overflow: "hidden",
              minHeight: 200,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}>
              {/* Globe background image */}
              <div style={{
                position: "absolute",
                top: "-50%",
                left: "-50%",
                right: "-50%",
                bottom: "-50%",
                backgroundImage: "url(//unpkg.com/three-globe/example/img/earth-dark.jpg)",
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                opacity: 0.6,
              }} />
              {/* Dark overlay for readability */}
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "radial-gradient(ellipse at center, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.85) 70%)",
              }} />
              {/* Content */}
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontSize: "0.875rem", color: C.muted, marginBottom: "0.5rem" }}>Total CO₂ per request</div>
                <div style={{ fontSize: "3rem", fontWeight: 700, color: C.stone, lineHeight: 1.1 }}>
                  {formatCO2(result.totalCO2Grams)}
                </div>
                <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.5rem" }}>
                  {model?.displayName} on {grid.name}
                </div>
              </div>
            </div>

            {/* Coffee Comparison */}
            <div style={{ 
              background: "rgba(229, 221, 213, 0.06)", 
              borderRadius: 12, 
              padding: "1.5rem", 
              border: `1px solid ${C.borderStrong}`,
              marginBottom: "1.5rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <Coffee size={24} strokeWidth={1.5} style={{ color: C.peak }} />
                <span style={{ fontWeight: 600, color: C.peak }}>For Comparison</span>
              </div>
              
              {(() => {
                // A microwaved cup: 800W for 2 min (120s) = 0.03 kWh
                // Sweden: 0.03 kWh × 8 g/kWh = 0.24g CO₂
                const coffeeCO2PerSecond = 0.24 / 120; // grams CO2 per second of microwaving in Sweden
                const seconds = result.totalCO2Grams / coffeeCO2PerSecond;
                
                return (
                  <div>
                    <div style={{ 
                      display: "flex", 
                      alignItems: "baseline", 
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                    }}>
                      <span style={{ fontSize: "2rem", fontWeight: 700, color: C.stone }}>
                        {seconds < 1 ? "< 1" : seconds < 60 ? Math.round(seconds) : (seconds / 60).toFixed(1)}
                      </span>
                      <span style={{ fontSize: "1rem", color: C.cloud }}>
                        {seconds < 60 ? "seconds" : "minutes"} of microwaving coffee in Sweden
                      </span>
                    </div>
                    
                    <div style={{ 
                      height: 8, 
                      background: "rgba(0,0,0,0.3)", 
                      borderRadius: 4, 
                      overflow: "hidden",
                      marginBottom: "0.75rem",
                    }}>
                      <div style={{
                        width: `${Math.min(100, (seconds / 120) * 100)}%`,
                        height: "100%",
                        background: seconds < 30 ? C.moss : seconds < 60 ? C.sage : C.stone,
                        borderRadius: 4,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                    
                    <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                      One AI request = {seconds < 1 ? "less than a second" : `${Math.round(seconds)} seconds`} of running an 800W microwave in Sweden.
                      A full cup takes ~2 minutes.
                    </p>
                    
                    <div style={{ 
                      marginTop: "0.75rem",
                      padding: "0.75rem",
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: 8,
                      fontSize: "0.75rem",
                      color: C.muted,
                    }}>
                      <strong style={{ color: C.peak }}>Context:</strong> Sweden's grid is 8 g/kWh (hydro + nuclear). 
                      In Germany (380 g/kWh), the same AI request would equal {Math.round(seconds * (380/8))} seconds of microwaving.
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {[
                { key: "gpuOperational", label: "GPU Energy", color: COMPONENT_COLORS.gpu.bg },
                { key: "serverOperational", label: "Server & DC", color: COMPONENT_COLORS.server.bg },
                { key: "datacenterOverhead", label: "Cooling", color: COMPONENT_COLORS.overhead.bg },
                { key: "embodiedGpu", label: "GPU Hardware", color: COMPONENT_COLORS.embodied.bg },
                { key: "embodiedOther", label: "Other Compute", color: COMPONENT_COLORS.embodied.bg },
              ].map((item) => {
                const value = result.components[item.key as keyof typeof result.components].co2Grams;
                const pct = (value / result.totalCO2Grams) * 100;
                return (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                    <div style={{ flex: 1, fontSize: "0.875rem" }}>{item.label}</div>
                    <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600 }}>{formatCO2(value)}</div>
                    <div style={{ fontSize: "0.75rem", color: C.muted, width: 40, textAlign: "right" }}>{pct.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>

            {/* Water */}
            <div style={{ 
              background: "rgba(26, 26, 26, 0.6)", 
              borderRadius: 12, 
              padding: "1rem", 
              border: `1px solid ${C.borderStrong}`,
              marginBottom: "1.5rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Droplets size={16} strokeWidth={1.5} style={{ color: C.peak }} />
                <span style={{ fontWeight: 600, color: C.peak }}>Water Usage</span>
              </div>
              <div style={{ fontSize: "1.25rem", color: result.waterLiters === 0 ? C.moss : C.stone }}>
                {result.waterLiters === 0 
                  ? "0 L (free-air cooling)" 
                  : `${(result.waterLiters * 1000).toFixed(2)} ml per request`
                }
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Why the Difference */}
        {step === 6 && (
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              Why the Difference?
            </h1>
            <p style={{ color: C.muted, marginBottom: "1.5rem" }}>
              Understanding what drives emissions
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <Zap size={24} strokeWidth={1.5} style={{ color: C.peak }} />
                  <div style={{ fontWeight: 600, color: C.peak }}>Grid Carbon Intensity</div>
                </div>
                <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                  Sweden: 8 g/kWh (hydro + nuclear) vs Texas: 420 g/kWh (gas + coal). 
                  Same GPU, same work, 50× difference in emissions.
                </p>
                <SourceCitation source="IEA 2024 / EPA eGRID 2023" url="https://www.iea.org/data-and-statistics" />
              </Card>

              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <Snowflake size={24} strokeWidth={1.5} style={{ color: C.peak }} />
                  <div style={{ fontWeight: 600, color: C.peak }}>Cooling</div>
                </div>
                <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                  Cold climates use free-air cooling (PUE 1.15). Hot climates need 
                  energy-intensive mechanical cooling (PUE 1.80). That's 57% more energy 
                  just for cooling.
                </p>
                <SourceCitation source="Uptime Institute 2024" url="https://uptimeinstitute.com/resources/research-and-reports" />
              </Card>

              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <Droplets size={24} strokeWidth={1.5} style={{ color: C.peak }} />
                  <div style={{ fontWeight: 600, color: C.peak }}>Water Usage</div>
                </div>
                <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                  Nordic datacenters use zero water. Evaporative cooling in hot/dry 
                  climates can consume 1.5-2.0 liters per kWh. At scale, that's 
                  millions of liters per day.
                </p>
                <SourceCitation source="Nature 2021 / US DOE" url="https://www.nature.com/articles/s41586-021-03439-8" />
              </Card>

              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <Recycle size={24} strokeWidth={1.5} style={{ color: C.peak }} />
                  <div style={{ fontWeight: 600, color: C.peak }}>Hardware Lifecycle</div>
                </div>
                <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                  Manufacturing a GPU creates ~1 ton of CO₂. New hardware amortizes 
                  this over its lifetime. Refurbished hardware has zero embodied carbon 
                  since it was already manufactured.
                </p>
                <SourceCitation source="NVIDIA HGX PCF / Supermicro LCA" />
              </Card>
            </div>
          </div>
        )}
        {/* STEP 7: What now? */}
        {step === 7 && (
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              What Now?
            </h1>
            <p style={{ color: C.muted, marginBottom: "1.5rem" }}>
              Start measuring CO₂ in every LLM call
            </p>

            {/* Call to action */}
            <div style={{ 
              background: "rgba(96, 165, 128, 0.08)", 
              borderRadius: 12, 
              padding: "1.5rem", 
              border: `1px solid ${C.borderMoss}`,
              marginBottom: "1.5rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <Globe size={24} strokeWidth={1.5} style={{ color: C.moss }} />
                <span style={{ fontWeight: 600, color: C.peak, fontSize: "1.125rem" }}>Include CO₂ in Every Response</span>
              </div>
              <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0, marginBottom: "1rem" }}>
                Just like Berget AI does — return <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.125rem 0.25rem", borderRadius: 4, fontFamily: "monospace" }}>co2_grams</code> and <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.125rem 0.25rem", borderRadius: 4, fontFamily: "monospace" }}>gpu_energy_joules</code> in your API responses. 
                Your users deserve to know the environmental cost of each request.
              </p>
              
              <div style={{ background: C.ghost, borderRadius: 12, padding: "1rem", border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600, marginBottom: "0.5rem" }}>
                  <Code size={16} strokeWidth={1.5} style={{ marginRight: "0.5rem" }} /> Example: Berget AI API
                </div>
                <pre style={{
                  margin: 0,
                  padding: "0.75rem",
                  background: "rgba(0,0,0,0.5)",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  overflow: "auto",
                  color: C.cloud,
                }}>
{`❯ curl https://api.berget.ai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $BERGET_API_KEY" \\
  -d '{
    "model": "${selectedModel}",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

{
  "choices": [...],
  "usage": {
    "co2_grams": ${(result?.totalCO2Grams || 0).toFixed(6)},
    "gpu_energy_joules": ${((result?.components.gpuOperational.energyKwh || 0) * 3_600_000).toFixed(1)},
    "prompt_tokens": ${model?.defaultInputTokens || 0},
    "completion_tokens": ${model?.defaultOutputTokens || 0},
    "total_tokens": ${(model?.defaultInputTokens || 0) + (model?.defaultOutputTokens || 0)}
  }
}`}
                </pre>
              </div>
            </div>

            {/* Library code */}
            <div style={{ background: C.ghost, borderRadius: 12, padding: "1rem", border: `1px solid ${C.border}`, marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600, marginBottom: "0.5rem" }}>
                <Wrench size={16} strokeWidth={1.5} style={{ marginRight: "0.5rem" }} /> Use this library
              </div>
              <pre style={{
                margin: 0,
                padding: "0.75rem",
                background: "rgba(0,0,0,0.5)",
                borderRadius: 6,
                fontSize: "0.75rem",
                overflow: "auto",
                color: C.cloud,
              }}>
{`import { calculateInference } from "@berget/co2-calculator";

const result = calculateInference({
  modelProfile: MODEL_PROFILES["${selectedModel}"],
  hardware: HARDWARE_CONFIGS.h200,
  deploymentGrid: GRID_REGIONS["${region}"],
  measuredResponseTimeSeconds: ${category.responseTime},
  inputTokens: ${model?.defaultInputTokens},
  outputTokens: ${model?.defaultOutputTokens},
  concurrency: ${concurrency},
  hourOfDay: 14,
  includeTraining: false,
  lifetimeQueries: ${lifetimeQueries.toLocaleString()},
});

// Total: ${formatCO2(result?.totalCO2Grams || 0)} CO₂e per request`}
              </pre>
            </div>

            {/* Links */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <a 
                href="https://github.com/berget-ai/co2-emissions-calculator" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "1rem",
                  background: C.ghost,
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  color: C.cloud,
                  textDecoration: "none",
                  fontSize: "0.875rem",
                }}
              >
                <Code size={18} strokeWidth={1.5} />
                <span>GitHub Repository</span>
              </a>
              <a 
                href="https://berget.ai/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "1rem",
                  background: C.ghost,
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  color: C.cloud,
                  textDecoration: "none",
                  fontSize: "0.875rem",
                }}
              >
                <Globe size={18} strokeWidth={1.5} />
                <span>Berget AI Docs</span>
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Progressive Footer with Navigation */}
      <EmissionsFooter 
        step={step} 
        result={result}
        onBack={goBack}
        onNext={goNext}
        onReset={() => {
          setStep(1);
          setModelCategory("popular");
          setSelectedModel(MODEL_CATEGORIES.popular.defaultModel);
          setRegion("usa");
          setGpuCondition("new");
          setOtherComputeCondition("new");
          setConcurrency(8);
          setLifetimeQueries(100_000_000);
        }}
        canGoBack={canGoBack}
        canGoNext={canGoNext}
      />
    </div>
  );
}

// ─── Progressive Emissions Footer ───
function EmissionsFooter({ 
  step, 
  result,
  onBack,
  onNext,
  onReset,
  canGoBack,
  canGoNext,
}: { 
  step: number; 
  result: ReturnType<typeof calculateInference> | null;
  onBack: () => void;
  onNext: () => void;
  onReset: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
}) {
  if (!result) return null;

  const components = [
    { 
      key: "gpu", 
      value: result.components.gpuOperational.co2Grams, 
      color: COMPONENT_COLORS.gpu.bg,
      label: COMPONENT_COLORS.gpu.label,
      step: 1,
    },
    { 
      key: "server", 
      value: result.components.serverOperational.co2Grams, 
      color: COMPONENT_COLORS.server.bg,
      label: COMPONENT_COLORS.server.label,
      step: 2,
    },
    { 
      key: "overhead", 
      value: result.components.datacenterOverhead.co2Grams, 
      color: COMPONENT_COLORS.overhead.bg,
      label: `Cooling`,
      step: 2,
    },
    { 
      key: "embodiedGpu", 
      value: result.components.embodiedGpu.co2Grams, 
      color: COMPONENT_COLORS.embodied.bg,
      label: `GPU${result.components.embodiedGpu.co2Grams === 0 ? " (0)" : ""}`,
      step: 4,
    },
    { 
      key: "embodiedOther", 
      value: result.components.embodiedOther.co2Grams, 
      color: COMPONENT_COLORS.embodied.bg,
      label: `Infra${result.components.embodiedOther.co2Grams === 0 ? " (0)" : ""}`,
      step: 4,
    },
  ];

  const total = result.totalCO2Grams;
  const visibleComponents = components.filter(c => c.step <= step);
  const currentTotal = visibleComponents.reduce((sum, c) => sum + c.value, 0);

  return (
    <footer style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "rgba(10, 10, 10, 0.98)",
      backdropFilter: "blur(10px)",
      borderTop: `1px solid ${C.border}`,
      padding: "1rem 0",
      zIndex: 100,
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 1rem" }}>
        {/* Progress bar with labels */}
        <div style={{ marginBottom: "0.75rem" }}>
          {/* Labels above bar */}
          <div style={{ 
            display: "flex", 
            height: 20,
            marginBottom: 4,
          }}>
            {components.filter(c => c.step <= step).map((comp) => {
              const width = (comp.value / total) * 100;
              return (
                <div
                  key={comp.key}
                  style={{
                    width: `${width}%`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    color: comp.color,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    opacity: width > 5 ? 1 : 0,
                    transition: "opacity 0.3s ease",
                  }}
                >
                  {width > 8 ? comp.label : ""}
                </div>
              );
            })}
          </div>
          
          {/* The bar */}
          <div style={{ 
            display: "flex", 
            height: 8, 
            borderRadius: 4, 
            overflow: "hidden",
            background: "rgba(26, 26, 26, 0.6)",
          }}>
            {components.map((comp) => {
              const isVisible = comp.step <= step;
              const width = (comp.value / total) * 100;
              return (
                <div
                  key={comp.key}
                  style={{
                    width: `${width}%`,
                    background: isVisible ? comp.color : "transparent",
                    opacity: isVisible ? 1 : 0.1,
                    transition: "all 0.5s ease",
                  }}
                  title={`${comp.label}: ${formatCO2(comp.value)}`}
                />
              );
            })}
          </div>
          
          {/* Values below bar */}
          <div style={{ 
            display: "flex", 
            height: 16,
            marginTop: 4,
          }}>
            {components.filter(c => c.step <= step).map((comp) => {
              const width = (comp.value / total) * 100;
              return (
                <div
                  key={comp.key}
                  style={{
                    width: `${width}%`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    color: "rgba(255,255,255,0.5)",
                    fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    opacity: width > 5 ? 1 : 0,
                    transition: "opacity 0.3s ease",
                  }}
                >
                  {width > 8 ? formatCO2(comp.value) : ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* Total + Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Total */}
          <div style={{ 
            fontSize: "1.1rem", 
            fontWeight: 700, 
            color: step === 6 ? C.stone : C.peak,
            fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)",
            whiteSpace: "nowrap",
            minWidth: 80,
          }}>
            {formatCO2(step === 7 ? total : currentTotal)}
          </div>
          
          {/* Navigation Buttons */}
          <div style={{
            display: "flex",
            gap: "0.75rem",
            flex: 1,
          }}>
          <button
            onClick={onBack}
            disabled={!canGoBack}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: 8,
              background: "transparent",
              color: canGoBack ? C.muted : "rgba(255,255,255,0.2)",
              border: `1px solid ${canGoBack ? C.border : "rgba(255,255,255,0.1)"}`,
              cursor: canGoBack ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
          >
            ← Back
          </button>
          <button
            onClick={step === 7 ? onReset : onNext}
            disabled={!canGoNext && step !== 7}
            style={{
              flex: 2,
              padding: "0.75rem",
              borderRadius: 8,
              background: step === 7 || canGoNext ? "hsl(45 15% 88%)" : "rgba(229, 221, 213, 0.2)",
              color: step === 7 || canGoNext ? "#0A0A0A" : "rgba(255,255,255,0.3)",
              border: "none",
              cursor: step === 7 || canGoNext ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            {step === 7 ? "Start Over ↺" : "Next →"}
          </button>
        </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Button Styles ───
const btnPrimary = {
  marginTop: "1.5rem",
  width: "100%",
  padding: "1rem",
  borderRadius: 12,
  background: C.moss,
  color: C.night,
  border: "none",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
};

const btnSecondary = {
  flex: 1,
  padding: "1rem",
  borderRadius: 12,
  background: "transparent",
  color: C.muted,
  border: `1px solid ${C.border}`,
  cursor: "pointer",
};

const btnOutline = {
  flex: 1,
  padding: "1rem",
  borderRadius: 12,
  background: "transparent",
  color: C.moss,
  border: `1px solid ${C.moss}`,
  cursor: "pointer",
};
