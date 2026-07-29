import { useState, useMemo, useEffect } from "react";
import {
  Zap, Snowflake, Droplets, Recycle, Leaf, Code, Globe, MessageSquare, Sparkles, BookOpen, Calculator as CalculatorIcon
} from "lucide-react";
import {
  calculateInference,
  MODEL_PROFILES,
  HARDWARE_CONFIGS,
  GRID_REGIONS,
  getEstimatedLifetimeQueries,
} from "@berget/co2-calculator";
import { useModelData, mergeModelData } from "./hooks/useModelData";
import { C, COMPONENT_COLORS, formatCO2, Card, SourceCitation } from "./components/shared";
import { CategoryModelPicker } from "./components/CategoryModelPicker";
import { RegionPicker } from "./components/RegionPicker";
import { TrainingExplorer } from "./components/TrainingExplorer";
import { HardwarePicker } from "./components/HardwarePicker";
import { ResultsPanel } from "./components/ResultsPanel";
import { ApiResponseBlock } from "./components/ApiResponseBlock";
import { GuideMode } from "./components/GuideMode";
import type { CalculatorActions, CalculatorDerived, CalculatorState, ModelCategories, ModelComparison, InferenceResult } from "./components/types";

const MODEL_CATEGORIES: ModelCategories = {
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

// ─── Model Popularity Data (from Hugging Face) ───
const getModelPopularity = (modelId: string): { queries: number; label: string } => {
  const profile = MODEL_PROFILES[modelId];
  if (!profile?.popularity) return { queries: 0, label: "Unknown" };

  const downloads = profile.popularity.downloadsPerMonth;
  const estimatedQueries = downloads * 10; // Rough estimate: 10 queries per download

  if (estimatedQueries > 50_000_000) return { queries: estimatedQueries, label: "Very Popular" };
  if (estimatedQueries > 10_000_000) return { queries: estimatedQueries, label: "Popular" };
  if (estimatedQueries > 1_000_000) return { queries: estimatedQueries, label: "Growing" };
  return { queries: estimatedQueries, label: "Niche" };
};

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

type Mode = "guide" | "calculator";

function getInitialMode(): Mode {
  if (typeof window !== "undefined" && window.location.hash === "#calculator") return "calculator";
  return "guide";
}

export function CO2Calculator() {
  const [mode, setMode] = useState<Mode>(getInitialMode);
  const [step, setStep] = useState(1);
  const [modelCategory, setModelCategory] = useState("popular");
  const [selectedModel, setSelectedModel] = useState(MODEL_CATEGORIES.popular.defaultModel);
  const [region, setRegion] = useState("usa");
  const [lifetimeQueries, setLifetimeQueries] = useState(100_000_000);
  const [gpuCondition, setGpuCondition] = useState<"new" | "refurbished">("new");
  const [otherComputeCondition, setOtherComputeCondition] = useState<"new" | "refurbished">("new");
  const [concurrency, setConcurrency] = useState(8);
  const [includeTraining, setIncludeTraining] = useState(false);

  // Sync mode to URL hash for shareability
  useEffect(() => {
    const hash = mode === "calculator" ? "#calculator" : "#guide";
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, [mode]);

  // Fetch dynamic model data from EcoLogits and OpenRouter
  const { data: fetchedModelData, loading: modelsLoading, error: modelsError, refresh: refreshModels } = useModelData();

  // Merge static and dynamic models
  const allModels = useMemo(
    () => mergeModelData(MODEL_PROFILES, fetchedModelData),
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
      includeTraining,
      lifetimeQueries,
    }) as InferenceResult;
  }, [model, grid, gpuCondition, otherComputeCondition, category, concurrency, lifetimeQueries, includeTraining]);

  // Calculate results for all models in current category for comparison
  const modelComparisons: ModelComparison[] = useMemo(() => {
    if (!grid) return [];
    const hw = {
      ...HARDWARE_CONFIGS.h200,
      embodiedPerGpuKg: gpuCondition === "refurbished" ? 0 : HARDWARE_CONFIGS.h200.embodiedPerGpuKg,
      otherComputeEmbodiedKg: otherComputeCondition === "refurbished" ? 0 : HARDWARE_CONFIGS.h200.otherComputeEmbodiedKg,
    };

    return category.models
      .map((m) => {
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
      })
      .filter(Boolean) as ModelComparison[];
  }, [grid, gpuCondition, otherComputeCondition, category, concurrency, includeTraining, allModels]);

  const totalSteps = 7;

  // Navigation handlers
  const canGoBack = step > 1;
  const canGoNext = step < 7;

  const goBack = () => canGoBack && setStep(step - 1);
  const goNext = () => canGoNext && setStep(step + 1);

  const handleCategoryChange = (key: string) => {
    setModelCategory(key);
    const cat = MODEL_CATEGORIES[key];
    setSelectedModel(cat.defaultModel);
    setLifetimeQueries(getEstimatedLifetimeQueries(cat.defaultModel));
  };

  const handleModelSelect = (id: string) => {
    setSelectedModel(id);
    setLifetimeQueries(getEstimatedLifetimeQueries(id));
  };

  const handleReset = () => {
    setStep(1);
    setModelCategory("popular");
    setSelectedModel(MODEL_CATEGORIES.popular.defaultModel);
    setRegion("usa");
    setGpuCondition("new");
    setOtherComputeCondition("new");
    setConcurrency(8);
    setLifetimeQueries(100_000_000);
    setIncludeTraining(false);
  };

  // Shared state/actions/derived bundles for both modes
  const state: CalculatorState = {
    modelCategory, selectedModel, region, lifetimeQueries,
    gpuCondition, otherComputeCondition, concurrency, includeTraining,
  };

  const actions: CalculatorActions = {
    setModelCategory: handleCategoryChange,
    setSelectedModel: handleModelSelect,
    setRegion,
    setLifetimeQueries,
    setGpuCondition,
    setOtherComputeCondition,
    setConcurrency,
    setIncludeTraining,
  };

  const derived: CalculatorDerived = {
    category,
    model,
    grid,
    result,
    modelComparisons,
    modelCategories: MODEL_CATEGORIES,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.night,
        color: C.cloud,
        fontFamily: "var(--berget-font-sans, 'DM Sans', system-ui, sans-serif)",
        paddingBottom: "160px",
      }}
    >
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: "1rem 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Leaf size={20} strokeWidth={1.5} style={{ color: C.moss }} />
            <div>
              <div style={{ fontWeight: 600, color: C.peak, fontSize: "0.875rem" }}>CO₂ Impact Calculator</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* Mode toggle */}
            <div
              style={{
                display: "flex",
                background: C.ghost,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                padding: 2,
              }}
            >
              {(
                [
                  { key: "guide", label: "Guide", icon: BookOpen },
                  { key: "calculator", label: "Calculator", icon: CalculatorIcon },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.4rem 0.75rem",
                    borderRadius: 6,
                    border: "none",
                    background: mode === key ? "rgba(229, 221, 213, 0.12)" : "transparent",
                    color: mode === key ? C.peak : C.muted,
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    transition: "all 0.2s",
                  }}
                >
                  <Icon size={14} strokeWidth={1.5} />
                  {label}
                </button>
              ))}
            </div>

            {mode === "calculator" && <StepIndicator step={step} total={totalSteps} />}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        {mode === "guide" ? (
          <GuideMode
            state={state}
            actions={actions}
            derived={derived}
            modelsLoading={modelsLoading}
            modelsError={modelsError}
            hasFetchedData={!!fetchedModelData}
            onRefreshModels={refreshModels}
            onModelSelect={handleModelSelect}
            onOpenCalculator={() => setMode("calculator")}
          />
        ) : (
          <>
            {/* STEP 1: Use Case + Model */}
            {step === 1 && (
              <div>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
                  What are you building?
                </h1>
                <p style={{ color: C.muted, marginBottom: "1.5rem" }}>Select your use case and model</p>

                <CategoryModelPicker
                  modelCategory={modelCategory}
                  selectedModel={selectedModel}
                  modelCategories={MODEL_CATEGORIES}
                  onCategoryChange={handleCategoryChange}
                  onModelSelect={handleModelSelect}
                  modelsLoading={modelsLoading}
                  modelsError={modelsError}
                  hasFetchedData={!!fetchedModelData}
                  onRefresh={refreshModels}
                />
              </div>
            )}

            {/* STEP 2: Region */}
            {step === 2 && (
              <div>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
                  Where is it running?
                </h1>
                <p style={{ color: C.muted, marginBottom: "1.5rem" }}>Grid carbon intensity varies dramatically by location</p>

                <RegionPicker region={region} onRegionSelect={setRegion} />
              </div>
            )}

            {/* STEP 3: Training vs Inference */}
            {step === 3 && (
              <div>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
                  The Training Cost
                </h1>
                <p style={{ color: C.muted, marginBottom: "1.5rem" }}>Training happens once. Inference happens billions of times.</p>

                <TrainingExplorer
                  model={model}
                  result={result}
                  lifetimeQueries={lifetimeQueries}
                  includeTraining={includeTraining}
                  onIncludeTrainingChange={setIncludeTraining}
                  modelComparisons={modelComparisons}
                  selectedModel={selectedModel}
                  onModelSelect={(id, lq) => {
                    setSelectedModel(id);
                    setLifetimeQueries(lq);
                  }}
                />
              </div>
            )}

            {/* STEP 4: Hardware */}
            {step === 4 && (
              <div>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>Hardware</h1>
                <p style={{ color: C.muted, marginBottom: "1.5rem" }}>GPU and supporting infrastructure — new or refurbished?</p>

                <HardwarePicker
                  gpuCondition={gpuCondition}
                  otherComputeCondition={otherComputeCondition}
                  concurrency={concurrency}
                  onGpuConditionChange={setGpuCondition}
                  onOtherComputeConditionChange={setOtherComputeCondition}
                  onConcurrencyChange={setConcurrency}
                />
              </div>
            )}

            {/* STEP 5: Results */}
            {step === 5 && result && (
              <div>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
                  Your Carbon Footprint
                </h1>
                <p style={{ color: C.muted, marginBottom: "1.5rem" }}>Complete breakdown per request</p>

                <ResultsPanel
                  result={result}
                  model={model}
                  grid={grid}
                  lifetimeQueries={lifetimeQueries}
                  includeTraining={includeTraining}
                  onIncludeTrainingChange={setIncludeTraining}
                />
              </div>
            )}

            {/* STEP 6: Why the Difference */}
            {step === 6 && (
              <div>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
                  Why the Difference?
                </h1>
                <p style={{ color: C.muted, marginBottom: "1.5rem" }}>Understanding what drives emissions</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <Card>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                      <Zap size={24} strokeWidth={1.5} style={{ color: C.peak }} />
                      <div style={{ fontWeight: 600, color: C.peak }}>Grid Carbon Intensity</div>
                    </div>
                    <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                      Sweden: 8 g/kWh (hydro + nuclear) vs Texas: 420 g/kWh (gas + coal). Same GPU, same work, 50×
                      difference in emissions.
                    </p>
                    <SourceCitation source="IEA 2024 / EPA eGRID 2023" url="https://www.iea.org/data-and-statistics" />
                  </Card>

                  <Card>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                      <Snowflake size={24} strokeWidth={1.5} style={{ color: C.peak }} />
                      <div style={{ fontWeight: 600, color: C.peak }}>Cooling</div>
                    </div>
                    <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                      Cold climates use free-air cooling (PUE 1.15). Hot climates need energy-intensive mechanical cooling
                      (PUE 1.80). That's 57% more energy just for cooling.
                    </p>
                    <SourceCitation source="Uptime Institute 2024" url="https://uptimeinstitute.com/resources/research-and-reports" />
                  </Card>

                  <Card>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                      <Droplets size={24} strokeWidth={1.5} style={{ color: C.peak }} />
                      <div style={{ fontWeight: 600, color: C.peak }}>Water Usage</div>
                    </div>
                    <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                      Nordic datacenters use zero water. Evaporative cooling in hot/dry climates can consume 1.5-2.0
                      liters per kWh. At scale, that's millions of liters per day.
                    </p>
                    <SourceCitation source="Nature 2021 / US DOE" url="https://www.nature.com/articles/s41586-021-03439-8" />
                  </Card>

                  <Card>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                      <Recycle size={24} strokeWidth={1.5} style={{ color: C.peak }} />
                      <div style={{ fontWeight: 600, color: C.peak }}>Hardware Lifecycle</div>
                    </div>
                    <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                      Manufacturing a GPU creates ~1 ton of CO₂. New hardware amortizes this over its lifetime.
                      Refurbished hardware has zero embodied carbon since it was already manufactured.
                    </p>
                    <SourceCitation source="NVIDIA HGX PCF / Supermicro LCA" />
                  </Card>
                </div>
              </div>
            )}

            {/* STEP 7: What now? */}
            {step === 7 && (
              <div>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>What Now?</h1>
                <p style={{ color: C.muted, marginBottom: "1.5rem" }}>Start measuring CO₂ in every LLM call</p>

                {/* Call to action */}
                <div
                  style={{
                    background: "rgba(96, 165, 128, 0.08)",
                    borderRadius: 12,
                    padding: "1.5rem",
                    border: `1px solid ${C.borderMoss}`,
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <Globe size={24} strokeWidth={1.5} style={{ color: C.moss }} />
                    <span style={{ fontWeight: 600, color: C.peak, fontSize: "1.125rem" }}>Include CO₂ in Every Response</span>
                  </div>
                  <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0, marginBottom: "1rem" }}>
                    Just like Berget AI does — return{" "}
                    <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.125rem 0.25rem", borderRadius: 4, fontFamily: "monospace" }}>
                      co2_grams
                    </code>{" "}
                    and{" "}
                    <code style={{ background: "rgba(0,0,0,0.3)", padding: "0.125rem 0.25rem", borderRadius: 4, fontFamily: "monospace" }}>
                      gpu_energy_joules
                    </code>{" "}
                    in your API responses. Your users deserve to know the environmental cost of each request.
                  </p>

                  <div style={{ background: C.ghost, borderRadius: 12, padding: "1rem", border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600, marginBottom: "0.5rem" }}>
                      <Code size={16} strokeWidth={1.5} style={{ marginRight: "0.5rem" }} /> Example: Berget AI API
                    </div>
                    <ApiResponseBlock result={result} model={model} selectedModel={selectedModel} />
                  </div>
                </div>

                {/* Library code */}
                <div style={{ background: C.ghost, borderRadius: 12, padding: "1rem", border: `1px solid ${C.border}`, marginBottom: "1.5rem" }}>
                  <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600, marginBottom: "0.5rem" }}>
                    <Code size={16} strokeWidth={1.5} style={{ marginRight: "0.5rem" }} /> Use this library
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: "0.75rem",
                      background: "rgba(0,0,0,0.5)",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      overflow: "auto",
                      color: C.cloud,
                    }}
                  >
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
          </>
        )}
      </main>

      {/* Progressive Footer with Navigation */}
      <EmissionsFooter
        mode={mode}
        step={step}
        result={result}
        includeTraining={includeTraining}
        onBack={goBack}
        onNext={goNext}
        onReset={handleReset}
        canGoBack={canGoBack}
        canGoNext={canGoNext}
      />
    </div>
  );
}

