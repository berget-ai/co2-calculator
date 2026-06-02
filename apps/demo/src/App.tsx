import { useState, useMemo } from "react";
import {
  calculateInference,
  calculateComparisons,
  fmtTime,
  fmtNumber,
  MODEL_PROFILES,
  HARDWARE_CONFIGS,
  GRID_REGIONS,
  getModelsByCategory,
  getConcurrencyFromTrafficPattern,
} from "@berget/co2-calculator";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Provider presets
const PRESETS = {
  "american-cloud": {
    name: "American Cloud Provider",
    description: "New hardware, average US grid",
    hardware: "h100",
    grid: "us-average",
    icon: "🇺🇸",
  },
  "berget-ai": {
    name: "Berget AI",
    description: "Refurbished hardware, Swedish grid",
    hardware: "h200",
    grid: "sweden",
    icon: "🇸🇪",
  },
  "european-green": {
    name: "European Green",
    description: "Efficient hardware, French nuclear",
    hardware: "mi300x",
    grid: "france",
    icon: "🇫🇷",
  },
  custom: {
    name: "Custom",
    description: "Configure everything",
    hardware: "h200",
    grid: "sweden",
    icon: "⚙️",
  },
};

// Colors
const C = {
  night: "#0A0A0A",
  slate: "#1A1A1A",
  moss: "#52B788",
  cloud: "#E5DDD5",
  peak: "#FFFFFF",
  muted: "rgba(255,255,255,0.6)",
  border: "rgba(255,255,255,0.1)",
  card: "rgba(26,26,26,0.6)",
};

