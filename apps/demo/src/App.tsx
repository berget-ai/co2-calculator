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

// ─── Component Colors ───
const COMPONENT_COLORS = {
  gpu: { bg: "#52B788", label: "GPU Inference", icon: "⚡" },
  server: { bg: "#74C69D", label: "Server & DC", icon: "🏢" },
  overhead: { bg: "#2D6A4F", label: "Cooling", icon: "❄️" },
  embodied: { bg: "#CFFF8B", label: "Hardware", icon: "🔧" },
  training: { bg: "#3975D6", label: "Training", icon: "🎓" },
};

const MODEL_CATEGORIES = {
  chat: {
    label: "Chat & Conversations",
    description: "Customer support, Q&A, writing assistance",
    icon: "💬",
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
    icon: "💻",
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
  return `${grams.toFixed(2)} g`;
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
            background: i + 1 <= step ? C.moss : C.border,
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
        border: `2px solid ${selected ? C.moss : C.border}`,
        background: selected ? C.mossDim : C.ghost,
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
      includeTraining: true,
      lifetimeQueries,
    });
  }, [model, grid, hardwareCondition, category, concurrency, lifetimeQueries]);

  const totalSteps = 6;

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: C.night, 
      color: C.cloud, 
      fontFamily: "var(--berget-font-sans, 'DM Sans', system-ui, sans-serif)",
      paddingBottom: "120px",
    }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: "1rem 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🌿</span>
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
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{cat.icon}</div>
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
                    onClick={() => setSelectedModel(m.id)}
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

            <button onClick={() => setStep(2)} style={btnPrimary}>
              Next: Choose Region →
            </button>
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {Object.entries(GRID_REGIONS).map(([key, g]) => (
                <Card key={key} selected={region === key} onClick={() => setRegion(key)}>
                  <div style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>
                    {g.name === "Sweden" ? "🇸🇪" : g.name === "France" ? "🇫🇷" : g.name === "Germany" ? "🇩🇪" : g.name === "US Average" ? "🇺🇸" : "🌍"}
                  </div>
                  <div style={{ fontWeight: 600, color: C.peak, fontSize: "0.75rem" }}>{g.name}</div>
                  <div style={{ fontSize: "0.7rem", color: C.muted }}>{g.intensityGPerKwh} g/kWh</div>
                  <div style={{ 
                    fontSize: "0.65rem", 
                    marginTop: "0.25rem",
                    padding: "0.125rem 0.25rem",
                    borderRadius: 4,
                    background: g.waterLitersPerKwh === 0 ? "rgba(82,183,136,0.2)" : "rgba(207,255,139,0.2)",
                    color: g.waterLitersPerKwh === 0 ? C.moss : C.warning,
                    display: "inline-block",
                  }}>
                    {g.waterLitersPerKwh === 0 ? "❄️ Free-air" : `💧 ${g.waterLitersPerKwh}L/kWh`}
                  </div>
                </Card>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>← Back</button>
              <button onClick={() => setStep(3)} style={btnPrimary}>Next: Training →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Training Amortization */}
        {step === 3 && (
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
              Training Cost
            </h1>
            <p style={{ color: C.muted, marginBottom: "1.5rem" }}>
              How many queries will share the training emissions?
            </p>

            <Card>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ color: C.peak, fontWeight: 600 }}>Lifetime Queries</span>
                  <span style={{ color: C.moss }}>{(lifetimeQueries / 1_000_000).toFixed(0)}M</span>
                </div>
                <input
                  type="range"
                  min={1_000_000}
                  max={1_000_000_000}
                  step={1_000_000}
                  value={lifetimeQueries}
                  onChange={(e) => setLifetimeQueries(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: C.muted, marginTop: "0.25rem" }}>
                  <span>1M (high per-query cost)</span>
                  <span>1B (low per-query cost)</span>
                </div>
              </div>

              {result && (
                <div style={{ 
                  padding: "1rem", 
                  background: "rgba(0,0,0,0.3)", 
                  borderRadius: 8,
                  marginTop: "1rem",
                }}>
                  <div style={{ fontSize: "0.875rem", color: C.muted }}>Training cost per query</div>
                  <div style={{ fontSize: "1.5rem", color: C.peak, fontWeight: 700 }}>
                    {formatCO2(result.components.trainingAmortised.co2Grams)}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: C.muted }}>
                    Total training: {formatCO2(model?.totalTrainingCO2Grams || 0)} ÷ {lifetimeQueries.toLocaleString()} queries
                  </div>
                </div>
              )}
            </Card>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button onClick={() => setStep(2)} style={btnSecondary}>← Back</button>
              <button onClick={() => setStep(4)} style={btnPrimary}>Next: Hardware →</button>
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
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✨</div>
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
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>♻️</div>
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

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button onClick={() => setStep(3)} style={btnSecondary}>← Back</button>
              <button onClick={() => setStep(5)} style={btnPrimary}>Next: Learn More →</button>
            </div>
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
                  <span style={{ fontSize: "1.5rem" }}>⚡</span>
                  <div style={{ fontWeight: 600, color: C.peak }}>Grid Carbon Intensity</div>
                </div>
                <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                  Sweden: 8 g/kWh (hydro + nuclear) vs Texas: 420 g/kWh (gas + coal). 
                  Same GPU, same work, 50× difference in emissions.
                </p>
              </Card>

              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>❄️</span>
                  <div style={{ fontWeight: 600, color: C.peak }}>Cooling</div>
                </div>
                <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                  Cold climates use free-air cooling (PUE 1.15). Hot climates need 
                  energy-intensive mechanical cooling (PUE 1.80). That's 57% more energy 
                  just for cooling.
                </p>
              </Card>

              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>💧</span>
                  <div style={{ fontWeight: 600, color: C.peak }}>Water Usage</div>
                </div>
                <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                  Nordic datacenters use zero water. Evaporative cooling in hot/dry 
                  climates can consume 1.5-2.0 liters per kWh. At scale, that's 
                  millions of liters per day.
                </p>
              </Card>

              <Card>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>♻️</span>
                  <div style={{ fontWeight: 600, color: C.peak }}>Hardware Lifecycle</div>
                </div>
                <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                  Manufacturing a GPU creates ~1 ton of CO₂. New hardware amortizes 
                  this over its lifetime. Refurbished hardware has zero embodied carbon 
                  since it was already manufactured.
                </p>
              </Card>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button onClick={() => setStep(4)} style={btnSecondary}>← Back</button>
              <button onClick={() => setStep(6)} style={btnPrimary}>See Results →</button>
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
              background: C.mossDim, 
              borderRadius: 12, 
              padding: "1.5rem", 
              border: `1px solid ${C.moss}`,
              marginBottom: "1.5rem",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "0.875rem", color: C.muted }}>Total CO₂ per request</div>
              <div style={{ fontSize: "2.5rem", fontWeight: 700, color: C.moss }}>
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
                { key: "trainingAmortised", label: "Training", color: COMPONENT_COLORS.training.bg },
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
              background: C.fjord, 
              borderRadius: 12, 
              padding: "1rem", 
              border: `1px solid ${C.moss}`,
              marginBottom: "1.5rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span>💧</span>
                <span style={{ fontWeight: 600, color: C.peak }}>Water Usage</span>
              </div>
              <div style={{ fontSize: "1.25rem", color: result.waterLiters === 0 ? C.moss : C.warning }}>
                {result.waterLiters === 0 
                  ? "0 L (free-air cooling)" 
                  : `${(result.waterLiters * 1000).toFixed(2)} ml per request`
                }
              </div>
            </div>

            {/* Code Example */}
            <div style={{ background: C.ghost, borderRadius: 12, padding: "1rem", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600, marginBottom: "0.5rem" }}>
                🛠️ Use this in your code
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

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button onClick={() => setStep(5)} style={btnSecondary}>← Back</button>
              <button onClick={() => { setStep(1); setModelCategory("chat"); setSelectedModel(MODEL_CATEGORIES.chat.defaultModel); setRegion("usa"); setHardwareCondition("new"); setConcurrency(8); }} style={btnOutline}>
                Start Over ↺
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
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
