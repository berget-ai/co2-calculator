import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  calculateInference,
  calculateComparisons,
  fmtTime,
  MODEL_PROFILES,
  HARDWARE_CONFIGS,
  GRID_REGIONS,
  getConcurrencyFromTrafficPattern,
} from "@berget/co2-calculator";

// ─── Design Tokens ───
const C = {
  night: "#0A0A0A",
  slate: "#141414",
  moss: "#52B788",
  mossDim: "rgba(82,183,136,0.15)",
  cloud: "#E5DDD5",
  peak: "#FFFFFF",
  muted: "rgba(255,255,255,0.5)",
  border: "rgba(255,255,255,0.08)",
  card: "rgba(255,255,255,0.03)",
  danger: "#FF6B6B",
};

// ─── Model Categories ───
const MODEL_CATEGORIES = {
  small: {
    label: "Small & Fast",
    description: "Quick responses, everyday tasks",
    icon: "⚡",
    models: [
      { id: "meta-llama/Llama-3.1-8B-Instruct", name: "Llama 3.1 8B", tokens: "8B" },
      { id: "mistralai/Mistral-Small-3.2-24B-Instruct-2506", name: "Mistral Small 24B", tokens: "24B" },
    ],
    defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
    responseTime: 0.8,
  },
  large: {
    label: "Large & Reasoning",
    description: "Complex reasoning, coding, analysis",
    icon: "🧠",
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct", name: "Llama 3.3 70B", tokens: "70B" },
      { id: "moonshotai/Kimi-K2.6", name: "Kimi K2.6", tokens: "1.1T" },
    ],
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct",
    responseTime: 3.5,
  },
};

// ─── Providers ───
const PROVIDERS = {
  american: {
    name: "American Cloud",
    flag: "🇺🇸",
    hardware: "h100",
    grid: "us-average",
    trainingLocation: "USA",
    hardwareType: "new",
    color: C.danger,
  },
  berget: {
    name: "Berget AI",
    flag: "🇸🇪",
    hardware: "h200",
    grid: "sweden",
    trainingLocation: "China",
    hardwareType: "refurbished",
    color: C.moss,
  },
};

// ─── Comparison Bar ───
function ComparisonBar({ label, value1, value2, unit, color1 = C.danger, color2 = C.moss }: {
  label: string;
  value1: number;
  value2: number;
  unit: string;
  color1?: string;
  color2?: string;
}) {
  const max = Math.max(value1, value2);
  const pct1 = (value1 / max) * 100;
  const pct2 = (value2 / max) * 100;
  const savings = ((value1 - value2) / value1) * 100;

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
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
            <span style={{ color: color1 }}>🇺🇸 {value1.toFixed(2)} {unit}</span>
          </div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct1}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ height: 8, background: color1, borderRadius: 4 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
            <span style={{ color: color2 }}>🇸🇪 {value2.toFixed(2)} {unit}</span>
          </div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct2}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            style={{ height: 8, background: color2, borderRadius: 4 }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── CO₂ Display ───
function CO2Display({ value, label, delay = 0 }: { value: number; label: string; delay?: number }) {
  const isMg = value < 1;
  const displayValue = isMg ? (value * 1000).toFixed(1) : value.toFixed(2);
  const unit = isMg ? "mg" : "g";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      style={{ textAlign: "center" }}
    >
      <motion.div
        key={value}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        style={{ fontSize: "3rem", fontWeight: 700, color: C.moss, fontFamily: "monospace" }}
      >
        {displayValue}<span style={{ fontSize: "1.5rem" }}>{unit}</span>
      </motion.div>
      <div style={{ fontSize: "0.875rem", color: C.muted, marginTop: "0.5rem" }}>{label}</div>
    </motion.div>
  );
}

