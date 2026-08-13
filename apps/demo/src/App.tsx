import { useState, useMemo } from "react";
import { Leaf, Code, Globe, Coffee, Droplet } from "lucide-react";
import {
  calculateInference,
  MODEL_PROFILES,
  HARDWARE_CONFIGS,
  GRID_REGIONS,
} from "@berget/co2-calculator";
import { useModelData, mergeModelData } from "./hooks/useModelData";
import { C, COMPONENT_COLORS, formatCO2 } from "./components/shared";
import { ApiResponseBlock } from "./components/ApiResponseBlock";
import { GuideMode } from "./components/GuideMode";
import { StickyBars } from "./components/StickyChipBar";
import { MessageSquare, Sparkles } from "lucide-react";
import type { CalculatorActions, CalculatorDerived, CalculatorState, ModelCategories, InferenceResult } from "./components/types";

const MODEL_CATEGORIES: ModelCategories = {
  popular: {
    label: "Popular Models",
    description: "Most used models across providers",
    icon: Sparkles,
    models: [
      { id: "mistralai/Mistral-Small-3.2-24B-Instruct-2506", name: "Mistral Small 24B" },
      { id: "google/gemma-4-31B-it", name: "Gemma 4 31B" },
      { id: "moonshotai/Kimi-K3", name: "Kimi K3 2.8T MoE" },
      { id: "openai/gpt-5", name: "GPT-5" },
      { id: "anthropic/claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
      { id: "google/gemini-3-pro", name: "Gemini 3 Pro" },
    ],
    defaultModel: "google/gemma-4-31B-it",
    responseTime: 0.8,
  },
  chat: {
    label: "Chat & Conversations",
    description: "Customer support, Q&A, writing assistance",
    icon: MessageSquare,
    models: [
      { id: "mistralai/Mistral-Small-3.2-24B-Instruct-2506", name: "Mistral Small 24B" },
      { id: "google/gemma-4-31B-it", name: "Gemma 4 31B" },
      { id: "openai/gpt-5", name: "GPT-5" },
      { id: "anthropic/claude-sonnet-4-5", name: "Claude Sonnet 4.5" },
      { id: "google/gemini-3-pro", name: "Gemini 3 Pro" },
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
      { id: "zai-org/GLM-5.2", name: "GLM 5.2 753B" },
      { id: "moonshotai/Kimi-K3", name: "Kimi K3 2.8T MoE" },
      { id: "openai/gpt-5-pro", name: "GPT-5 Pro" },
      { id: "anthropic/claude-opus-4-5", name: "Claude Opus 4.5" },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
      { id: "mistralai/mistral-large-2512", name: "Mistral Large 123B" },
    ],
    defaultModel: "moonshotai/Kimi-K3",
    responseTime: 3.5,
  },
};

// The calculation always runs on operational + hardware emissions only.
// Training is excluded app-wide: the figures are self-reported and carry
// ±50% uncertainty, which would undermine the credibility of the total.
const INCLUDE_TRAINING = false;
const LIFETIME_QUERIES = 0; // unused when training is excluded

export function CO2Calculator() {
  const [modelCategory, setModelCategory] = useState("popular");
  const [selectedModel, setSelectedModel] = useState("google/gemma-4-31B-it");
  const [region, setRegion] = useState("sweden");
  const [gpuCondition, setGpuCondition] = useState<"new" | "refurbished">("new");
  const [infraCondition, setInfraCondition] = useState<"new" | "refurbished">("new");
  // Which serving deployment the request runs on. WHO runs the hardware —
  // your own server, a shared node (Berget), or a hyperscaler's disaggregated
  // serving — determines how the fixed costs are shared and how efficiently
  // the hardware is used. This replaces the old concurrency slider: with the
  // fixed cost amortised over the day, "how many share right now" is no
  // longer the lever; the deployment model is.
  const [deployment, setDeployment] = useState<"onprem" | "shared" | "hyperscaler">("shared");
  const [hourOfDay, setHourOfDay] = useState(14);

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
      ...HARDWARE_CONFIGS.b300,
      embodiedPerGpuKg: gpuCondition === "refurbished" ? 0 : HARDWARE_CONFIGS.b300.embodiedPerGpuKg,
      otherComputeEmbodiedKg: infraCondition === "refurbished" ? 0 : HARDWARE_CONFIGS.b300.otherComputeEmbodiedKg,
    };

    return calculateInference({
      modelProfile: model,
      hardware: hw,
      deploymentGrid: grid,
      // Use the model's own measured response time so the UI, the methodology
      // example and the article all reproduce the same figure. (Previously a
      // per-category average, which made the UI diverge from the published
      // numbers.)
      measuredResponseTimeSeconds: model.defaultResponseTimeSeconds,
      inputTokens: model.defaultInputTokens,
      outputTokens: model.defaultOutputTokens,
      // The deployment profile drives the shared-cost denominators: on-prem
      // forces concurrency 1, shared uses the day-average, and hyperscaler
      // packs more onto each GPU via disaggregated serving.
      deployment,
      hourOfDay,
      includeTraining: INCLUDE_TRAINING,
      lifetimeQueries: LIFETIME_QUERIES,
    }) as InferenceResult;
  }, [model, grid, gpuCondition, infraCondition, category, deployment, hourOfDay]);

  const handleCategoryChange = (key: string) => {
    setModelCategory(key);
    const cat = MODEL_CATEGORIES[key];
    setSelectedModel(cat.defaultModel);
  };

  const handleModelSelect = (id: string) => {
    setSelectedModel(id);
  };

  // Shared state/actions/derived bundles
  const state: CalculatorState = {
    modelCategory, selectedModel, region,
    gpuCondition, infraCondition, deployment, hourOfDay,
  };

  const actions: CalculatorActions = {
    setModelCategory: handleCategoryChange,
    setSelectedModel: handleModelSelect,
    setRegion,
    setGpuCondition,
    setInfraCondition,
    setDeployment,
    setHourOfDay,
  };

  const derived: CalculatorDerived = {
    category,
    model,
    grid,
    result,
    modelCategories: MODEL_CATEGORIES,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.night,
        color: C.cloud,
        fontFamily: "var(--berget-font-sans, 'DM Sans', system-ui, sans-serif)",
        paddingBottom: "140px",
      }}
    >
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: "1rem 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Leaf size={20} strokeWidth={1.5} style={{ color: C.moss }} />
            <div>
              <div style={{ fontWeight: 600, color: C.peak, fontSize: "0.875rem" }}>CO₂ Impact Calculator</div>
            </div>
          </div>
          <a
            href="https://github.com/berget-ai/co2-calculator"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              color: C.muted,
              textDecoration: "none",
              fontSize: "0.8rem",
            }}
          >
            <Code size={14} strokeWidth={1.5} />
            Source
          </a>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        <GuideMode
          state={state}
          actions={actions}
          derived={derived}
          modelsLoading={modelsLoading}
          modelsError={modelsError}
          hasFetchedData={!!fetchedModelData}
          onRefreshModels={refreshModels}
          onModelSelect={handleModelSelect}
        />
      </main>

      {/* Sticky clones of the §1 model row and the §2 region row — they pin to
          the top (stacked) once their original has scrolled out of view, so you
          can keep tweaking the same chips while reading further down. */}
      <StickyBars
        modelRow={{
          selectedKey: state.selectedModel,
          onSelect: actions.setSelectedModel,
          chips: (category?.models ?? []).map((m) => ({ key: m.id, label: m.name })),
        }}
        regionRow={{
          selectedKey: state.region,
          onSelect: actions.setRegion,
          chips: Object.entries(GRID_REGIONS).map(([key, g]) => ({
            key,
            label: g.name,
            detail: String(g.intensityGPerKwh),
            dot: g.intensityGPerKwh < 50 ? "#60A580" : g.intensityGPerKwh < 300 ? "#D4A574" : "#D1392E",
          })),
        }}
      />

      {/* Live emissions footer */}
      <EmissionsFooter result={result} />
    </div>
  );
}

