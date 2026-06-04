import { useState, useMemo } from "react";
import {
  calculateInference,
  calculateComparisons,
  fmtTime,
  MODEL_PROFILES,
  HARDWARE_CONFIGS,
  GRID_REGIONS,
  getConcurrencyFromTrafficPattern,
} from "@berget/co2-calculator";

// ─── Use Berget CSS Variables ───
const C = {
  night: "var(--berget-background, #0A0A0A)",
  peak: "var(--berget-foreground, #FFFFFF)",
  cloud: "var(--berget-foreground-alt, rgba(255,255,255,0.8))",
  muted: "var(--berget-muted-foreground, rgba(255,255,255,0.6))",
  moss: "var(--berget-secondary, #52B788)",
  mossDim: "var(--berget-secondary-hover, rgba(82,183,136,0.4))",
  lichen: "var(--berget-accent, #74C69D)",
  spruce: "var(--berget-brand-spruce, #2D6A4F)",
  card: "var(--berget-card, rgba(26,26,26,0.4))",
  ghost: "var(--berget-ghost, rgba(26,26,26,0.4))",
  ghostHover: "var(--berget-ghost-hover, rgba(26,26,26,0.8))",
  border: "var(--berget-border, #1A1A1A)",
  outline: "var(--berget-outline, rgba(82,183,136,0.4))",
  danger: "var(--berget-destructive-foreground, #D1392E)",
  warning: "var(--berget-accent-2, #CFFF8B)",
  fjord: "var(--berget-accent-3, #0F405A)",
};

// ─── Component Colors for the Progressive Footer ───
const COMPONENT_COLORS = {
  gpu: { bg: "#52B788", label: "GPU Inference", icon: "⚡" },
  server: { bg: "#74C69D", label: "Server & DC", icon: "🏢" },
  embodied: { bg: "#CFFF8B", label: "Hardware", icon: "🔧" },
  training: { bg: "#3975D6", label: "Training", icon: "🎓" },
};

const MODEL_CATEGORIES = {
  small: {
    label: "Small & Fast",
    description: "Quick responses, everyday tasks",
    icon: "⚡",
    models: [
      { id: "meta-llama/Llama-3.1-8B-Instruct", name: "Llama 3.1 8B" },
      { id: "mistralai/Mistral-Small-3.2-24B-Instruct-2506", name: "Mistral Small 24B" },
    ],
    defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
    responseTime: 0.8,
  },
  large: {
    label: "Large & Reasoning",
    description: "Complex reasoning, coding, analysis",
    icon: "🧠",
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct", name: "Llama 3.3 70B" },
      { id: "moonshotai/Kimi-K2.6", name: "Kimi K2.6" },
    ],
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct",
    responseTime: 3.5,
  },
};

function formatCO2(grams: number): string {
  if (grams < 0.001) return `${(grams * 1000000).toFixed(1)} µg`;
  if (grams < 1) return `${(grams * 1000).toFixed(1)} mg`;
  return `${grams.toFixed(2)} g`;
}

