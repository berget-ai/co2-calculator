import { useMemo } from "react";
import { C } from "./shared";
import type { DeploymentProfile, GridRegion, ModelProfile } from "./types";
import { HARDWARE_CONFIGS, GRID_REGIONS, calculateInference } from "@berget/co2-calculator";

interface Props {
  model: ModelProfile | undefined;
  grid: GridRegion | undefined;
  deployment: DeploymentProfile;
  gpuCondition: "new" | "refurbished";
  infraCondition: "new" | "refurbished";
  hourOfDay: number;
  onDeploymentChange: (v: DeploymentProfile) => void;
}

interface ProfileBar {
  key: DeploymentProfile;
  label: string;
  blurb: string;
  total: number; // mg CO₂e
  // Stacked segments (mg CO₂e)
  energy: number; // gpu compute + idle + server + overhead
  embodied: number; // gpu embodied + supporting infra embodied
}

const PROFILE_META: Record<DeploymentProfile, { label: string; blurb: string }> = {
  onprem: {
    label: "Your own server",
    blurb: "You bear the node's whole fixed cost, in an enterprise server room (PUE ~1.4).",
  },
  shared: {
    label: "Shared (Berget)",
    blurb: "The fixed cost is amortised over the day's requests, in a Nordic datacentre (PUE ~1.15).",
  },
  hyperscaler: {
    label: "Hyperscaler",
    blurb: "Disaggregated serving (separate prefill/decode) packs more onto each GPU, at hyperscale PUE (~1.1).",
  },
};

const ORDER: DeploymentProfile[] = ["onprem", "shared", "hyperscaler"];

/**
 * A 3-bar comparison of the per-request footprint across the three serving
 * deployments. Replaces the old concurrency curve: with fixed costs amortised
 * over the day, "how many share right now" is no longer the lever — WHO runs
 * the hardware, and how efficiently it is shared, is. Each bar stacks the
 * energy-derived and embodied terms; the selected profile is highlighted and
 * the bars are clickable.
 */
export function DeploymentProfileChart({
  model,
  grid,
  deployment,
  gpuCondition,
  infraCondition,
  hourOfDay,
  onDeploymentChange,
}: Props) {
  const bars = useMemo<ProfileBar[]>(() => {
    if (!model || !grid) return [];
    const hw = {
      ...HARDWARE_CONFIGS.b300,
      embodiedPerGpuKg: gpuCondition === "refurbished" ? 0 : HARDWARE_CONFIGS.b300.embodiedPerGpuKg,
      otherComputeEmbodiedKg: infraCondition === "refurbished" ? 0 : HARDWARE_CONFIGS.b300.otherComputeEmbodiedKg,
    };
    return ORDER.map((key) => {
      const r = calculateInference({
        modelProfile: model as any,
        hardware: hw,
        deploymentGrid: grid as any,
        measuredResponseTimeSeconds: (model as any).defaultResponseTimeSeconds ?? 1,
        inputTokens: model.defaultInputTokens,
        outputTokens: model.defaultOutputTokens,
        hourOfDay,
        includeTraining: false,
        lifetimeQueries: 1_000_000_000,
        deployment: key,
      });
      const c = r.components;
      const energy =
        c.gpuOperational.co2Grams + c.gpuIdle.co2Grams + c.serverOperational.co2Grams + c.datacenterOverhead.co2Grams;
      const embodied = c.embodiedGpu.co2Grams + c.embodiedOther.co2Grams;
      return {
        key,
        label: PROFILE_META[key].label,
        blurb: PROFILE_META[key].blurb,
        total: r.totalCO2Grams * 1000, // → mg
        energy: energy * 1000,
        embodied: embodied * 1000,
      };
    });
  }, [model, grid, gpuCondition, infraCondition, hourOfDay]);

  if (!model || !grid || bars.length === 0) return null;

  const maxTotal = Math.max(...bars.map((b) => b.total)) || 1;
  const fmt = (mg: number) => (mg >= 100 ? `${mg.toFixed(0)} mg` : mg >= 1 ? `${mg.toFixed(1)} mg` : `${mg.toFixed(2)} mg`);

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        {bars.map((b) => {
          const selected = b.key === deployment;
          const widthPct = (b.total / maxTotal) * 100;
          const energyPct = b.total > 0 ? (b.energy / b.total) * 100 : 0;
          return (
            <button
              key={b.key}
              onClick={() => onDeploymentChange(b.key)}
              style={{
                textAlign: "left",
                background: selected ? "rgba(229,221,213,0.06)" : "transparent",
                border: `1px solid ${selected ? C.cloud : C.border}`,
                borderRadius: 8,
                padding: "0.6rem 0.7rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: selected ? C.cloud : C.muted }}>
                  {b.label}
                </span>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: selected ? C.peak : C.cloud }}>
                  {fmt(b.total)}
                </span>
              </div>
              {/* Stacked bar */}
              <div style={{ height: 12, width: "100%", background: "rgba(229,221,213,0.08)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${widthPct}%`, display: "flex", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ width: `${energyPct}%`, background: "#D4A574" }} />
                  <div style={{ width: `${100 - energyPct}%`, background: "#8EB29F" }} />
                </div>
              </div>
              {selected && (
                <div style={{ marginTop: 6, fontSize: "0.68rem", color: C.muted, lineHeight: 1.45 }}>{b.blurb}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1rem", marginTop: "0.7rem", fontSize: "0.68rem", color: C.muted }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, background: "#D4A574", display: "inline-block", borderRadius: 2 }} />
          Energy (grid + PUE)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 12, background: "#8EB29F", display: "inline-block", borderRadius: 2 }} />
          Embodied (hardware)
        </span>
      </div>
    </div>
  );
}
