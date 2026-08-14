import { C } from "./shared";
import type { GridRegion, ModelProfile } from "./types";
import { HARDWARE_CONFIGS, calculateInference } from "@berget/co2-calculator";

interface Props {
  model: ModelProfile | undefined;
  grid: GridRegion | undefined;
  utilization: number;
  gpuCondition: "new" | "refurbished";
  infraCondition: "new" | "refurbished";
  hourOfDay: number;
  onUtilizationChange: (v: number) => void;
}

// The three labelled anchors on the slider — the named deployments the
// utilization value corresponds to. The slider itself is continuous.
const ANCHORS = [
  { u: 0.10, label: "Your own server", note: "bought for peak, mostly waiting" },
  { u: 0.70, label: "Shared (Berget)", note: "a well-run shared node" },
  { u: 0.90, label: "Hyperscaler", note: "a hot, well-scheduled fleet" },
];

function footprintAt(
  model: ModelProfile,
  grid: GridRegion,
  gpuCondition: "new" | "refurbished",
  infraCondition: "new" | "refurbished",
  hourOfDay: number,
  u: number
): number {
  const hw = {
    ...HARDWARE_CONFIGS.b300,
    embodiedPerGpuKg: gpuCondition === "refurbished" ? 0 : HARDWARE_CONFIGS.b300.embodiedPerGpuKg,
    otherComputeEmbodiedKg: infraCondition === "refurbished" ? 0 : HARDWARE_CONFIGS.b300.otherComputeEmbodiedKg,
  };
  const r = calculateInference({
    modelProfile: model as any,
    hardware: hw,
    deploymentGrid: grid as any,
    measuredResponseTimeSeconds: (model as any).defaultResponseTimeSeconds ?? 1,
    inputTokens: model.defaultInputTokens,
    outputTokens: model.defaultOutputTokens,
    utilization: u,
    hourOfDay,
    includeTraining: false,
    lifetimeQueries: 1_000_000_000,
  });
  return r.totalCO2Grams * 1000; // mg
}

/**
 * A single slider over the node's lifetime UTILIZATION — the one physical
 * variable behind the deployment difference. A node bought for peak but
 * mostly waiting (low utilization) spreads its standby ENERGY (GPU idle +
 * server chassis) over few productive hours, so each request bears more of
 * it; a hot, well-scheduled node spreads that standby over many. (Embodied
 * carbon is amortised over the 5-year lifetime at a fixed rate wherever the
 * node sits, so it does not move with utilization.) Three labelled anchors
 * mark the named deployments; the slider itself is continuous.
 */
export function UtilizationSlider({
  model,
  grid,
  utilization,
  gpuCondition,
  infraCondition,
  hourOfDay,
  onUtilizationChange,
}: Props) {
  if (!model || !grid) return null;

  const pct = Math.round(utilization * 100);
  const current = footprintAt(model, grid, gpuCondition, infraCondition, hourOfDay, utilization);
  const fmt = (mg: number) => (mg >= 100 ? `${mg.toFixed(0)} mg` : mg >= 1 ? `${mg.toFixed(1)} mg` : `${mg.toFixed(2)} mg`);

  // Nearest anchor for the label
  const nearest = ANCHORS.reduce((a, b) => (Math.abs(b.u - utilization) < Math.abs(a.u - utilization) ? b : a));

  return (
    <div>
      {/* Slider with anchors */}
      <div style={{ marginBottom: "0.4rem", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: C.peak }}>Node utilization</span>
        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: C.cloud }}>
          {pct}% <span style={{ fontSize: "0.72rem", fontWeight: 400, color: C.muted }}>· {fmt(current)} per request</span>
        </span>
      </div>

      <input
        type="range"
        min={5}
        max={95}
        step={1}
        value={pct}
        onChange={(e) => onUtilizationChange(Number(e.target.value) / 100)}
        style={{ width: "100%" }}
        aria-label="Node utilization"
      />

      {/* Anchor labels */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem" }}>
        {ANCHORS.map((a) => {
          const active = nearest.u === a.u;
          return (
            <button
              key={a.u}
              type="button"
              onClick={() => onUtilizationChange(a.u)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: a.u === 0.10 ? "left" : a.u === 0.90 ? "right" : "center",
                flex: 1,
                padding: 0,
                fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: "0.72rem", fontWeight: active ? 700 : 500, color: active ? C.cloud : C.muted }}>
                {a.label} · {Math.round(a.u * 100)}%
              </div>
              <div style={{ fontSize: "0.64rem", color: C.muted }}>{a.note}</div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: "0.6rem", fontSize: "0.68rem", color: C.muted, lineHeight: 1.45 }}>
        A mostly-idle node spreads its standby draw (GPU idle + server chassis) over few productive hours, so each
        request bears more of it. The hardware's embodied carbon is amortised over its 5-year life wherever it sits —
        the slider changes how the standby energy is divided across requests, not the embodied share.
      </div>
    </div>
  );
}
