import { useState } from "react";
import { C } from "./shared";
import { Wrench } from "lucide-react";

interface Props {
  selectedModel: string;
  region: string;
  utilization: number;
  responseTime: number;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  totalDisplay: string;
}

type Lang = "js" | "python";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: "0.85rem",
        background: "rgba(0,0,0,0.5)",
        borderRadius: 6,
        fontSize: "0.75rem",
        overflow: "auto",
        color: C.cloud,
        fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)",
        lineHeight: 1.6,
      }}
    >
      {children}
    </pre>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: C.moss, textTransform: "uppercase", letterSpacing: "0.07em", margin: "1.1rem 0 0.45rem" }}>
      {children}
    </div>
  );
}

/**
 * The developer call-to-action: how to implement CO₂ reporting in your own
 * stack. A Python/JS picker, a quickstart, and advanced usage (custom
 * hardware, custom grid, per-request API integration) for the engineer who
 * has been asked to ship this.
 */
export function DeveloperSection({
  selectedModel,
  region,
  utilization,
  responseTime,
  inputTokens,
  outputTokens,
  totalDisplay,
}: Props) {
  const [lang, setLang] = useState<Lang>("js");

  const jsQuick = `npm install @berget/co2-calculator

import { calculateInference, MODEL_PROFILES, HARDWARE_CONFIGS, GRID_REGIONS } from "@berget/co2-calculator";

const result = calculateInference({
  modelProfile: MODEL_PROFILES["${selectedModel}"],
  hardware: HARDWARE_CONFIGS.b300,
  deploymentGrid: GRID_REGIONS["${region}"],
  measuredResponseTimeSeconds: ${responseTime},
  inputTokens: ${inputTokens ?? 1000},
  outputTokens: ${outputTokens ?? 800},
  utilization: ${utilization},
  hourOfDay: 14,
});

// Total: ${totalDisplay} CO₂e per request
console.log(result.totalCO2Grams, "g CO₂e");
console.log(result.components);   // full per-component breakdown`;

  const pyQuick = `pip install berget-co2-calculator

from berget_co2_calculator import calculate_inference, MODEL_PROFILES, HARDWARE_CONFIGS, GRID_REGIONS

result = calculate_inference(
    model_profile=MODEL_PROFILES["${selectedModel}"],
    hardware=HARDWARE_CONFIGS["b300"],
    deployment_grid=GRID_REGIONS["${region}"],
    measured_response_time_seconds=${responseTime},
    input_tokens=${inputTokens ?? 1000},
    output_tokens=${outputTokens ?? 800},
    utilization=${utilization},
    hour_of_day=14,
)

# Total: ${totalDisplay} CO₂e per request
print(result.total_co2_grams, "g CO₂e")
print(result.components)   # full per-component breakdown`;

  const jsAdvanced = `// Report the footprint on every API response (the schema in §1).
import { toApiEmissions } from "@berget/co2-calculator";

app.post("/v1/chat/completions", async (req, res) => {
  const out = await runYourModel(req.body);          // your serving stack
  const result = calculateInference({
    modelProfile: yourModel,
    hardware: yourHardware,                           // measured, not assumed
    deploymentGrid: yourGrid,
    measuredResponseTimeSeconds: out.latencySeconds,  // measure per request
    inputTokens: out.usage.prompt_tokens,
    outputTokens: out.usage.completion_tokens,
    utilization: yourNodeUtilization,                 // from your own metrics
    hourOfDay: new Date().getHours(),
  });
  res.json({
    ...out,
    usage: { ...out.usage, emissions: toApiEmissions(result, yourGridKey) },
  });
});`;

  const pyAdvanced = `# Custom hardware + custom grid: bring your own measurements.
from berget_co2_calculator import HardwareConfig, GridRegion

my_hardware = HardwareConfig(
    gpu_count=8,
    node_idle_watts=1900,        # measure with DCGM / IPMI, don't assume
    node_peak_watts=8500,
    embodied_per_gpu_kg=1000,
    other_compute_embodied_kg=4000,
    chassis_watts=1500,
    gpu_hbm_gb=268,
)

my_grid = GridRegion(
    name="My datacentre",
    intensity_g_per_kwh=42,       # your PPA / grid mix
    typical_pue=1.2,              # your measured PUE
    # ...demand curve, cooling, water
)

# Batch: score a whole traffic mix, not just one request.
totals = sum(
    calculate_inference(**req).total_co2_grams for req in days_requests
)`;

  return (
    <div style={{ background: C.ghost, borderRadius: 12, padding: "1.25rem", border: `1px solid ${C.border}`, marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <Wrench size={16} strokeWidth={1.5} style={{ color: C.moss }} />
        <span style={{ fontSize: "0.9rem", color: C.peak, fontWeight: 600 }}>Implement this in your stack</span>

        {/* Python / JS picker */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.25rem", background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "0.2rem" }}>
          {(["js", "python"] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              style={{
                padding: "0.25rem 0.7rem",
                borderRadius: 5,
                border: "none",
                cursor: "pointer",
                fontSize: "0.72rem",
                fontWeight: 600,
                fontFamily: "inherit",
                background: lang === l ? C.moss : "transparent",
                color: lang === l ? "#0b1512" : C.muted,
                transition: "background 0.15s ease",
              }}
            >
              {l === "js" ? "JavaScript" : "Python"}
            </button>
          ))}
        </div>
      </div>

      <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", color: C.cloud, lineHeight: 1.55 }}>
        Been asked to add CO₂ reporting to your service? The open-source library does the maths above — you supply
        your measured latency, token counts and node utilization, and it returns the full per-request breakdown to
        attach to your API responses.
      </p>

      <SubHeading>Quickstart</SubHeading>
      <CodeBlock>{lang === "js" ? jsQuick : pyQuick}</CodeBlock>

      <SubHeading>Advanced usage</SubHeading>
      <CodeBlock>{lang === "js" ? jsAdvanced : pyAdvanced}</CodeBlock>

      <div style={{ marginTop: "0.85rem", fontSize: "0.72rem", color: C.muted, lineHeight: 1.5 }}>
        {lang === "js"
          ? "TypeScript types included. The same engine powers this site, so the numbers you ship match the numbers you see here."
          : "The Python package mirrors the TypeScript reference implementation — same methodology, same numbers."}
      </div>
    </div>
  );
}