// ─── Live Emissions Footer ───
function EmissionsFooter({ result }: { result: InferenceResult | null }) {
  if (!result) return null;

  const components = [
    { key: "gpu", value: result.components.gpuOperational.co2Grams, color: COMPONENT_COLORS.gpu.bg, label: COMPONENT_COLORS.gpu.label },
    { key: "server", value: result.components.serverOperational.co2Grams, color: COMPONENT_COLORS.server.bg, label: COMPONENT_COLORS.server.label },
    { key: "overhead", value: result.components.datacenterOverhead.co2Grams, color: COMPONENT_COLORS.overhead.bg, label: "Cooling" },
    { key: "embodiedGpu", value: result.components.embodiedGpu.co2Grams, color: COMPONENT_COLORS.embodied.bg, label: `GPU${result.components.embodiedGpu.co2Grams === 0 ? " (0)" : ""}` },
    { key: "embodiedOther", value: result.components.embodiedOther.co2Grams, color: COMPONENT_COLORS.embodied.bg, label: `Infra${result.components.embodiedOther.co2Grams === 0 ? " (0)" : ""}` },
  ];

  const total = result.totalCO2Grams;

  // Coffee comparison, using the SAME anchor as the ResultsPanel so the cup
  // count matches exactly: an 800W microwave priced at Sweden's day-adjusted
  // 14:00 intensity (8 × 1.15 = 9.2 g/kWh) → grams CO₂ per second of
  // microwaving. One cup = 60 s of microwaving (a full cup takes ~a minute).
  const SWEDEN_INTENSITY_DAY = 8 * 1.15; // g/kWh, clean baseline at 14:00
  const coffeeCO2PerSecond = (0.8 / 3600) * SWEDEN_INTENSITY_DAY;
  const coffeeSeconds = total / coffeeCO2PerSecond;
  const SECONDS_PER_CUP = 60;
  const coffeeCups = coffeeSeconds / SECONDS_PER_CUP;

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
          <div style={{ display: "flex", height: 20, marginBottom: 4 }}>
            {components.map((comp) => {
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

          <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "rgba(26, 26, 26, 0.6)" }}>
            {components.map((comp) => {
              const width = (comp.value / total) * 100;
              return (
                <div
                  key={comp.key}
                  style={{ width: `${width}%`, background: comp.color, transition: "all 0.5s ease" }}
                  title={`${comp.label}: ${formatCO2(comp.value)}`}
                />
              );
            })}
          </div>

          <div style={{ display: "flex", height: 16, marginTop: 4 }}>
            {components.map((comp) => {
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

        {/* Total + label */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: C.peak,
              fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)",
              whiteSpace: "nowrap",
              minWidth: 80,
            }}
          >
            {formatCO2(total)}{" "}
            <span style={{ fontSize: "0.7rem", fontWeight: 500, color: C.muted }}>CO₂e</span>
          </div>
          {/* Coffee comparison — the most intuitive anchor we have */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.75rem",
              color: C.cloud,
              whiteSpace: "nowrap",
              fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)",
            }}
            title="Same energy as microwaving a cup of coffee (800W, Swedish grid)"
          >
            <Coffee size={13} strokeWidth={1.5} style={{ color: C.muted, flexShrink: 0 }} />
            {coffeeCups < 0.1 ? "<0.1" : coffeeCups.toFixed(1)} cups
          </div>
          {/* Water usage — only shown when the region actually consumes water */}
          {result.waterLiters > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.75rem",
                color: "#6FA8DC",
                whiteSpace: "nowrap",
                fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)",
              }}
              title="Cooling water consumed per request (evaporative cooling)"
            >
              <Droplet size={13} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              {(result.waterLiters * 1000).toFixed(2)} ml
            </div>
          )}
          <div style={{ flex: 1, fontSize: "0.75rem", color: C.muted, textAlign: "right" }}>
            updates live as you read ↓
          </div>
        </div>
      </div>
    </footer>
  );
}