// ─── Equivalents ───
function Equivalents({ co2Grams, grid }: { co2Grams: number; grid: typeof GRID_REGIONS[keyof typeof GRID_REGIONS] }) {
  const comps = useMemo(() => calculateComparisons(co2Grams, grid), [co2Grams, grid]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
      {[
        { icon: "☕", label: "Microwave", value: fmtTime(comps.microwaveSeconds) },
        { icon: "💡", label: "LED bulb", value: fmtTime(comps.ledBulbSeconds) },
        { icon: "📱", label: "Phone charge", value: `${comps.phoneChargePercent.toFixed(1)}%` },
        { icon: "🚗", label: "Driving", value: `${(comps.carKm * 1000).toFixed(0)} m` },
      ].map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          style={{
            padding: "1rem",
            background: C.card,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>{item.icon}</span>
          <div>
            <div style={{ fontSize: "0.875rem", color: C.peak }}>
              {item.label}: <strong style={{ color: C.moss }}>{item.value}</strong>
            </div>
            <div style={{ fontSize: "0.75rem", color: C.muted }}>on {grid.name} grid</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Wizard ───
export function CO2Calculator() {
  const [step, setStep] = useState(1);
  const [modelCategory, setModelCategory] = useState<"small" | "large">("small");
  const [selectedModel, setSelectedModel] = useState(MODEL_CATEGORIES.small.defaultModel);
  const [region, setRegion] = useState("us-average");

  // Calculate for American provider
  const americanResult = useMemo(() => {
    const model = MODEL_PROFILES[selectedModel];
    const hw = HARDWARE_CONFIGS[PROVIDERS.american.hardware];
    const grid = GRID_REGIONS[PROVIDERS.american.grid];
    if (!model || !hw || !grid) return null;

    return calculateInference({
      modelProfile: model,
      hardware: hw,
      deploymentGrid: grid,
      referenceGrid: grid,
      measuredResponseTimeSeconds: modelCategory === "small" ? 0.8 : 3.5,
      inputTokens: model.defaultInputTokens,
      outputTokens: model.defaultOutputTokens,
      concurrency: getConcurrencyFromTrafficPattern(14),
      hourOfDay: 14,
      includeTraining: true,
      lifetimeQueries: 100_000_000,
    });
  }, [selectedModel, modelCategory]);

  // Calculate for Berget
  const bergetResult = useMemo(() => {
    const model = MODEL_PROFILES[selectedModel];
    const hw = HARDWARE_CONFIGS[PROVIDERS.berget.hardware];
    const grid = GRID_REGIONS[PROVIDERS.berget.grid];
    if (!model || !hw || !grid) return null;

    return calculateInference({
      modelProfile: model,
      hardware: hw,
      deploymentGrid: grid,
      referenceGrid: grid,
      measuredResponseTimeSeconds: modelCategory === "small" ? 0.8 : 3.5,
      inputTokens: model.defaultInputTokens,
      outputTokens: model.defaultOutputTokens,
      concurrency: getConcurrencyFromTrafficPattern(14),
      hourOfDay: 14,
      includeTraining: true,
      lifetimeQueries: 100_000_000,
    });
  }, [selectedModel, modelCategory]);

  // Calculate for selected region (step 2)
  const regionResult = useMemo(() => {
    const model = MODEL_PROFILES[selectedModel];
    const hw = HARDWARE_CONFIGS[PROVIDERS.american.hardware];
    const grid = GRID_REGIONS[region];
    if (!model || !hw || !grid) return null;

    return calculateInference({
      modelProfile: model,
      hardware: hw,
      deploymentGrid: grid,
      referenceGrid: grid,
      measuredResponseTimeSeconds: modelCategory === "small" ? 0.8 : 3.5,
      inputTokens: model.defaultInputTokens,
      outputTokens: model.defaultOutputTokens,
      concurrency: getConcurrencyFromTrafficPattern(14),
      hourOfDay: 14,
      includeTraining: true,
      lifetimeQueries: 100_000_000,
    });
  }, [selectedModel, modelCategory, region]);

  const category = MODEL_CATEGORIES[modelCategory];

  return (
    <div style={{ minHeight: "100vh", background: C.night, color: C.cloud, fontFamily: "system-ui, sans-serif" }}>
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
              <div
                key={s}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  background: step === s ? C.moss : step > s ? "rgba(82,183,136,0.3)" : C.card,
                  color: step >= s ? C.night : C.muted,
                  border: `2px solid ${step >= s ? C.moss : C.border}`,
                }}
              >
                {step > s ? "✓" : s}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1rem" }}>
        <AnimatePresence mode="wait">
          {/* ─── STEP 1: Model Selection ─── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
            >
              <h1 style={{ fontSize: "2rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
                What are you building?
              </h1>
              <p style={{ color: C.muted, marginBottom: "2rem" }}>
                Choose the type of AI workload to see its carbon impact
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
                {Object.entries(MODEL_CATEGORIES).map(([key, cat]) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setModelCategory(key as "small" | "large");
                      setSelectedModel(cat.defaultModel);
                    }}
                    style={{
                      padding: "2rem",
                      borderRadius: 16,
                      border: `2px solid ${modelCategory === key ? C.moss : C.border}`,
                      background: modelCategory === key ? C.mossDim : C.card,
                      cursor: "pointer",
                      textAlign: "left",
                      color: C.cloud,
                    }}
                  >
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{cat.icon}</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: 600, color: C.peak, marginBottom: "0.5rem" }}>
                      {cat.label}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: C.muted }}>{cat.description}</div>
                  </motion.button>
                ))}
              </div>

              {/* Model selector */}
              <div style={{ background: C.card, borderRadius: 12, padding: "1.5rem", border: `1px solid ${C.border}`, marginBottom: "2rem" }}>
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

              {/* Baseline Result */}
              {americanResult && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{ background: C.card, borderRadius: 16, padding: "2rem", border: `1px solid ${C.border}` }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem", color: C.muted, fontSize: "0.875rem" }}>
                    <span>🇺🇸</span>
                    <span>Baseline: American Cloud Provider</span>
                  </div>

                  <CO2Display value={americanResult.totalCO2Grams} label="CO₂e per request" />

                  <div style={{ marginTop: "2rem" }}>
                    <Equivalents co2Grams={americanResult.totalCO2Grams} grid={GRID_REGIONS["us-average"]} />
                  </div>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
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
              </motion.button>
            </motion.div>
          )}

          {/* ─── STEP 2: Region Comparison ─── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
            >
              <h1 style={{ fontSize: "2rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
                Where is it running?
              </h1>
              <p style={{ color: C.muted, marginBottom: "2rem" }}>
                The same hardware produces very different emissions depending on the energy grid
              </p>

              {/* Region selector */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
                {Object.entries(GRID_REGIONS).map(([key, g]) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setRegion(key)}
                    style={{
                      padding: "1rem",
                      borderRadius: 12,
                      border: `2px solid ${region === key ? C.moss : C.border}`,
                      background: region === key ? C.mossDim : C.card,
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
                  </motion.button>
                ))}
              </div>

              {/* Comparison */}
              {americanResult && regionResult && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ background: C.card, borderRadius: 16, padding: "2rem", border: `1px solid ${C.border}` }}
                >
                  <h3 style={{ marginTop: 0, color: C.moss, marginBottom: "1.5rem" }}>
                    Impact of Energy Grid
                  </h3>

                  <ComparisonBar
                    label="CO₂ per request"
                    value1={americanResult.totalCO2Grams}
                    value2={regionResult.totalCO2Grams}
                    unit="g"
                  />

                  <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(82,183,136,0.1)", borderRadius: 8 }}>
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
                </motion.div>
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
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ─── STEP 3: Provider Comparison ─── */}
          {step === 3 && americanResult && bergetResult && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
            >
              <h1 style={{ fontSize: "2rem", fontWeight: 700, color: C.peak, marginBottom: "0.5rem" }}>
                The Full Picture
              </h1>
              <p style={{ color: C.muted, marginBottom: "2rem" }}>
                See how provider choice affects every component of emissions
              </p>

              {/* Big comparison */}
              <div style={{ background: C.card, borderRadius: 16, padding: "2rem", border: `1px solid ${C.border}`, marginBottom: "2rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
                  {/* American */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🇺🇸</div>
                    <div style={{ fontWeight: 600, color: C.peak }}>American Cloud</div>
                    <div style={{ fontSize: "0.875rem", color: C.muted }}>New H100 · US Grid</div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      style={{ fontSize: "2.5rem", fontWeight: 700, color: C.danger, marginTop: "1rem" }}
                    >
                      {americanResult.totalCO2Grams < 1
                        ? `${(americanResult.totalCO2Grams * 1000).toFixed(1)} mg`
                        : `${americanResult.totalCO2Grams.toFixed(2)} g`
                      }
                    </motion.div>
                  </div>

                  {/* Berget */}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🇸🇪</div>
                    <div style={{ fontWeight: 600, color: C.peak }}>Berget AI</div>
                    <div style={{ fontSize: "0.875rem", color: C.muted }}>Refurbished H200 · Swedish Grid</div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.4 }}
                      style={{ fontSize: "2.5rem", fontWeight: 700, color: C.moss, marginTop: "1rem" }}
                    >
                      {bergetResult.totalCO2Grams < 1
                        ? `${(bergetResult.totalCO2Grams * 1000).toFixed(1)} mg`
                        : `${bergetResult.totalCO2Grams.toFixed(2)} g`
                      }
                    </motion.div>
                  </div>
                </div>

                {/* Savings badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  style={{
                    textAlign: "center",
                    padding: "1.5rem",
                    background: C.mossDim,
                    borderRadius: 12,
                    border: `1px solid ${C.moss}`,
                  }}
                >
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: C.moss }}>
                    {((1 - bergetResult.totalCO2Grams / americanResult.totalCO2Grams) * 100).toFixed(0)}% lower emissions
                  </div>
                  <div style={{ fontSize: "0.875rem", color: C.muted, marginTop: "0.5rem" }}>
                    Same model, same performance — radically different impact
                  </div>
                </motion.div>
              </div>

              {/* Component breakdown */}
              <div style={{ background: C.card, borderRadius: 16, padding: "2rem", border: `1px solid ${C.border}` }}>
                <h3 style={{ marginTop: 0, color: C.moss, marginBottom: "1.5rem" }}>
                  What Drives the Difference?
                </h3>

                <ComparisonBar
                  label="Grid Carbon Intensity"
                  value1={GRID_REGIONS["us-average"].intensityGPerKwh}
                  value2={GRID_REGIONS.sweden.intensityGPerKwh}
                  unit="g/kWh"
                />

                <ComparisonBar
                  label="Operational CO₂"
                  value1={americanResult.components.gpuOperational.co2Grams + americanResult.components.serverOperational.co2Grams}
                  value2={bergetResult.components.gpuOperational.co2Grams + bergetResult.components.serverOperational.co2Grams}
                  unit="g"
                />

                <ComparisonBar
                  label="Hardware Embodied"
                  value1={americanResult.components.embodied.co2Grams}
                  value2={bergetResult.components.embodied.co2Grams}
                  unit="g"
                />

                <ComparisonBar
                  label="Training Amortised"
                  value1={americanResult.components.trainingAmortised.co2Grams}
                  value2={bergetResult.components.trainingAmortised.co2Grams}
                  unit="g"
                />
              </div>

              {/* Why it matters */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                style={{ marginTop: "2rem", background: C.card, borderRadius: 16, padding: "2rem", border: `1px solid ${C.border}` }}
              >
                <h3 style={{ marginTop: 0, color: C.peak }}>Why This Matters</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
                  {[
                    { icon: "🔌", title: "Energy Mix", text: "Sweden's grid is 95% fossil-free vs US average at 60%" },
                    { icon: "♻️", title: "Hardware", text: "Refurbished GPUs extend lifespan, reducing embodied emissions" },
                    { icon: "🌍", title: "Training", text: "Open models trained in China vs proprietary models trained in US" },
                    { icon: "📊", title: "Transparency", text: "Real-time metrics vs estimated averages" },
                  ].map((item) => (
                    <div key={item.title} style={{ padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: 8 }}>
                      <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{item.icon}</div>
                      <div style={{ fontWeight: 600, color: C.peak, fontSize: "0.875rem" }}>{item.title}</div>
                      <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.25rem" }}>{item.text}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

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
                  onClick={() => { setStep(1); setModelCategory("small"); setSelectedModel(MODEL_CATEGORIES.small.defaultModel); setRegion("us-average"); }}
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
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
