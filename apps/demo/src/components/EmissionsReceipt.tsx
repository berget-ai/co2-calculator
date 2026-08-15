import { useState } from "react";
import { C } from "./shared";
import { toApiEmissions } from "@berget/co2-calculator";
import type { InferenceResult as LibInferenceResult } from "@berget/co2-calculator";
import type { InferenceResult, ModelProfile } from "./types";

interface Props {
  result: InferenceResult | null;
  model: ModelProfile | undefined;
  selectedModel: string;
  region: string;
}

/**
 * A communicative "receipt" illustration of the emissions every response
 * carries — designed to be read at a glance by journalists and
 * non-specialists, NOT as raw API data. The gradient background and the
 * single large figure signal that this is an illustration of the idea; the
 * full JSON schema is one tap away for engineers who want the detail.
 */
export function EmissionsReceipt({ result, model, selectedModel, region }: Props) {
  const [showJson, setShowJson] = useState(false);
  const emissions = result ? toApiEmissions(result as unknown as LibInferenceResult, region) : null;
  if (!emissions) return null;

  const co2Mg = emissions.co2e_grams * 1000;
  const co2Display = co2Mg >= 100 ? `${co2Mg.toFixed(0)} mg` : co2Mg >= 1 ? `${co2Mg.toFixed(1)} mg` : `${co2Mg.toFixed(2)} mg`;
  const modelName = model?.displayName ?? selectedModel;

  return (
    <div
      style={{
        borderRadius: 14,
        overflow: "hidden",
        // A soft green gradient — deliberately "designed", not a terminal, so
        // it reads as an illustration of the concept rather than raw data.
        background: `linear-gradient(135deg, rgba(96,165,128,0.16) 0%, rgba(20,40,32,0.55) 55%, rgba(10,22,18,0.7) 100%)`,
        border: `1px solid ${C.borderMoss}`,
      }}
    >
      <div style={{ padding: "1.5rem 1.5rem 1.25rem" }}>
        <div
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            color: C.moss,
            textTransform: "uppercase",
            letterSpacing: "0.09em",
            marginBottom: "0.9rem",
          }}
        >
          Illustration — what every response reports
        </div>

        {/* The single headline figure */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "2.6rem", fontWeight: 800, color: C.peak, letterSpacing: "-0.02em", lineHeight: 1 }}>
            {co2Display}
          </span>
          <span style={{ fontSize: "1rem", color: C.cloud, fontWeight: 500 }}>CO₂e per response</span>
        </div>

        <div style={{ marginTop: "0.85rem", fontSize: "0.85rem", color: C.cloud, lineHeight: 1.55 }}>
          <span style={{ color: C.moss, fontWeight: 600 }}>{modelName}</span>
          {" · "}
          {emissions.grid.region}
          {" · "}
          {emissions.grid.carbon_intensity_gco2e_per_kwh} g/kWh
        </div>

        {/* A minimal two-way split — the only structure a layperson needs */}
        <div style={{ display: "flex", gap: "1.25rem", marginTop: "1rem", fontSize: "0.78rem", color: C.muted }}>
          <span>
            <span style={{ color: C.cloud, fontWeight: 600 }}>{(emissions.operational.co2e_grams * 1000).toFixed(1)} mg</span> energy
          </span>
          <span>
            <span style={{ color: C.cloud, fontWeight: 600 }}>{(emissions.embodied.co2e_grams * 1000).toFixed(1)} mg</span> hardware
          </span>
        </div>
      </div>

      {/* The full schema, tucked away for engineers */}
      <button
        type="button"
        onClick={() => setShowJson((s) => !s)}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          padding: "0.65rem 1.5rem",
          background: "rgba(0,0,0,0.25)",
          border: "none",
          borderTop: `1px solid ${C.borderMoss}`,
          color: C.muted,
          fontSize: "0.72rem",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {showJson ? "▾ Hide the raw API response (for engineers)" : "▸ See the raw API response (for engineers)"}
      </button>
      {showJson && (
        <pre
          style={{
            margin: 0,
            padding: "1rem 1.5rem",
            background: "rgba(0,0,0,0.5)",
            fontSize: "0.72rem",
            overflow: "auto",
            color: C.cloud,
            fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)",
            lineHeight: 1.55,
            borderTop: `1px solid ${C.borderMoss}`,
          }}
        >
{`"usage": {
  "emissions": {
    "co2e_grams": ${emissions.co2e_grams.toFixed(6)},
    "energy_kwh": ${emissions.energy_kwh},
    "operational": { "co2e_grams": ${emissions.operational.co2e_grams.toFixed(6)} },
    "embodied":    { "co2e_grams": ${emissions.embodied.co2e_grams.toFixed(6)} },
    "grid": { "region": "${emissions.grid.region}", "carbon_intensity_gco2e_per_kwh": ${emissions.grid.carbon_intensity_gco2e_per_kwh} },
    "methodology": "${emissions.methodology}",
    "methodology_version": "${emissions.methodology_version}"
  }
}`}
        </pre>
      )}
    </div>
  );
}