function ComparisonBar({ label, value1, value2, unit }: {
  label: string;
  value1: number;
  value2: number;
  unit?: string;
}) {
  const max = Math.max(value1, value2, 0.0001);
  const pct1 = (value1 / max) * 100;
  const pct2 = (value2 / max) * 100;
  const savings = value1 > 0 ? ((value1 - value2) / value1) * 100 : 0;

  const formatValue = (v: number) => {
    if (unit) return `${v.toFixed(0)} ${unit}`;
    return formatCO2(v);
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
        <span style={{ color: C.muted }}>{label}</span>
        <span style={{ color: savings > 0 ? C.moss : C.peak, fontWeight: 600 }}>
          {savings > 0 ? `-${savings.toFixed(0)}%` : "Same"}
        </span>
      </div>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.75rem", color: C.danger, marginBottom: "0.25rem" }}>
            🇺🇸 {formatValue(value1)}
          </div>
          <div style={{ height: 8, background: C.danger, borderRadius: 4, width: `${pct1}%` }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.75rem", color: C.moss, marginBottom: "0.25rem" }}>
            🇸🇪 {formatValue(value2)}
          </div>
          <div style={{ height: 8, background: C.moss, borderRadius: 4, width: `${pct2}%` }} />
        </div>
      </div>
    </div>
  );
}

function Equivalents({ co2Grams, grid }: { co2Grams: number; grid: typeof GRID_REGIONS[keyof typeof GRID_REGIONS] }) {
  const comps = useMemo(() => {
    try {
      return calculateComparisons(co2Grams, grid);
    } catch {
      return { microwaveSeconds: 0, ledBulbSeconds: 0, phoneChargePercent: 0, carKm: 0, flightPermille: 0 };
    }
  }, [co2Grams, grid]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
      {[
        { icon: "☕", label: "Microwave", value: fmtTime(comps.microwaveSeconds) },
        { icon: "💡", label: "LED bulb", value: fmtTime(comps.ledBulbSeconds) },
        { icon: "📱", label: "Phone charge", value: `${comps.phoneChargePercent.toFixed(1)}%` },
        { icon: "🚗", label: "Driving", value: `${(comps.carKm * 1000).toFixed(0)} m` },
      ].map((item) => (
        <div key={item.label} style={{
          padding: "1rem",
          background: C.ghost,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}>
          <span style={{ fontSize: "1.5rem" }}>{item.icon}</span>
          <div>
            <div style={{ fontSize: "0.875rem", color: C.peak }}>
              {item.label}: <strong style={{ color: C.moss }}>{item.value}</strong>
            </div>
            <div style={{ fontSize: "0.75rem", color: C.muted }}>on {grid.name} grid</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Progressive Emissions Footer ───
function EmissionsFooter({ 
  step, 
  result, 
  region 
}: { 
  step: number; 
  result: ReturnType<typeof calculateInference> | null;
  region: string;
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
      color: "#2D6A4F",
      label: "PUE Overhead",
      step: 2,
    },
    { 
      key: "embodied", 
      value: result.components.embodied.co2Grams, 
      color: COMPONENT_COLORS.embodied.bg,
      label: COMPONENT_COLORS.embodied.label,
      step: 3,
    },
    { 
      key: "training", 
      value: result.components.trainingAmortised.co2Grams, 
      color: COMPONENT_COLORS.training.bg,
      label: COMPONENT_COLORS.training.label,
      step: 3,
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
      background: "rgba(10, 10, 10, 0.95)",
      backdropFilter: "blur(10px)",
      borderTop: `1px solid ${C.border}`,
      padding: "1rem 0",
      zIndex: 100,
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 1rem" }}>
        {/* Progress bar showing components */}
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ 
            display: "flex", 
            height: 32, 
            borderRadius: 8, 
            overflow: "hidden",
            background: C.ghost,
            border: `1px solid ${C.border}`,
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    color: isVisible ? "#0A0A0A" : "transparent",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                  title={`${comp.label}: ${formatCO2(comp.value)}`}
                >
                  {width > 8 && isVisible ? comp.label : ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend and totals */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {components.filter(c => c.step <= step).map((comp) => {
              return (
                <div 
                  key={comp.key} 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "0.4rem",
                  }}
                >
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: comp.color,
                  }} />
                  <span style={{ fontSize: "0.75rem", color: C.cloud }}>
                    {comp.label}: <strong style={{ color: C.peak }}>{formatCO2(comp.value)}</strong>
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.75rem", color: C.muted }}>
              {step < 3 ? "Building up..." : "Total per request"}
            </div>
            <div style={{ 
              fontSize: "1.25rem", 
              fontWeight: 700, 
              color: step === 3 ? C.moss : C.peak,
              fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)",
            }}>
              {formatCO2(step === 3 ? total : currentTotal)}
            </div>
          </div>
        </div>

        {/* Formula explanation */}
        <div style={{ 
          marginTop: "0.75rem", 
          paddingTop: "0.75rem", 
          borderTop: `1px solid ${C.border}`,
          fontSize: "0.7rem",
          color: C.muted,
          fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)",
          display: step === 3 ? "block" : "none",
        }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: COMPONENT_COLORS.gpu.bg }}>GPU</span>
            <span>+</span>
            <span style={{ color: COMPONENT_COLORS.server.bg }}>Server</span>
            <span>+</span>
            <span style={{ color: "#2D6A4F" }}>PUE</span>
            <span>+</span>
            <span style={{ color: COMPONENT_COLORS.embodied.bg }}>Embodied</span>
            <span>+</span>
            <span style={{ color: COMPONENT_COLORS.training.bg }}>Training</span>
            <span>=</span>
            <span style={{ color: C.moss, fontWeight: 600 }}>{formatCO2(total)}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function CO2Calculator() {
  const [step, setStep] = useState(1);
  const [modelCategory, setModelCategory] = useState<"small" | "large">("small");
  const [selectedModel, setSelectedModel] = useState(MODEL_CATEGORIES.small.defaultModel);
  const [region, setRegion] = useState("usa");

  const concurrency = getConcurrencyFromTrafficPattern(14);
  const category = MODEL_CATEGORIES[modelCategory];

  // Calculate for current selection (used by footer)
  const currentResult = useMemo(() => {
    try {
      const model = MODEL_PROFILES[selectedModel];
      const hw = HARDWARE_CONFIGS.h100;
      const grid = GRID_REGIONS[region] || GRID_REGIONS["usa"];
      if (!model || !hw || !grid) return null;

      return calculateInference({
        modelProfile: model,
        hardware: hw,
        deploymentGrid: grid,
        measuredResponseTimeSeconds: category.responseTime,
        inputTokens: model.defaultInputTokens,
        outputTokens: model.defaultOutputTokens,
        concurrency,
        hourOfDay: 14,
        includeTraining: true,
        lifetimeQueries: 100_000_000,
      });
    } catch {
      return null;
    }
  }, [selectedModel, category, region]);

  // Calculate for American provider
  const americanResult = useMemo(() => {
    try {
      const model = MODEL_PROFILES[selectedModel];
      const hw = HARDWARE_CONFIGS.h100;
      const grid = GRID_REGIONS["usa"];
      if (!model || !hw || !grid) return null;

      return calculateInference({
        modelProfile: model,
        hardware: hw,
        deploymentGrid: grid,
        measuredResponseTimeSeconds: category.responseTime,
        inputTokens: model.defaultInputTokens,
        outputTokens: model.defaultOutputTokens,
        concurrency,
        hourOfDay: 14,
        includeTraining: true,
        lifetimeQueries: 100_000_000,
      });
    } catch {
      return null;
    }
  }, [selectedModel, category]);

  // Calculate for Berget
  const bergetResult = useMemo(() => {
    try {
      const model = MODEL_PROFILES[selectedModel];
      const hw = HARDWARE_CONFIGS.h200;
      const grid = GRID_REGIONS.sweden;
      if (!model || !hw || !grid) return null;

      return calculateInference({
        modelProfile: model,
        hardware: hw,
        deploymentGrid: grid,
        measuredResponseTimeSeconds: category.responseTime,
        inputTokens: model.defaultInputTokens,
        outputTokens: model.defaultOutputTokens,
        concurrency,
        hourOfDay: 14,
        includeTraining: true,
        lifetimeQueries: 100_000_000,
      });
    } catch {
      return null;
    }
  }, [selectedModel, category]);

  // Calculate for selected region
  const regionResult = useMemo(() => {
    try {
      const model = MODEL_PROFILES[selectedModel];
      const hw = HARDWARE_CONFIGS.h100;
      const grid = GRID_REGIONS[region];
      if (!model || !hw || !grid) return null;

      return calculateInference({
        modelProfile: model,
        hardware: hw,
        deploymentGrid: grid,
        measuredResponseTimeSeconds: category.responseTime,
        inputTokens: model.defaultInputTokens,
        outputTokens: model.defaultOutputTokens,
        concurrency,
        hourOfDay: 14,
        includeTraining: true,
        lifetimeQueries: 100_000_000,
      });
    } catch {
      return null;
    }
  }, [selectedModel, category, region]);

  // Fallback values for step 3
  const americanCO2 = americanResult?.totalCO2Grams ?? 0.03;
  const bergetCO2 = bergetResult?.totalCO2Grams ?? 0.001;
  const americanGPU = americanResult?.components.gpuOperational.co2Grams ?? 0.01;
  const bergetGPU = bergetResult?.components.gpuOperational.co2Grams ?? 0.0005;
  const americanServer = americanResult?.components.serverOperational.co2Grams ?? 0.005;
  const bergetServer = bergetResult?.components.serverOperational.co2Grams ?? 0.0002;
  const americanEmbodied = americanResult?.components.embodied.co2Grams ?? 0.01;
  const bergetEmbodied = bergetResult?.components.embodied.co2Grams ?? 0.0003;
  const americanTraining = americanResult?.components.trainingAmortised.co2Grams ?? 0.005;
  const bergetTraining = bergetResult?.components.trainingAmortised.co2Grams ?? 0.0002;

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: C.night, 
      color: C.cloud, 
      fontFamily: "var(--berget-font-sans, 'DM Sans', system-ui, sans-serif)",
      paddingBottom: "140px", // Space for fixed footer
    }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: "1.5rem 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🌿</span>
            <div>
              <div style={{ fontWeight: 600, color: C.peak }}>Berget AI</div>
              <div style={{ fontSize: "0.75rem", color: C.muted }}>CO₂ Impact Calculator</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[1, 2, 3].map((s) => (
              <div key={s} style={{
                width: 32, height: 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.875rem", fontWeight: 600,
                background: step === s ? C.moss : step > s ? C.mossDim : C.ghost,
                color: step >= s ? C.night : C.muted,
                border: `2px solid ${step >= s ? C.moss : C.border}`,
              }}>
                {step > s ? "✓" : s}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        {/* STEP 1 - Model Selection */}
        {step === 1 && (
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              What are you building?
            </h1>
            <p style={{ color: C.muted, marginBottom: "2rem" }}>
              Choose the type of AI workload to see its carbon impact
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
              {Object.entries(MODEL_CATEGORIES).map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => {
                    setModelCategory(key as "small" | "large");
                    setSelectedModel(cat.defaultModel);
                  }}
                  style={{
                    padding: "2rem",
                    borderRadius: 16,
                    border: `2px solid ${modelCategory === key ? C.moss : C.border}`,
                    background: modelCategory === key ? C.mossDim : C.ghost,
                    cursor: "pointer",
                    textAlign: "left",
                    color: C.cloud,
                  }}
                >
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{cat.icon}</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 600, color: C.peak }}>{cat.label}</div>
                  <div style={{ fontSize: "0.875rem", color: C.muted }}>{cat.description}</div>
                </button>
              ))}
            </div>

            <div style={{ background: C.ghost, borderRadius: 12, padding: "1.5rem", border: `1px solid ${C.border}`, marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.875rem", color: C.muted, marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Select Model
              </div>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {category.models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: 8,
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

            <button
              onClick={() => setStep(2)}
              style={{
                marginTop: "2rem",
                width: "100%",
                padding: "1rem",
                borderRadius: 12,
                background: C.moss,
                color: C.night,
                border: "none",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Compare Regions →
            </button>
          </div>
        )}

        {/* STEP 2 - Region Selection */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              Where is it running?
            </h1>
            <p style={{ color: C.muted, marginBottom: "2rem" }}>
              The same hardware produces very different emissions depending on the energy grid
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
              {Object.entries(GRID_REGIONS).map(([key, g]) => (
                <button
                  key={key}
                  onClick={() => setRegion(key)}
                  style={{
                    padding: "1rem",
                    borderRadius: 12,
                    border: `2px solid ${region === key ? C.moss : C.border}`,
                    background: region === key ? C.mossDim : C.ghost,
                    cursor: "pointer",
                    textAlign: "center",
                    color: C.cloud,
                  }}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                    {g.name === "Sweden" ? "🇸🇪" : g.name === "France" ? "🇫🇷" : g.name === "Germany" ? "🇩🇪" : g.name === "US Average" ? "🇺🇸" : "🌍"}
                  </div>
                  <div style={{ fontWeight: 600, color: C.peak, fontSize: "0.875rem" }}>{g.name}</div>
                  <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.25rem" }}>{g.intensityGPerKwh} g/kWh</div>
                </button>
              ))}
            </div>

            {americanResult && regionResult && (
              <div style={{ background: C.ghost, borderRadius: 16, padding: "2rem", border: `1px solid ${C.border}` }}>
                <h3 style={{ marginTop: 0, color: C.moss, marginBottom: "1.5rem" }}>
                  Impact of Energy Grid
                </h3>

                <ComparisonBar
                  label="CO₂ per request"
                  value1={americanResult.totalCO2Grams}
                  value2={regionResult.totalCO2Grams}
                />

                <div style={{ marginTop: "1.5rem", padding: "1rem", background: C.mossDim, borderRadius: 8 }}>
                  <div style={{ fontSize: "0.875rem", color: C.muted }}>
                    {regionResult.totalCO2Grams < americanResult.totalCO2Grams
                      ? `✓ ${GRID_REGIONS[region].name} produces ${((1 - regionResult.totalCO2Grams / americanResult.totalCO2Grams) * 100).toFixed(0)}% less CO₂ than US Average`
                      : `⚠ ${GRID_REGIONS[region].name} produces ${((regionResult.totalCO2Grams / americanResult.totalCO2Grams - 1) * 100).toFixed(0)}% more CO₂ than US Average`
                    }
                  </div>
                </div>

                <div style={{ marginTop: "1.5rem" }}>
                  <Equivalents co2Grams={regionResult.totalCO2Grams} grid={GRID_REGIONS[region]} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  padding: "1rem",
                  borderRadius: 12,
                  background: "transparent",
                  color: C.muted,
                  border: `1px solid ${C.border}`,
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                style={{
                  flex: 2,
                  padding: "1rem",
                  borderRadius: 12,
                  background: C.moss,
                  color: C.night,
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                See Provider Comparison →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 - Provider Comparison */}
        {step === 3 && (
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              The Full Picture
            </h1>
            <p style={{ color: C.muted, marginBottom: "2rem" }}>
              See how provider choice affects every component of emissions
            </p>

            {/* Big comparison */}
            <div style={{ background: C.ghost, borderRadius: 16, padding: "2rem", border: `1px solid ${C.border}`, marginBottom: "2rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🇺🇸</div>
                  <div style={{ fontWeight: 600, color: C.peak }}>American Cloud</div>
                  <div style={{ fontSize: "0.875rem", color: C.muted }}>New H100 · US Grid</div>
                  <div style={{ fontSize: "2.5rem", fontWeight: 700, color: C.danger, marginTop: "1rem" }}>
                    {formatCO2(americanCO2)}
                  </div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🇸🇪</div>
                  <div style={{ fontWeight: 600, color: C.peak }}>Berget AI</div>
                  <div style={{ fontSize: "0.875rem", color: C.muted }}>Refurbished H200 · Swedish Grid</div>
                  <div style={{ fontSize: "2.5rem", fontWeight: 700, color: C.moss, marginTop: "1rem" }}>
                    {formatCO2(bergetCO2)}
                  </div>
                </div>
              </div>

              <div style={{
                textAlign: "center",
                padding: "1.5rem",
                background: C.mossDim,
                borderRadius: 12,
                border: `1px solid ${C.moss}`,
              }}>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: C.moss }}>
                  {americanCO2 > 0 ? ((1 - bergetCO2 / americanCO2) * 100).toFixed(0) : 0}% lower emissions
                </div>
                <div style={{ fontSize: "0.875rem", color: C.muted, marginTop: "0.5rem" }}>
                  Same model, same performance — radically different impact
                </div>
              </div>
            </div>

            {/* Component breakdown */}
            <div style={{ background: C.ghost, borderRadius: 16, padding: "2rem", border: `1px solid ${C.border}` }}>
              <h3 style={{ marginTop: 0, color: C.moss, marginBottom: "1.5rem" }}>
                What Drives the Difference?
              </h3>

              <ComparisonBar
                label="Grid Carbon Intensity"
                value1={GRID_REGIONS["usa"].intensityGPerKwh}
                value2={GRID_REGIONS.sweden.intensityGPerKwh}
                unit="g/kWh"
              />

              <ComparisonBar
                label="Operational CO₂"
                value1={americanGPU + americanServer}
                value2={bergetGPU + bergetServer}
              />

              <ComparisonBar
                label="Hardware Embodied"
                value1={americanEmbodied}
                value2={bergetEmbodied}
              />

              <ComparisonBar
                label="Training Amortised"
                value1={americanTraining}
                value2={bergetTraining}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  flex: 1,
                  padding: "1rem",
                  borderRadius: 12,
                  background: "transparent",
                  color: C.muted,
                  border: `1px solid ${C.border}`,
                  cursor: "pointer",
                }}
              >
                ← Back
              </button>
              <button
                onClick={() => { setStep(1); setModelCategory("small"); setSelectedModel(MODEL_CATEGORIES.small.defaultModel); setRegion("usa"); }}
                style={{
                  flex: 1,
                  padding: "1rem",
                  borderRadius: 12,
                  background: "transparent",
                  color: C.moss,
                  border: `1px solid ${C.moss}`,
                  cursor: "pointer",
                }}
              >
                Start Over ↺
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Progressive Footer */}
      <EmissionsFooter step={step} result={currentResult} region={region} />
    </div>
  );
}
