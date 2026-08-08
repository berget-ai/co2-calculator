import { useMemo, useRef } from "react";
import { C } from "./shared";
import type { GridRegion, ModelCategoryDef, ModelProfile } from "./types";
import { HARDWARE_CONFIGS } from "@berget/co2-calculator";

interface Props {
  category: ModelCategoryDef;
  model: ModelProfile | undefined;
  grid: GridRegion | undefined;
  concurrency: number;
  gpuCondition: "new" | "refurbished";
  infraCondition: "new" | "refurbished";
  onConcurrencyChange: (v: number) => void;
}

// Mirror of the library's applyConcurrencyDelay.
function delayFactor(concurrency: number): number {
  const baseline = 8;
  if (concurrency <= baseline) return 1;
  return 1 + Math.log2(concurrency / baseline) * 0.15;
}

// Model memory → GPUs allocated (mirror of gpusForModel).
function gpusForModel(model: ModelProfile | undefined, gpuMemoryGb: number, gpuCount: number): number {
  if (!model) return 1;
  const bytesPerParam = 2.0; // FP16 default (demo profiles)
  const modelMemoryGb = (model.parameters * bytesPerParam * 1.2) / 1024 ** 3;
  return Math.min(Math.ceil(modelMemoryGb / gpuMemoryGb), gpuCount);
}

interface Curve {
  gpuEnergy: number;
  shared: number; // server + cooling + embodied infra (the part divided by concurrency)
  embodiedGpu: number;
  total: number;
}

// Compute per-query CO₂ (grams) for a given concurrency, hour and config,
// replicating the library's math so the curve matches the live numbers.
function computePoint(
  c: number,
  hour: number,
  category: ModelCategoryDef,
  model: ModelProfile | undefined,
  grid: GridRegion | undefined,
  gpuCondition: "new" | "refurbished",
  infraCondition: "new" | "refurbished"
): Curve {
  if (!model || !grid) return { gpuEnergy: 0, shared: 0, embodiedGpu: 0, total: 0 };

  const hw = HARDWARE_CONFIGS.h200;
  const gpusUsed = gpusForModel(model, hw.gpuMemoryGb, hw.gpuCount);
  const baseTime = category.responseTime; // tokenRatio = 1 for the category default
  const gpuTimeSec = baseTime * delayFactor(c);
  const gpuTimeH = gpuTimeSec / 3600;

  // Time-of-day intensity factor (mirror applyTimeOfDay using demandCurve)
  const weight = (grid as any).demandCurve?.[hour] ?? 0.5;
  const lowThr = (grid as any).lowPeriodThreshold ?? 0.2;
  const factor = weight <= lowThr ? (grid as any).lowPeriodFactor ?? 0.7 : (grid as any).peakPeriodFactor ?? 1.15;
  const intensity = grid.intensityGPerKwh * factor;

  // GPU power: incremental compute only (idle handled separately), shared by concurrency
  const utilization = 0.25;
  const incrPerGpu = ((hw.nodePeakWatts - hw.nodeIdleWatts) / hw.gpuCount) * utilization;
  const gpuEnergyKwh = (incrPerGpu * gpuTimeH * gpusUsed) / c / 1000;
  const gpuOp = gpuEnergyKwh * intensity;

  // GPU idle baseline (standby draw), shared by concurrency
  const idlePerGpu = hw.nodeIdleWatts / hw.gpuCount;
  const idleEnergyKwh = (idlePerGpu * gpuTimeH * gpusUsed) / c / 1000;
  const idleOp = idleEnergyKwh * intensity;

  // Server (divided by concurrency) + cooling overhead on (gpu+idle+server)
  const serverEnergyKwh = (hw.chassisWatts * gpuTimeH) / 1000;
  const serverOp = (serverEnergyKwh * intensity) / c;
  const pue = (grid as any).typicalPue ?? 1.15;
  const cooling = (gpuOp + idleOp + serverOp) * (pue - 1);

  // Embodied (amortised over projected lifetime active seconds, 50% of 5y), shared by concurrency
  const GPU_LIFETIME_SECONDS = 5 * 365 * 24 * 3600;
  const projActive = GPU_LIFETIME_SECONDS * 0.5;
  const embodiedGpuKg = gpuCondition === "refurbished" ? 0 : hw.embodiedPerGpuKg;
  const embodiedGpu = (((embodiedGpuKg * 1000) / projActive) * gpuTimeSec * gpusUsed) / c;
  // Separate supporting infrastructure (databases, logging/storage, network),
  // amortised the same way and shared across the node's concurrent requests.
  const otherComputeKg = infraCondition === "refurbished" ? 0 : hw.otherComputeEmbodiedKg;
  const embodiedOther = (((otherComputeKg * 1000) / projActive) * gpuTimeSec) / c;

  const shared = idleOp + serverOp + cooling;
  const total = gpuOp + shared + embodiedGpu + embodiedOther;
  return { gpuEnergy: gpuOp, shared, embodiedGpu, total };
}

