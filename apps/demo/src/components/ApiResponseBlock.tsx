import { C } from "./shared";
import type { InferenceResult, ModelProfile } from "./types";

interface Props {
  result: InferenceResult | null;
  model: ModelProfile | undefined;
  selectedModel: string;
  highlightKey?: "co2" | "energy" | null;
}

/**
 * The API response JSON — rendered with live values from the calculator.
 * Used as the hero of the guide ("start with the evidence") and in the
 * call-to-action section.
 */
export function ApiResponseBlock({ result, model, selectedModel, highlightKey = null }: Props) {
  const co2 = (result?.totalCO2Grams || 0).toFixed(6);
  const joules = ((result?.components.gpuOperational.energyKwh || 0) * 3_600_000).toFixed(1);
  const promptTokens = model?.defaultInputTokens || 0;
  const completionTokens = model?.defaultOutputTokens || 0;

  const row = (
    key: string,
    value: string,
    highlight: boolean,
    comment?: string
  ) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "1rem",
        padding: "0.15rem 0.5rem",
        margin: "0 -0.5rem",
        borderRadius: 4,
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
        <div>
          <span style={{ color: "rgba(142, 178, 159, 0.9)" }}>"usage"</span>
          <span style={{ color: C.muted }}>: {"{"}</span>
        </div>
        <div style={{ paddingLeft: "1rem" }}>
          {row("prompt_tokens", String(promptTokens), false)}
          {row("completion_tokens", String(completionTokens), false)}
          {row("total_tokens", String(promptTokens + completionTokens), false)}
          {row("co2_grams", co2, highlightKey === "co2", "← see §1–4")}
          {row("gpu_compute_energy_joules", joules, highlightKey === "energy", "← compute only, excludes idle standby — see §2, §3")}
        </div>
        <div>
          <span style={{ color: C.muted }}>{"}"}</span>
        </div>
      </div>
      <div>{"}"}</div>
    </pre>
  );
}
