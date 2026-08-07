import { useMemo } from "react";
import { C } from "./shared";
import { calculateInference, MODEL_PROFILES, HARDWARE_CONFIGS, GRID_REGIONS } from "@berget/co2-calculator";

/**
 * "Your levers" donut — shows, for each procurement choice, the span between
 * the best and worst option (as a multiplier of the best), so a buyer can see
 * where the big emissions levers actually sit. Computed live from the
 * calculator, not hard-coded.
 */

interface Lever {
  label: string;
  best: string;
  worst: string;
  ratio: number; // worst / best
}

function run(modelId: string, gridKey: string, hw: any, extra: any = {}): number {
  const model = MODEL_PROFILES[modelId];
  const grid = GRID_REGIONS[gridKey];
  if (!model || !grid) return 0;
  return calculateInference({
    modelProfile: model,
    hardware: hw,
    deploymentGrid: grid,
    measuredResponseTimeSeconds: model.defaultResponseTimeSeconds,
    inputTokens: model.defaultInputTokens,
    outputTokens: model.defaultOutputTokens,
    hourOfDay: 14,
    includeTraining: false,
    lifetimeQueries: 0,
    ...extra,
  }).totalCO2Grams;
}

function computeLevers(): Lever[] {
  const hwNew = HARDWARE_CONFIGS.h200;
  const hwRefurb = { ...HARDWARE_CONFIGS.h200, embodiedPerGpuKg: 0 };
  const REF = "google/gemma-4-31B-it"; // reference model for non-model levers

  // Pick the smallest and largest text models dynamically from the catalogue,
  // so the span stays correct as we add or calibrate models. (Embeddings /
  // speech models are excluded — they aren't comparable inference workloads.)
  const textModels = Object.values(MODEL_PROFILES).filter(
    (m: any) => m.architecture?.includes("transformer") || m.architecture === "mixture-of-experts"
  );
  const byParams = [...textModels].sort((a: any, b: any) => a.parameters - b.parameters);
  const SMALL = byParams[0]?.modelId ?? REF;
  const LARGE = byParams[byParams.length - 1]?.modelId ?? REF;

  // Find the cleanest and dirtiest grids dynamically too.
  const grids = Object.entries(GRID_REGIONS) as [string, any][];
  const byIntensity = [...grids].sort(
    (a, b) => (a[1].intensityGPerKwh ?? 0) - (b[1].intensityGPerKwh ?? 0)
  );
  const cleanestGrid = byIntensity[0]?.[0] ?? "sweden";
  const dirtiestGrid = byIntensity[byIntensity.length - 1]?.[0] ?? "china";

  const gridBest = run(REF, cleanestGrid, hwNew);
  const gridWorst = run(REF, dirtiestGrid, hwNew);

  const hwBest = run(REF, cleanestGrid, hwRefurb);
  const hwWorst = run(REF, cleanestGrid, hwNew);

  const modelBest = run(SMALL, cleanestGrid, hwNew);
  const modelWorst = run(LARGE, cleanestGrid, hwNew);

  const deployBest = run(REF, cleanestGrid, hwNew);
  const deployWorst = run(REF, cleanestGrid, hwNew, { deployment: "onprem" });

  const cacheBest = run(REF, cleanestGrid, hwNew, { caching: true });
  const cacheWorst = run(REF, cleanestGrid, hwNew, { caching: false });

  const cleanestName = GRID_REGIONS[cleanestGrid]?.name ?? cleanestGrid;
  const dirtiestName = GRID_REGIONS[dirtiestGrid]?.name ?? dirtiestGrid;

  // Guard each ratio: a failed lookup returns 0, which would give Infinity /
  // NaN and break the log-scaling and SVG. Fall back to 1 (no span) instead.
  const safeRatio = (worst: number, best: number) => {
    const r = best > 0 ? worst / best : 1;
    return Number.isFinite(r) && r > 0 ? r : 1;
  };

  return [
    { label: "Model", best: byParams[0]?.displayName ?? "smallest", worst: byParams[byParams.length - 1]?.displayName ?? "largest", ratio: safeRatio(modelWorst, modelBest) },
    { label: "Hardware", best: "refurbished", worst: "new", ratio: safeRatio(hwWorst, hwBest) },
    { label: "Grid", best: cleanestName, worst: dirtiestName, ratio: safeRatio(gridWorst, gridBest) },
    { label: "Sharing", best: "shared", worst: "on-prem", ratio: safeRatio(deployWorst, deployBest) },
    { label: "Caching", best: "on", worst: "off", ratio: safeRatio(cacheWorst, cacheBest) },
  ];
}