/**
 * A small SVG line chart: per-query CO₂ vs concurrent users, stacked by
 * component, with a "you are here" marker at the current slider value and a
 * night curve to show the time-of-day compensation.
 */
export function ConcurrencyChart({ category, model, grid, concurrency, gpuCondition, infraCondition, onConcurrencyChange }: Props) {
  const W = 560;
  const H = 220;
  const padL = 46;
  const padR = 14;
  const padT = 14;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const XMIN = 1;
  const XMAX = 64;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);

  const { dayPts, nightPts, maxY } = useMemo(() => {
    const day: Curve[] = [];
    const night: Curve[] = [];
    let max = 0;
    for (let c = XMIN; c <= XMAX; c++) {
      const d = computePoint(c, 14, category, model, grid, gpuCondition, infraCondition);
      const n = computePoint(c, 2, category, model, grid, gpuCondition, infraCondition);
      day.push(d);
      night.push(n);
      max = Math.max(max, d.total);
    }
    return { dayPts: day, nightPts: night, maxY: max * 1.08 || 1 };
  }, [category, model, grid, gpuCondition, infraCondition]);

  if (!model || !grid || maxY <= 0) return null;

  const x = (c: number) => padL + ((c - XMIN) / (XMAX - XMIN)) * innerW;
  const y = (v: number) => padT + innerH - (v / maxY) * innerH;

  const pathFor = (pts: Curve[], key: keyof Curve) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i + 1).toFixed(1)},${y(p[key] as number).toFixed(1)}`).join(" ");

  const cur = dayPts[Math.min(Math.max(concurrency, XMIN), XMAX) - 1];

  const fmt = (g: number) => (g < 1 ? `${(g * 1000).toFixed(1)} mg` : `${g.toFixed(2)} g`);

  // Convert a pointer x-position to a concurrency value and emit it.
  const setFromClientX = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * W; // viewBox coords
    const frac = (relX - padL) / innerW;
    const c = Math.round(XMIN + frac * (XMAX - XMIN));
    onConcurrencyChange(Math.max(XMIN, Math.min(XMAX, c)));
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragging.current) setFromClientX(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", cursor: "ew-resize", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1={padL} y1={padT + innerH} x2={padL + innerW} y2={padT + innerH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

        {/* X ticks */}
        {[1, 8, 16, 32, 48, 64].map((c) => (
          <g key={c}>
            <line x1={x(c)} y1={padT + innerH} x2={x(c)} y2={padT + innerH + 4} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <text x={x(c)} y={padT + innerH + 18} fill="rgba(255,255,255,0.45)" fontSize="9" textAnchor="middle">
              {c}
            </text>
          </g>
        ))}
        <text x={padL + innerW / 2} y={H - 4} fill="rgba(255,255,255,0.45)" fontSize="9" textAnchor="middle">
          concurrent users (drag in the chart)
        </text>

        {/* Y ticks (0, mid, max) */}
        {[0, maxY / 2, maxY].map((v, i) => (
          <text key={i} x={padL - 6} y={y(v) + 3} fill="rgba(255,255,255,0.45)" fontSize="9" textAnchor="end">
            {v === 0 ? "0" : fmt(v)}
          </text>
        ))}

        {/* Night curve (dashed) */}
        <path d={pathFor(nightPts, "total")} fill="none" stroke="rgba(142,178,159,0.55)" strokeWidth="1.5" strokeDasharray="4 3" />

        {/* Day total curve */}
        <path d={pathFor(dayPts, "total")} fill="none" stroke="#E5DDD5" strokeWidth="2.5" />

        {/* Embodied GPU (dominant, grows) */}
        <path d={pathFor(dayPts, "embodiedGpu")} fill="none" stroke="rgba(96,165,128,0.9)" strokeWidth="1.5" />
        {/* Shared (server+cooling+infra, falls) */}
        <path d={pathFor(dayPts, "shared")} fill="none" stroke="rgba(209,139,46,0.9)" strokeWidth="1.5" />

        {/* "You are here" marker */}
        <line x1={x(concurrency)} y1={padT} x2={x(concurrency)} y2={padT + innerH} stroke="rgba(229,221,213,0.35)" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx={x(concurrency)} cy={y(cur.total)} r="5" fill="#E5DDD5" stroke="#0A0A0A" strokeWidth="2" />
      </svg>

      {/* Legend + current value */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.5rem", fontSize: "0.7rem", color: C.muted, alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 3, background: "#E5DDD5", display: "inline-block", borderRadius: 2 }} /> Total (day)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 3, background: "rgba(96,165,128,0.9)", display: "inline-block", borderRadius: 2 }} /> Query time
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 3, background: "rgba(209,139,46,0.9)", display: "inline-block", borderRadius: 2 }} /> Embodied sharing
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 3, background: "rgba(142,178,159,0.55)", display: "inline-block", borderRadius: 2 }} /> Night
        </span>
        <span style={{ marginLeft: "auto", color: C.peak, fontWeight: 600 }}>
          now ({concurrency} users): {fmt(cur.total)}
        </span>
      </div>
    </div>
  );
}