// ─── Progressive Emissions Footer ───
function EmissionsFooter({
  mode,
  step,
  result,
  includeTraining,
  onBack,
  onNext,
  onReset,
  canGoBack,
  canGoNext,
}: {
  mode: Mode;
  step: number;
  result: InferenceResult | null;
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
    ...(includeTraining
      ? [
          {
            key: "training",
            value: result.components.trainingAmortised.co2Grams,
            color: COMPONENT_COLORS.training.bg,
            label: COMPONENT_COLORS.training.label,
            step: 3,
          },
        ]
      : []),
  ];

  const total = result.totalCO2Grams;
  const isGuide = mode === "guide";
  // In guide mode the full breakdown is always visible (running total)
  const visibleComponents = isGuide ? components : components.filter((c) => c.step <= step);
  const currentTotal = isGuide ? total : visibleComponents.reduce((sum, c) => sum + c.value, 0);

  return (
    <footer
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(10, 10, 10, 0.98)",
        backdropFilter: "blur(10px)",
        borderTop: `1px solid ${C.border}`,
        padding: "1rem 0",
        zIndex: 100,
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 1rem" }}>
        {/* Progress bar with labels */}
        <div style={{ marginBottom: "0.75rem" }}>
          {/* Labels above bar */}
          <div style={{ display: "flex", height: 20, marginBottom: 4 }}>
            {visibleComponents.map((comp) => {
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
          <div
            style={{
              display: "flex",
              height: 8,
              borderRadius: 4,
              overflow: "hidden",
              background: "rgba(26, 26, 26, 0.6)",
            }}
          >
            {components.map((comp) => {
              const isVisible = isGuide || comp.step <= step;
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
          <div style={{ display: "flex", height: 16, marginTop: 4 }}>
            {visibleComponents.map((comp) => {
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
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: step === 6 && !isGuide ? C.stone : C.peak,
              fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)",
              whiteSpace: "nowrap",
              minWidth: 80,
            }}
          >
            {formatCO2(isGuide || step === 7 ? total : currentTotal)}
          </div>

          {/* Navigation Buttons — wizard mode only */}
          {!isGuide && (
            <div style={{ display: "flex", gap: "0.75rem", flex: 1 }}>
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
          )}

          {/* Guide mode: compact label instead of nav */}
          {isGuide && (
            <div style={{ flex: 1, fontSize: "0.75rem", color: C.muted, textAlign: "right" }}>
              updates live as you read ↓
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