// Log-scale the ratios so 72x and 1.3x are both readable on the same ring.
// Computed adaptively from the largest lever so the ring never clips.
function maxLogFor(levers: Lever[]): number {
  const maxRatio = Math.max(...levers.map((l) => l.ratio), 2);
  const log = Math.log2(maxRatio * 1.1);
  return Number.isFinite(log) && log > 0 ? log : 1;
}

export function LeversDonut() {
  const levers = useMemo(computeLevers, []);
  const MAX_LOG = maxLogFor(levers);

  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 120;
  const rInner = 68;
  const gap = 4; // degrees between segments

  const segAngle = 360 / levers.length;

  const polar = (r: number, angleDeg: number) => {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  const arcPath = (rO: number, rI: number, startDeg: number, endDeg: number) => {
    const [x0, y0] = polar(rO, startDeg);
    const [x1, y1] = polar(rO, endDeg);
    const [x2, y2] = polar(rI, endDeg);
    const [x3, y3] = polar(rI, startDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return [
      `M ${x0} ${y0}`,
      `A ${rO} ${rO} 0 ${large} 1 ${x1} ${y1}`,
      `L ${x2} ${y2}`,
      `A ${rI} ${rI} 0 ${large} 0 ${x3} ${y3}`,
      "Z",
    ].join(" ");
  };

  // Colour ramp: strong (moss) for big levers, muted for small ones.
  const colorFor = (ratio: number) => {
    const t = Math.log2(ratio) / MAX_LOG; // 0..1
    if (t > 0.66) return C.danger;
    if (t > 0.33) return "#D4A574"; // amber
    return C.moss;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: "100%", height: "auto" }}>
        {levers.map((lever, i) => {
          const start = i * segAngle + gap / 2;
          const end = (i + 1) * segAngle - gap / 2;
          // Outer radius encodes the span (log-scaled): small span stays near
          // the hub, big span reaches the edge.
          const t = Math.log2(lever.ratio) / MAX_LOG;
          const rO = rInner + (rOuter - rInner) * Math.max(0.08, t);
          const mid = (start + end) / 2;
          const [lx, ly] = polar((rOuter + rInner) / 2, mid);
          const [tx, ty] = polar(rOuter + 16, mid);
          return (
            <g key={lever.label}>
              {/* faint full ring as the track */}
              <path d={arcPath(rOuter, rInner, start, end)} fill="rgba(255,255,255,0.05)" />
              {/* the lever's actual span */}
              <path d={arcPath(rO, rInner, start, end)} fill={colorFor(lever.ratio)} opacity={0.9} />
              {/* ratio label at the outer edge */}
              <text
                x={tx}
                y={ty}
                fill={C.peak}
                fontSize="12"
                fontWeight="700"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {lever.ratio >= 10 ? `${Math.round(lever.ratio)}×` : `${lever.ratio.toFixed(1)}×`}
              </text>
              {/* lever name inside the hub ring */}
              <text
                x={lx}
                y={ly}
                fill={C.cloud}
                fontSize="10"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {lever.label}
              </text>
            </g>
          );
        })}
        <text x={cx} y={cy - 8} fill={C.peak} fontSize="13" fontWeight="700" textAnchor="middle">
          Your levers
        </text>
        <text x={cx} y={cy + 10} fill={C.muted} fontSize="9.5" textAnchor="middle">
          best → worst span
        </text>
      </svg>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.4rem 1.1rem", fontSize: "0.7rem", color: C.muted, maxWidth: 480 }}>
        {levers.map((l) => (
          <span key={l.label}>
            <strong style={{ color: C.cloud }}>{l.label}:</strong> {l.best} → {l.worst}{" "}
            <span style={{ color: C.peak, fontWeight: 600 }}>
              {l.ratio >= 10 ? `${Math.round(l.ratio)}×` : `${l.ratio.toFixed(1)}×`}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