export function CO2Calculator() {
  // Mode
  const [devMode, setDevMode] = useState(false);
  const [preset, setPreset] = useState<keyof typeof PRESETS>("berget-ai");
  
  // State
  const [modelId, setModelId] = useState("meta-llama/Llama-3.1-8B-Instruct");
  const [hardwareKey, setHardwareKey] = useState("h200");
  const [gridKey, setGridKey] = useState("sweden");
  const [inputTokens, setInputTokens] = useState(800);
  const [outputTokens, setOutputTokens] = useState(400);
  const [hourOfDay, setHourOfDay] = useState(14);
  const [includeTraining, setIncludeTraining] = useState(true);
  
  const concurrency = getConcurrencyFromTrafficPattern(hourOfDay);
  
  const model = MODEL_PROFILES[modelId];
  const hardware = HARDWARE_CONFIGS[hardwareKey];
  const grid = GRID_REGIONS[gridKey];
  
  const result = useMemo(() => {
    if (!model || !hardware || !grid) return null;
    return calculateInference({
      modelProfile: model,
      hardware,
      deploymentGrid: grid,
      referenceGrid: grid, // Same grid for simplicity
      measuredResponseTimeSeconds: model.defaultResponseTimeSeconds,
      inputTokens,
      outputTokens,
      concurrency,
      hourOfDay,
      includeTraining,
      lifetimeQueries: 1_000_000_000,
    });
  }, [model, hardware, grid, inputTokens, outputTokens, concurrency, hourOfDay, includeTraining]);
  
  const comparisons = useMemo(() => {
    if (!result) return null;
    return calculateComparisons(result.totalCO2Grams, grid);
  }, [result, grid]);
  
  // Apply preset
  const applyPreset = (key: keyof typeof PRESETS) => {
    const p = PRESETS[key];
    setPreset(key);
    if (key !== "custom") {
      setHardwareKey(p.hardware);
      setGridKey(p.grid);
    }
  };
  
  // Generate code snippet
  const codeSnippet = useMemo(() => {
    if (!model || !hardware || !grid) return "";
    return `import { calculateInference } from "@berget/co2-calculator";

const result = calculateInference({
  modelProfile: MODEL_PROFILES["${modelId}"],
  hardware: HARDWARE_CONFIGS["${hardwareKey}"],
  deploymentGrid: GRID_REGIONS["${gridKey}"],
  measuredResponseTimeSeconds: ${model.defaultResponseTimeSeconds},
  inputTokens: ${inputTokens},
  outputTokens: ${outputTokens},
  concurrency: ${concurrency},
  hourOfDay: ${hourOfDay},
  includeTraining: ${includeTraining},
  lifetimeQueries: 1_000_000_000,
});

// result.totalCO2Grams = ${result?.totalCO2Grams.toFixed(4) ?? "..."}`;
  }, [modelId, hardwareKey, gridKey, inputTokens, outputTokens, concurrency, hourOfDay, includeTraining, model, result]);
  
  const modelsByCategory = getModelsByCategory();
  
  return (
    <div style={{ minHeight: "100vh", background: C.night, color: C.cloud, fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: "1rem 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🌿</span>
            <span style={{ fontWeight: 600, color: C.peak }}>Berget AI CO₂ Calculator</span>
          </div>
          <button
            onClick={() => setDevMode(!devMode)}
            style={{
              background: devMode ? C.moss : "transparent",
              color: devMode ? C.night : C.moss,
              border: `1px solid ${C.moss}`,
              padding: "0.5rem 1rem",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            {devMode ? "✓ Dev Mode" : "Dev Mode"}
          </button>
        </div>
      </header>
      
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
        {/* Presets */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em", color: C.moss, marginBottom: "1rem" }}>
            Provider Preset
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => applyPreset(key as keyof typeof PRESETS)}
                style={{
                  background: preset === key ? "rgba(82,183,136,0.2)" : C.card,
                  border: `1px solid ${preset === key ? C.moss : C.border}`,
                  borderRadius: 12,
                  padding: "1rem",
                  cursor: "pointer",
                  textAlign: "left",
                  color: C.cloud,
                }}
              >
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{p.icon}</div>
                <div style={{ fontWeight: 600, color: C.peak }}>{p.name}</div>
                <div style={{ fontSize: "0.875rem", color: C.muted }}>{p.description}</div>
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          {/* Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ background: C.card, borderRadius: 12, padding: "1.5rem", border: `1px solid ${C.border}` }}>
              <h3 style={{ marginTop: 0, color: C.moss }}>Model & Workload</h3>
              
              <Select value={modelId} onValueChange={(v) => {
                setModelId(v);
                const m = MODEL_PROFILES[v];
                if (m) {
                  setInputTokens(m.defaultInputTokens);
                  setOutputTokens(m.defaultOutputTokens);
                }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {modelsByCategory.text.map((m) => (
                    <SelectItem key={m.modelId} value={m.modelId}>{m.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div style={{ marginTop: "1rem" }}>
                <Slider label="Input Tokens" value={inputTokens} onValueChange={setInputTokens} min={1} max={32000} step={64} displayValue={String(inputTokens)} />
              </div>
              <div style={{ marginTop: "1rem" }}>
                <Slider label="Output Tokens" value={outputTokens} onValueChange={setOutputTokens} min={1} max={8000} step={32} displayValue={String(outputTokens)} />
              </div>
            </div>
            
            <div style={{ background: C.card, borderRadius: 12, padding: "1.5rem", border: `1px solid ${C.border}` }}>
              <h3 style={{ marginTop: 0, color: C.moss }}>Infrastructure</h3>
              
              {preset === "custom" && (
                <>
                  <Select value={hardwareKey} onValueChange={setHardwareKey}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(HARDWARE_CONFIGS).map(([k, h]) => (
                        <SelectItem key={k} value={k}>{h.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <div style={{ marginTop: "1rem" }}>
                    <Select value={gridKey} onValueChange={setGridKey}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(GRID_REGIONS).map(([k, g]) => (
                          <SelectItem key={k} value={k}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              {preset !== "custom" && (
                <div style={{ padding: "0.75rem", background: "rgba(82,183,136,0.1)", borderRadius: 8, marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.875rem", color: C.muted }}>
                    {hardware?.name} · {grid?.name} ({grid?.intensityGPerKwh} g/kWh)
                  </div>
                </div>
              )}
              
              <div style={{ marginTop: "1rem" }}>
                <Slider label="Hour of Day" value={hourOfDay} onValueChange={setHourOfDay} min={0} max={23} step={1} displayValue={`${String(hourOfDay).padStart(2, "0")}:00`} />
              </div>
              
              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: C.muted }}>
                Estimated load: <span style={{ color: C.moss, fontWeight: 600 }}>{concurrency} concurrent requests</span>
              </div>
              
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem", cursor: "pointer", fontSize: "0.875rem" }}>
                <input type="checkbox" checked={includeTraining} onChange={(e) => setIncludeTraining(e.target.checked)} />
                Include training CO₂
              </label>
            </div>
          </div>
          
          {/* Results */}
          <div>
            {result && comparisons && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Main Result */}
                <div style={{ background: "linear-gradient(135deg, rgba(82,183,136,0.1), rgba(26,26,26,0.4))", borderRadius: 12, padding: "1.5rem", border: `1px solid rgba(82,183,136,0.3)` }}>
                  <h3 style={{ marginTop: 0, color: C.moss }}>Carbon Impact</h3>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div style={{ textAlign: "center", padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
                      <div style={{ fontSize: "2rem", fontWeight: 700, color: C.moss }}>
                        {result.totalCO2Grams < 1 
                          ? `${(result.totalCO2Grams * 1000).toFixed(1)} mg`
                          : `${result.totalCO2Grams.toFixed(2)} g`
                        }
                      </div>
                      <div style={{ fontSize: "0.75rem", color: C.muted }}>CO₂e per request</div>
                    </div>
                    <div style={{ textAlign: "center", padding: "1rem", background: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
                      <div style={{ fontSize: "2rem", fontWeight: 700, color: C.moss }}>
                        {((result.totalEnergyKwh || 0) * 1000).toFixed(1)}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: C.muted }}>Wh energy</div>
                    </div>
                  </div>
                  
                  {/* Comparisons - show on deployment grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div style={{ padding: "0.75rem", background: "rgba(0,0,0,0.3)", borderRadius: 8, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "1.25rem" }}>☕</span>
                      <div>
                        <div style={{ fontSize: "0.875rem" }}>Microwave: <strong style={{ color: C.moss }}>{fmtTime(comparisons.microwaveSeconds)}</strong></div>
                        <div style={{ fontSize: "0.75rem", color: C.muted }}>on {grid.name} grid</div>
                      </div>
                    </div>
                    <div style={{ padding: "0.75rem", background: "rgba(0,0,0,0.3)", borderRadius: 8, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "1.25rem" }}>💡</span>
                      <div>
                        <div style={{ fontSize: "0.875rem" }}>LED bulb: <strong style={{ color: C.moss }}>{fmtTime(comparisons.ledBulbSeconds)}</strong></div>
                        <div style={{ fontSize: "0.75rem", color: C.muted }}>on {grid.name} grid</div>
                      </div>
                    </div>
                    <div style={{ padding: "0.75rem", background: "rgba(0,0,0,0.3)", borderRadius: 8, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "1.25rem" }}>📱</span>
                      <div style={{ fontSize: "0.875rem" }}>Phone charge: <strong style={{ color: C.moss }}>{comparisons.phoneChargePercent.toFixed(1)}%</strong></div>
                    </div>
                    <div style={{ padding: "0.75rem", background: "rgba(0,0,0,0.3)", borderRadius: 8, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span style={{ fontSize: "1.25rem" }}>🚗</span>
                      <div style={{ fontSize: "0.875rem" }}>Driving: <strong style={{ color: C.moss }}>{(comparisons.carKm * 1000).toFixed(1)} m</strong></div>
                    </div>
                  </div>
                </div>
                
                {/* Breakdown */}
                <div style={{ background: C.card, borderRadius: 12, padding: "1.5rem", border: `1px solid ${C.border}` }}>
                  <h3 style={{ marginTop: 0, color: C.moss, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Component Breakdown</h3>
                  
                  <table style={{ width: "100%", fontSize: "0.875rem", borderCollapse: "collapse" }}>
                    <tbody>
                      {[
                        { label: "GPU energy", value: result.components.gpuOperational.co2Grams },
                        { label: "Server infrastructure", value: result.components.serverOperational.co2Grams },
                        { label: "Datacenter overhead", value: result.components.datacenterOverhead.co2Grams },
                        { label: "Hardware embodied", value: result.components.embodied.co2Grams },
                        ...(includeTraining ? [{ label: "Training CO₂", value: result.components.trainingAmortised.co2Grams }] : []),
                      ].map((item, i, arr) => (
                        <tr key={item.label} style={{ borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                          <td style={{ padding: "0.5rem 0", color: C.muted }}>{item.label}</td>
                          <td style={{ padding: "0.5rem 0", textAlign: "right", fontFamily: "monospace" }}>
                            {item.value < 0.01 ? `${(item.value * 1000).toFixed(1)} mg` : `${item.value.toFixed(4)} g`}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ fontWeight: "bold" }}>
                        <td style={{ padding: "0.75rem 0", borderTop: `2px solid ${C.moss}`, color: C.peak }}>Total</td>
                        <td style={{ padding: "0.75rem 0", borderTop: `2px solid ${C.moss}`, textAlign: "right", color: C.moss, fontSize: "1.125rem" }}>
                          {result.totalCO2Grams < 1 
                            ? `${(result.totalCO2Grams * 1000).toFixed(1)} mg`
                            : `${result.totalCO2Grams.toFixed(2)} g`
                          }
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Dev Mode Code */}
                {devMode && (
                  <div style={{ background: C.card, borderRadius: 12, padding: "1.5rem", border: `1px solid ${C.border}` }}>
                    <h3 style={{ marginTop: 0, color: C.moss, fontSize: "0.875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Code Snippet
                    </h3>
                    <pre style={{ 
                      background: "#000", 
                      padding: "1rem", 
                      borderRadius: 8, 
                      overflow: "auto",
                      fontSize: "0.75rem",
                      lineHeight: 1.5,
                    }}>
                      <code style={{ color: "#52B788" }}>{codeSnippet}</code>
                    </pre>
                    <button
                      onClick={() => navigator.clipboard.writeText(codeSnippet)}
                      style={{
                        marginTop: "0.5rem",
                        background: "transparent",
                        border: `1px solid ${C.moss}`,
                        color: C.moss,
                        padding: "0.5rem 1rem",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                    >
                      Copy to clipboard
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
