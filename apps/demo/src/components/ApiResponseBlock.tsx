import { C } from "./shared";
import { toApiEmissions } from "@berget/co2-calculator";
import type { InferenceResult as LibInferenceResult } from "@berget/co2-calculator";
import type { InferenceResult, ModelProfile } from "./types";

interface Props {
  result: InferenceResult | null;
  model: ModelProfile | undefined;
  selectedModel: string;
  /** Grid region key (e.g. "sweden") used for the emissions grid field. */
  region: string;
  highlightKey?: "co2" | "energy" | null;
}

/**
 * The API response JSON — rendered with live values from the calculator.
 * Used as the hero of the guide ("start with the evidence") and in the
 * call-to-action section.
 *
 * The emissions block mirrors the public `usage.emissions` schema that
 * `toApiEmissions` produces, so what we show here is exactly what we ask the
 * industry to return.
 */
export function ApiResponseBlock({ result, model, selectedModel, region, highlightKey = null }: Props) {
  const promptTokens = model?.defaultInputTokens || 0;
  const completionTokens = model?.defaultOutputTokens || 0;
  // The demo keeps a loose structural InferenceResult type (see ./types), but
  // the value passed in is the calculator's real result, which satisfies the
  // library's fuller InferenceResult. Cast to call toApiEmissions type-safely.
  const emissions = result ? toApiEmissions(result as unknown as LibInferenceResult, region) : null;

  // Format kWh readably (no scientific notation): per-request values are tiny,
  // so show 4 significant figures in plain decimal, e.g. 0.0001485.
  const fmtKwh = (kwh: number): string => {
    if (kwh === 0) return "0";
    // Find how many leading zeros the decimal part has, then show 4 sig figs.
    const magnitude = Math.floor(Math.log10(Math.abs(kwh)));
    const decimals = Math.max(0, -magnitude + 3);
    return kwh.toFixed(decimals);
  };

  const row = (
    key: string,
    value: string,
    highlight: boolean,
    comment?: string,
    indent = 1
  ) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.15rem 0.5rem",
        margin: "0 -0.5rem",
        borderRadius: 4,
        paddingLeft: `${indent}rem`,
        background: highlight ? "rgba(96, 165, 128, 0.15)" : "transparent",
        transition: "background 0.3s ease",
      }}
    >
      <span>
        <span style={{ color: highlight ? C.moss : "rgba(142, 178, 159, 0.9)" }}>"{key}"</span>
        <span style={{ color: C.muted }}>: </span>
        <span style={{ color: highlight ? C.peak : C.cloud }}>{value}</span>
        <span style={{ color: C.muted }}>,</span>
      </span>
      {comment && (
        <span style={{ color: "rgba(255,255,255,0.35)", fontStyle: "italic", textAlign: "right" }}>{comment}</span>
      )}
    </div>
  );

  const open = (key: string, indent = 1) => (
    <div style={{ paddingLeft: `${indent}rem` }}>
      <span style={{ color: "rgba(142, 178, 159, 0.9)" }}>"{key}"</span>
      <span style={{ color: C.muted }}>: {"{"}</span>
    </div>
  );
  const close = (indent = 1, comma = true) => (
    <div style={{ paddingLeft: `${indent}rem`, color: C.muted }}>
      {"}"}
      {comma ? "," : ""}
    </div>
  );

  return (
    <pre
      style={{
        margin: 0,
        padding: "1rem",
        background: "rgba(0,0,0,0.5)",
        borderRadius: 6,
        fontSize: "0.8rem",
        overflow: "auto",
        color: C.cloud,
        fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)",
        lineHeight: 1.6,
      }}
    >
      <div style={{ color: C.muted }}>{"// POST https://api.berget.ai/v1/chat/completions"}</div>
      <div style={{ color: C.muted }}>{"// model: "}{selectedModel}</div>
      <div>{"{"}</div>
      <div style={{ paddingLeft: "1rem" }}>
        <div>
          <span style={{ color: "rgba(142, 178, 159, 0.9)" }}>"choices"</span>
          <span style={{ color: C.muted }}>: [...],</span>
        </div>
        {open("usage")}
        <div style={{ paddingLeft: "1rem" }}>
          {row("prompt_tokens", String(promptTokens), false, undefined, 2)}
          {row("completion_tokens", String(completionTokens), false, undefined, 2)}
          {row("total_tokens", String(promptTokens + completionTokens), false, undefined, 2)}
          {emissions && (
            <>
              {open("emissions", 2)}
              {row("co2e_grams", emissions.co2e_grams.toFixed(6), highlightKey === "co2", "← see §1–4", 3)}
              {row("energy_kwh", fmtKwh(emissions.energy_kwh), highlightKey === "energy", "← operational energy — see §2, §3", 3)}
              {open("operational", 3)}
              {row("co2e_grams", emissions.operational.co2e_grams.toFixed(6), false, undefined, 4)}
              {row("energy_kwh", fmtKwh(emissions.operational.energy_kwh), false, undefined, 4)}
              {close(3)}
              {open("embodied", 3)}
              {row("co2e_grams", emissions.embodied.co2e_grams.toFixed(6), false, "← hardware amortised — see §3", 4)}
              {close(3, false)}
              {open("grid", 3)}
              {row("region", `"${emissions.grid.region}"`, false, undefined, 4)}
              {row("carbon_intensity_gco2e_per_kwh", String(emissions.grid.carbon_intensity_gco2e_per_kwh), false, undefined, 4)}
              {close(3, false)}
              {row("methodology", `"${emissions.methodology}"`, false, undefined, 3)}
              {row("methodology_version", `"${emissions.methodology_version}"`, false, undefined, 3)}
              {close(2, false)}
            </>
          )}
        </div>
        {close(1, false)}
      </div>
      <div>{"}"}</div>
    </pre>
  );
}
