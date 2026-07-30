import { useMemo } from "react";
import { C } from "./shared";
import { DEFAULT_TRAFFIC_PATTERN } from "@berget/co2-calculator";

interface Props {
  /** Low-period threshold (weight below = night/low) */
  lowPeriodThreshold?: number;
  lowPeriodFactor?: number;
  peakPeriodFactor?: number;
}

/**
 * Graph 2 — a 24-hour view of a typical day. Shows relative usage (the demand
 * curve) and the CO₂ intensity factor applied each hour: peak ×1.15 by day,
 * low ×0.7 by night. Makes the point that moving a call to the night actually
 * lowers its CO₂ (cleaner marginal mix), while the asymmetric factors net to
 * ≈+2% over the day so the long-run total stays honest.
 */
export function DailyLoadChart({
  lowPeriodThreshold = 0.2,
  lowPeriodFactor = 0.7,
  peakPeriodFactor = 1.15,
}: Props) {
  const W = 560;
  const H = 200;
  const padL = 40;
  const padR = 44;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const hours = useMemo(() => {
    return DEFAULT_TRAFFIC_PATTERN.map((weight, hour) => {
      const isLow = weight <= lowPeriodThreshold;
      const factor = isLow ? lowPeriodFactor : peakPeriodFactor;
      return { hour, weight, isLow, factor };
    });
  }, [lowPeriodThreshold, lowPeriodFactor, peakPeriodFactor]);

  const maxWeight = Math.max(...DEFAULT_TRAFFIC_PATTERN);
  const x = (h: number) => padL + (h / 23) * innerW;
  const bw = innerW / 24;
  const yW = (w: number) => padT + innerH - (w / maxWeight) * innerH;
  // factor scale: 0.6 .. 1.3
  const yF = (f: number) => padT + innerH - ((f - 0.6) / (1.3 - 0.6)) * innerH;

  const factorPath = hours
    .map((h, i) => `${i === 0 ? "M" : "L"}${(x(h.hour) + bw / 2).toFixed(1)},${yF(h.factor).toFixed(1)}`)
    .join(" ");

  return (
    <div style={{ marginTop: "0.5rem" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Night shading (hours where weight <= threshold) */}
        {hours.map((h) =>
          h.isLow ? (
            <rect
              key={`n${h.hour}`}
              x={x(h.hour)}
              y={padT}
              width={bw}
              height={innerH}
              fill="rgba(96,165,128,0.08)"
            />
          ) : null
        )}

        {/* Usage bars */}
        {hours.map((h) => (
          <rect
            key={h.hour}
            x={x(h.hour) + 1}
            y={yW(h.weight)}
            width={bw - 2}
            height={padT + innerH - yW(h.weight)}
            fill={h.isLow ? "rgba(96,165,128,0.5)" : "rgba(229,221,213,0.35)"}
            rx={1.5}
          />
        ))}

        {/* CO₂ factor line */}
        <path d={factorPath} fill="none" stroke="#D4A574" strokeWidth="2" />

        {/* factor = 1.0 reference */}
        <line x1={padL} y1={yF(1)} x2={padL + innerW} y2={yF(1)} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />

        {/* X axis labels */}
        {[0, 6, 12, 18, 23].map((h) => (
          <text key={h} x={x(h) + bw / 2} y={padT + innerH + 16} fill="rgba(255,255,255,0.45)" fontSize="9" textAnchor="middle">
            {String(h).padStart(2, "0")}:00
          </text>
        ))}

        {/* Left axis: usage */}
        <text x={padL - 6} y={padT + 4} fill="rgba(255,255,255,0.45)" fontSize="9" textAnchor="end">high</text>
        <text x={padL - 6} y={padT + innerH} fill="rgba(255,255,255,0.45)" fontSize="9" textAnchor="end">low</text>

        {/* Right axis: factor */}
        <text x={padL + innerW + 6} y={yF(peakPeriodFactor) + 3} fill="#D4A574" fontSize="9">×{peakPeriodFactor}</text>
        <text x={padL + innerW + 6} y={yF(1) + 3} fill="rgba(255,255,255,0.45)" fontSize="9">×1.0</text>
        <text x={padL + innerW + 6} y={yF(lowPeriodFactor) + 3} fill={C.moss} fontSize="9">×{lowPeriodFactor}</text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "0.5rem", fontSize: "0.7rem", color: C.muted, alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 10, background: "rgba(229,221,213,0.35)", display: "inline-block", borderRadius: 2 }} /> usage (day)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 10, background: "rgba(96,165,128,0.5)", display: "inline-block", borderRadius: 2 }} /> usage (night)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 3, background: "#D4A574", display: "inline-block", borderRadius: 2 }} /> CO₂ factor
        </span>
        <span style={{ marginLeft: "auto" }}>
          night calls ≈ {Math.round((1 - lowPeriodFactor) * 100)}% lower CO₂
        </span>
      </div>
    </div>
  );
}
