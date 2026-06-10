import { useState, useMemo, lazy, Suspense } from "react";
import {
  Zap, Server, Snowflake, Droplets, Recycle, Factory, Coffee, Code, MessageSquare, Leaf, Wrench, Globe, Check, Sparkles
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
    chat: {
      label: "Chat & Conversations",
      description: "Customer support, Q&A, writing assistance",
      icon: MessageSquare,
      models: [
      { id: "mistralai/Mistral-Small-3.2-24B-Instruct-2506", name: "Mistral Small (24B)" },
      { id: "google/gemma-4-31B-it", name: "Gemma 4 (31B)" },
      { id: "openai/gpt-oss-120b", name: "GPT-OSS (120B)" },
      { id: "mistralai/Mistral-Medium-3.5-128B", name: "Mistral Medium (128B)" },
    ],
    defaultModel: "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
    responseTime: 0.8,
  },
    code: {
      label: "Code & Analysis",
      description: "Software development, complex reasoning, research",
      icon: Code,
      models: [
      { id: "google/gemma-4-31B-it", name: "Gemma 4 (31B)" },
      { id: "zai-org/GLM-4.7", name: "GLM 4.7 (47B)" },
      { id: "moonshotai/Kimi-K2.6", name: "Kimi K2.6 (1.1T MoE)" },
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
  const [modelCategory, setModelCategory] = useState<"chat" | "code">("chat");
  const [selectedModel, setSelectedModel] = useState(MODEL_CATEGORIES.chat.defaultModel);
  const [region, setRegion] = useState("usa");
  const [lifetimeQueries, setLifetimeQueries] = useState(100_000_000);
  const [hardwareCondition, setHardwareCondition] = useState<"new" | "refurbished">("new");
  const [concurrency, setConcurrency] = useState(8);
  const [includeTraining, setIncludeTraining] = useState(false); // Default OFF per user request

  const category = MODEL_CATEGORIES[modelCategory];
  const model = MODEL_PROFILES[selectedModel];
  const grid = GRID_REGIONS[region];

  const result = useMemo(() => {
    if (!model || !grid) return null;
    const hw = hardwareCondition === "refurbished" 
      ? { ...HARDWARE_CONFIGS.h200, embodiedPerGpuKg: 0 }
      : HARDWARE_CONFIGS.h200;
    
    return calculateInference({
      modelProfile: model,
      hardware: hw,
      deploymentGrid: grid,
      measuredResponseTimeSeconds: category.responseTime,
      inputTokens: model.defaultInputTokens,
      outputTokens: model.defaultOutputTokens,
      concurrency,
      hourOfDay: 14,
      includeTraining,
      lifetimeQueries,
    });
  }, [model, grid, hardwareCondition, category, concurrency, lifetimeQueries, includeTraining]);

  // Calculate results for all models in current category for comparison
  const modelComparisons = useMemo(() => {
    if (!grid) return [];
    const hw = hardwareCondition === "refurbished" 
      ? { ...HARDWARE_CONFIGS.h200, embodiedPerGpuKg: 0 }
      : HARDWARE_CONFIGS.h200;

    return category.models.map(m => {
      const profile = MODEL_PROFILES[m.id];
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
        includeTraining,
        lifetimeQueries: modelLifetimeQueries,
      });

      const popularity = getModelPopularity(m.id);
      
      return {
        id: m.id,
        name: m.name,
        parameters: profile.parameters,
        totalCO2: res.totalCO2Grams,
        trainingCO2: res.components.trainingAmortised.co2Grams,
        popularity: popularity?.label || "Unknown",
        popularityQueries: popularity?.queries || 0,
        lifetimeQueries: modelLifetimeQueries,
      };
    }).filter(Boolean);
  }, [grid, hardwareCondition, category, concurrency, includeTraining]);

  const totalSteps = 6;

  // Navigation handlers
  const canGoBack = step > 1;
  const canGoNext = step < 6;
  
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
                    setModelCategory(key as "chat" | "code");
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
              <div style={{ fontSize: "0.75rem", color: C.muted, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Model
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

        {/* STEP 3: Training vs Inference */}
        {step === 3 && (
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              The Training Cost
            </h1>
            <p style={{ color: C.muted, marginBottom: "1.5rem" }}>
              Training happens once. Inference happens billions of times.
            </p>

            {/* Training toggle */}
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.75rem",
              marginBottom: "1.5rem",
              padding: "0.75rem 1rem",
              background: C.ghost,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: C.peak }}>
                  Include training emissions in total
                </div>
                <div style={{ fontSize: "0.75rem", color: C.muted }}>
                  Training data has high uncertainty (±50%). Toggle off to focus on operational emissions only.
                </div>
              </div>
              <button
                onClick={() => setIncludeTraining(!includeTraining)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: 6,
                  border: `1px solid ${includeTraining ? C.moss : C.border}`,
                  background: includeTraining ? C.mossDim : "transparent",
                  color: includeTraining ? C.moss : C.muted,
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                {includeTraining ? "ON ✓" : "OFF"}
              </button>
            </div>

            {/* Explanation cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <Card>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}><Factory size={32} strokeWidth={1.5} /></div>
                <div style={{ fontWeight: 600, color: C.peak, marginBottom: "0.25rem" }}>Training</div>
                <div style={{ fontSize: "0.75rem", color: C.muted }}>
                  One-time event. GPUs run for weeks/months to teach the model patterns from data.
                </div>
                <div style={{ fontSize: "0.875rem", color: C.danger, marginTop: "0.5rem", fontWeight: 600 }}>
                  {model ? formatCO2(model.totalTrainingCO2Grams / 1000) + " kg CO₂" : "—"}
                </div>
                <SourceCitation source={model?.trainingSource || "Manufacturer estimate"} />
              </Card>
              <Card>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}><Zap size={32} strokeWidth={1.5} /></div>
                <div style={{ fontWeight: 600, color: C.peak, marginBottom: "0.25rem" }}>Inference</div>
                <div style={{ fontSize: "0.75rem", color: C.muted }}>
                  Every time someone sends a prompt. Your query from Step 1.
                </div>
                <div style={{ fontSize: "0.875rem", color: C.moss, marginTop: "0.5rem", fontWeight: 600 }}>
                  {result ? formatCO2(result.totalCO2Grams - result.components.trainingAmortised.co2Grams) + " per query" : "—"}
                </div>
              </Card>
            </div>

            {/* Visual comparison */}
            {model && (
              <Card>
                <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600, marginBottom: "1rem" }}>
                  How training cost is shared
                </div>
                
                {/* Training bar */}
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: C.muted }}>Total training emissions</span>
                    <span style={{ fontSize: "0.75rem", color: C.peak }}>{formatCO2(model.totalTrainingCO2Grams / 1000)} kg</span>
                  </div>
                  <div style={{ height: 24, background: "rgba(209, 57, 46, 0.15)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      width: "100%",
                      height: "100%",
                      background: "#D1392E",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: "0.5rem",
                    }}>
                      <span style={{ fontSize: "0.7rem", color: "#fff", fontWeight: 600 }}>Training (one-time)</span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ textAlign: "center", margin: "0.75rem 0", fontSize: "1.25rem", color: C.muted }}>
                  ÷ {(lifetimeQueries / 1_000_000_000).toFixed(1)}B queries
                </div>

                {/* Per-query bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: C.muted }}>Your share per query</span>
                    <span style={{ fontSize: "0.75rem", color: C.peak }}>
                      {result ? formatCO2(result.components.trainingAmortised.co2Grams) : "—"}
                    </span>
                  </div>
                  <div style={{ height: 24, background: "rgba(96, 165, 128, 0.15)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.max(0.5, (result?.components.trainingAmortised.co2Grams || 0) / (model.totalTrainingCO2Grams / 1000) * 100)}%`,
                      height: "100%",
                      background: "#60A580",
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: "0.5rem",
                    }}>
                      <span style={{ fontSize: "0.7rem", color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>
                        Per query
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(0,0,0,0.2)", borderRadius: 6 }}>
                  <div style={{ fontSize: "0.75rem", color: C.muted }}>
                    <strong style={{ color: C.peak }}>Why so small?</strong> The training cost is divided among all users of the model. 
                    Based on OpenRouter data, {model.displayName} serves approximately {(lifetimeQueries / 1_000_000_000).toFixed(1)} billion queries over its lifetime.
                  </div>
                  <SourceCitation 
                    source="OpenRouter API (api/frontend/v1/stats/model-activity)" 
                    url="https://openrouter.ai/"
                  />
                </div>
              </Card>
            )}

            {/* Model comparison */}
            <div style={{ marginTop: "2rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: C.peak, marginBottom: "0.5rem" }}>
                Compare Models
              </h2>
              <p style={{ color: C.muted, marginBottom: "1rem", fontSize: "0.875rem" }}>
                Larger models cost more to train, but popular models serve more queries
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {modelComparisons.map((comp) => {
                  if (!comp) return null;
                  const isSelected = comp.id === selectedModel;
                  const trainingPerQuery = comp.trainingCO2;
                  
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

                      {/* Training cost per query */}
                      <div style={{ textAlign: "right", minWidth: 100 }}>
                        <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600 }}>
                          {formatCO2(trainingPerQuery)}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: C.muted }}>training/query</div>
                      </div>

                      {/* Visual bar */}
                      <div style={{ width: 80, display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ fontSize: "0.6rem", color: C.muted, textAlign: "right" }}>Training cost</div>
                        <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{
                            width: `${Math.min(100, (trainingPerQuery / 0.01) * 100)}%`,
                            height: "100%",
                            background: trainingPerQuery < 0.001 ? "#60A580" : trainingPerQuery < 0.01 ? "#8EB29F" : "#D4A574",
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
                    💡 Key Insight
                  </div>
                  <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                    {model?.displayName} costs {formatCO2(model?.totalTrainingCO2Grams || 0)} to train, 
                    but serves ~{(getEstimatedLifetimeQueries(selectedModel) / 1_000_000_000).toFixed(1)}B queries. 
                    Your share: {result ? formatCO2(result.components.trainingAmortised.co2Grams) : "—"} per request. 
                    Compare with {(modelComparisons.find(m => m?.id === "openai/gpt-oss-120b")?.name)} at {formatCO2((modelComparisons.find(m => m?.id === "openai/gpt-oss-120b")?.trainingCO2 || 0))} — 
                    cheaper per query despite higher training cost because it's used more.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Hardware */}
        {step === 4 && (
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              Hardware
            </h1>
            <p style={{ color: C.muted, marginBottom: "1.5rem" }}>
              New or refurbished? How many share the server?
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <Card 
                selected={hardwareCondition === "new"} 
                onClick={() => setHardwareCondition("new")}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}><Sparkles size={32} strokeWidth={1.5} /></div>
                <div style={{ fontWeight: 600, color: C.peak }}>New Hardware</div>
                <div style={{ fontSize: "0.75rem", color: C.muted }}>Full embodied carbon</div>
                <div style={{ fontSize: "0.875rem", color: C.danger, marginTop: "0.5rem" }}>
                  +{formatCO2((HARDWARE_CONFIGS.h200.embodiedPerGpuKg * 1000) / (5 * 365 * 24 * 3600) * 2)} per query
                </div>
              </Card>
              <Card 
                selected={hardwareCondition === "refurbished"} 
                onClick={() => setHardwareCondition("refurbished")}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}><Recycle size={32} strokeWidth={1.5} /></div>
                <div style={{ fontWeight: 600, color: C.peak }}>Refurbished</div>
                <div style={{ fontSize: "0.75rem", color: C.muted }}>Zero embodied carbon</div>
                <div style={{ fontSize: "0.875rem", color: C.moss, marginTop: "0.5rem" }}>
                  0 g per query
                </div>
              </Card>
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

        {/* STEP 5: Explanation */}
        {step === 5 && (
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

        {/* STEP 6: Summary + Code */}
        {step === 6 && result && (
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              Your Carbon Footprint
            </h1>
            <p style={{ color: C.muted, marginBottom: "1.5rem" }}>
              Complete breakdown per request
            </p>

            {/* Total */}
            <div style={{ 
              background: "rgba(229, 221, 213, 0.08)", 
              borderRadius: 12, 
              padding: "1.5rem", 
              border: `1px solid ${C.borderStrong}`,
              marginBottom: "1.5rem",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "0.875rem", color: C.muted }}>Total CO₂ per request</div>
              <div style={{ fontSize: "2.5rem", fontWeight: 700, color: C.stone }}>
                {formatCO2(result.totalCO2Grams)}
              </div>
              <div style={{ fontSize: "0.75rem", color: C.muted }}>
                {model?.displayName} on {grid.name}
              </div>
            </div>

            {/* Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {[
                { key: "gpuOperational", label: "GPU Energy", color: COMPONENT_COLORS.gpu.bg },
                { key: "serverOperational", label: "Server & DC", color: COMPONENT_COLORS.server.bg },
                { key: "datacenterOverhead", label: "Cooling", color: COMPONENT_COLORS.overhead.bg },
                { key: "embodied", label: "Hardware", color: COMPONENT_COLORS.embodied.bg },
                ...(includeTraining ? [{ key: "trainingAmortised", label: "Training", color: COMPONENT_COLORS.training.bg }] : []),
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

            {/* Code Example */}
            <div style={{ background: C.ghost, borderRadius: 12, padding: "1rem", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600, marginBottom: "0.5rem" }}>
                <Wrench size={16} strokeWidth={1.5} style={{ marginRight: "0.5rem" }} /> Use this in your code
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
  includeTraining: true,
  lifetimeQueries: ${lifetimeQueries.toLocaleString()},
});

// Total: ${formatCO2(result.totalCO2Grams)} CO₂e per request`}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* Progressive Footer with Navigation */}
      <EmissionsFooter 
        step={step} 
        result={result}
        includeTraining={includeTraining}
        onBack={goBack}
        onNext={goNext}
        onReset={() => {
          setStep(1);
          setModelCategory("chat");
          setSelectedModel(MODEL_CATEGORIES.chat.defaultModel);
          setRegion("usa");
          setHardwareCondition("new");
          setConcurrency(8);
          setLifetimeQueries(100_000_000);
          setIncludeTraining(false);
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
  includeTraining,
  onBack,
  onNext,
  onReset,
  canGoBack,
  canGoNext,
}: { 
  step: number; 
  result: ReturnType<typeof calculateInference> | null;
  includeTraining: boolean;
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
      key: "embodied", 
      value: result.components.embodied.co2Grams, 
      color: COMPONENT_COLORS.embodied.bg,
      label: `${COMPONENT_COLORS.embodied.label}${result.components.embodied.co2Grams === 0 ? " (0)" : ""}`,
      step: 4,
    },
    ...(includeTraining ? [{
      key: "training", 
      value: result.components.trainingAmortised.co2Grams, 
      color: COMPONENT_COLORS.training.bg,
      label: COMPONENT_COLORS.training.label,
      step: 3,
    }] : []),
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
            {formatCO2(step === 6 ? total : currentTotal)}
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
            onClick={step === 6 ? onReset : onNext}
            disabled={!canGoNext && step !== 6}
            style={{
              flex: 2,
              padding: "0.75rem",
              borderRadius: 8,
              background: step === 6 || canGoNext ? "hsl(45 15% 88%)" : "rgba(229, 221, 213, 0.2)",
              color: step === 6 || canGoNext ? "#0A0A0A" : "rgba(255,255,255,0.3)",
              border: "none",
              cursor: step === 6 || canGoNext ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            {step === 6 ? "Start Over ↺" : "Next →"}
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
