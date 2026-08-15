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
 * carries. The actual JSON the API returns sits in the BACKGROUND — tilted,
 * faded, and partially masked — so a technical reader sees at a glance that
 * this is real JSON output, while a journalist or project lead just reads the
 * single headline figure on top. It is an illustration of the idea, not a
 * wall of data; the full schema is one tap away for engineers.
 */
export function EmissionsReceipt({ result, model, selectedModel, region }: Props) {
  const [showJson, setShowJson] = useState(false);
  const emissions = result ? toApiEmissions(result as unknown as LibInferenceResult, region) : null;
  if (!emissions) return null;

  const co2Mg = emissions.co2e_grams * 1000;
  const co2Display = co2Mg >= 100 ? `${co2Mg.toFixed(0)} mg` : co2Mg >= 1 ? `${co2Mg.toFixed(1)} mg` : `${co2Mg.toFixed(2)} mg`;
  const modelName = model?.displayName ?? selectedModel;

  // The real JSON the API returns — rendered small, tilted and faded behind
  // the headline so it reads as texture ("this is genuinely JSON") rather
  // than as something you are meant to parse.
  const jsonLines = [
    `"usage": {`,
    `  "emissions": {`,
    `    "co2e_grams": ${emissions.co2e_grams.toFixed(6)},`,
    `    "energy_kwh": ${emissions.energy_kwh},`,
    `    "operational": { "co2e_grams": ${emissions.operational.co2e_grams.toFixed(6)} },`,
    `    "embodied": { "co2e_grams": ${emissions.embodied.co2e_grams.toFixed(6)} },`,
    `    "grid": { "region": "${emissions.grid.region}",`,
    `      "carbon_intensity_gco2e_per_kwh": ${emissions.grid.carbon_intensity_gco2e_per_kwh} },`,
    `    "methodology": "${emissions.methodology}",`,
    `    "methodology_version": "${emissions.methodology_version}"`,
    `  }`,
    `}`,
  ];

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 14,
        overflow: "hidden",
        background: `linear-gradient(135deg, rgba(96,165,128,0.18) 0%, rgba(20,40,32,0.6) 55%, rgba(10,22,18,0.78) 100%)`,
        border: `1px solid ${C.borderMoss}`,
      }}
    >
      {/* Tilted JSON backdrop — visible but clearly decorative */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-8%",
          right: "-6%",
          width: "75%",
          transform: "rotate(-7deg)",
          transformOrigin: "top right",
          opacity: 0.16,
          pointerEvents: "none",
          fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)",
          fontSize: "0.62rem",
          lineHeight: 1.7,
          color: C.moss,
          whiteSpace: "pre",
          // Fade the text out toward the bottom-left so the headline stays
          // perfectly legible on top of it.
          maskImage: "linear-gradient(115deg, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.25) 70%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(115deg, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.25) 70%, transparent 100%)",
        }}
      >
        {jsonLines.join("\n")}
      </div>

      {/* Foreground content */}
      <div style={{ position: "relative", padding: "1.5rem 1.5rem 1.25rem" }}>
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
          position: "relative",
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
            position: "relative",
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
{jsonLines.join("\n")}
        </pre>
      )}
    </div>
  );
}
