import { C } from "./shared";
import type { GridRegion } from "./types";

interface Props {
  grid: GridRegion | undefined;
}

// Extra fields present on the library's GridRegion beyond our loose local type.
type FullGrid = GridRegion & {
  typicalPue?: number;
  waterLitersPerKwh?: number;
  coolingFactor?: number;
};

/**
 * Illustration of why cooling path matters. Two side-by-side diagrams, driven
 * by the library's real per-region values (PUE, water L/kWh):
 *
 *  - Free-air cooling (cold climate): outside air is blown straight across the
 *    servers and the warm air vented out. Energy path: just fans. No water.
 *  - Evaporative cooling (hot climate): heat must be moved via chilled water;
 *    the water is evaporated in a cooling tower, so it must be continuously
 *    replaced with clean water AND the chillers + pumps draw their own power.
 *
 * The selected region determines which diagram is highlighted and what the
 * numbers say.
 */
export function CoolingWaterChart({ grid }: Props) {
  const g = (grid || {}) as FullGrid;
  const pue = g.typicalPue ?? 1.15;
  const water = g.waterLitersPerKwh ?? 0.0;
  const name = g.name ?? "—";
  const isFreeAir = water === 0 || pue <= 1.2;

  // Cooling energy as % of IT energy = (PUE - 1) × 100
  const coolingPct = Math.round((pue - 1) * 100);

  const box = (highlight: boolean): React.CSSProperties => ({
    flex: 1,
    minWidth: 230,
    borderRadius: 10,
    border: `1.5px solid ${highlight ? C.moss : C.border}`,
    background: highlight ? "rgba(96,165,128,0.06)" : "rgba(255,255,255,0.015)",
    padding: "1rem",
    transition: "all 0.3s ease",
    opacity: highlight ? 1 : 0.55,
  });

  const step = {
    background: "rgba(0,0,0,0.3)",
    borderRadius: 6,
    padding: "0.5rem 0.6rem",
    fontSize: "0.75rem",
    color: C.cloud,
    textAlign: "center" as const,
    border: `1px solid ${C.border}`,
  };
  const arrow = { textAlign: "center" as const, color: C.muted, fontSize: "0.8rem", margin: "0.15rem 0" };

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {/* ── Free-air cooling ── */}
        <div style={box(isFreeAir)}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.peak, marginBottom: "0.25rem" }}>
            Free-air cooling
          </div>
          <div style={{ fontSize: "0.7rem", color: C.moss, marginBottom: "0.75rem" }}>
            cold climate · e.g. Sweden, Quebec
          </div>

          <div style={step}>❄️ Outside air (cold)</div>
          <div style={arrow}>↓ fans only</div>
          <div style={step}>🖥️ Servers pick up heat</div>
          <div style={arrow}>↓ straight out</div>
          <div style={step}>💨 Warm air vented</div>

          <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: C.muted, lineHeight: 1.5 }}>
            Energy path: <strong style={{ color: C.peak }}>fans</strong> only.<br />
            Water: <strong style={{ color: C.moss }}>0 L</strong>
          </div>
        </div>

        {/* ── Evaporative cooling ── */}
        <div style={box(!isFreeAir)}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.peak, marginBottom: "0.25rem" }}>
            Evaporative / mechanical cooling
          </div>
          <div style={{ fontSize: "0.7rem", color: "#D4A574", marginBottom: "0.75rem" }}>
            hot climate · e.g. Texas, India
          </div>

          <div style={step}>💧 Clean water (must be treated)</div>
          <div style={arrow}>↓ chillers + pumps (extra energy)</div>
          <div style={step}>🖥️ Cold water absorbs server heat</div>
          <div style={arrow}>↓ to cooling tower</div>
          <div style={step}>☁️ Water evaporated to dump heat</div>

          <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: C.muted, lineHeight: 1.5 }}>
            Energy path: <strong style={{ color: C.peak }}>chillers + pumps + tower fans</strong>.<br />
            Water: <strong style={{ color: "#D4A574" }}>consumed by evaporation</strong> (needs constant clean supply)
          </div>
        </div>
      </div>

      {/* Live readout for the selected region */}
      <div
        style={{
          marginTop: "1rem",
          padding: "0.85rem 1.1rem",
          borderRadius: 8,
          border: `1px solid ${C.borderMoss}`,
          background: "rgba(96,165,128,0.06)",
          display: "flex",
          flexWrap: "wrap",
          gap: "1.5rem",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "0.8rem", color: C.muted }}>
          <span style={{ color: C.peak, fontWeight: 600 }}>{name}</span> uses{" "}
          <strong style={{ color: isFreeAir ? C.moss : "#D4A574" }}>{isFreeAir ? "free-air" : "mechanical/evaporative"} cooling</strong>
        </div>
        <div style={{ fontSize: "0.8rem", color: C.muted }}>
          PUE <span style={{ color: C.peak, fontWeight: 600, fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)" }}>{pue.toFixed(2)}</span>
          <span style={{ color: C.muted }}> → cooling adds ~{coolingPct}% on top of IT energy</span>
        </div>
        <div style={{ fontSize: "0.8rem", color: C.muted }}>
          Water <span style={{ color: water === 0 ? C.moss : "#D4A574", fontWeight: 600, fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)" }}>
            {water === 0 ? "0" : water.toFixed(1)} L/kWh
          </span>
        </div>
      </div>
    </div>
  );
}
