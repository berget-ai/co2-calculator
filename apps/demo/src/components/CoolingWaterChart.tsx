import { useId } from "react";
import { C } from "./shared";
import type { GridRegion } from "./types";

interface Props {
  grid: GridRegion | undefined;
}

// Extra fields present on the library's GridRegion beyond our loose local type.
type FullGrid = GridRegion & {
  typicalPue?: number;
  waterLitersPerKwh?: number;
};

// Approximate average temperatures (°C), mirrors GlobeSelector's REGION_TEMP.
const REGION_TEMP: Record<string, number> = {
  Sweden: 5, Norway: 4, France: 12, Quebec: 3, Ireland: 9, Germany: 10,
  "US Average": 12, "US East (PJM)": 13, "Texas (ERCOT)": 20, "California (CAISO)": 16,
  Japan: 15, India: 25, Poland: 8, China: 10, "Global Average": 14,
};

/**
 * A stylised, animated diagram of what happens on the datacenter ROOF.
 *
 * Heat from the server hall has to be rejected to the sky. In a cold climate a
 * roof-mounted dry cooler simply blows the warm air straight out into the cold
 * sky (free-air). In a hot climate the outside air is already too warm to
 * absorb more heat, so an evaporative cooling tower sprays water in — the
 * water evaporates and the vapour carries the heat away, which consumes clean
 * water and costs extra energy (pumps + chillers).
 *
 * Driven by the library's real per-region PUE / water / temperature values.
 */
export function CoolingWaterChart({ grid }: Props) {
  const uid = useId().replace(/:/g, "");
  const g = (grid || {}) as FullGrid;
  const name = g.name ?? "Sweden";
  const pue = g.typicalPue ?? 1.15;
  const water = g.waterLitersPerKwh ?? 0.0;
  const temp = REGION_TEMP[name] ?? 12;

  const hot = water > 0 || pue > 1.2;
  const coolingPct = Math.round((pue - 1) * 100);

  const skyColor = hot ? "#D4A574" : "#5B9BD5";
  const heatColor = "#E2574C";
  const waterBlue = "#7FB3E8";

  // geometry
  const ROOF_Y = 168;        // roof line
  const HALL_X = 60;         // building left
  const HALL_W = 200;        // building width
  const TOWER_X = 300;       // cooling unit left
  const TOWER_W = 130;       // cooling unit width
  const TOWER_TOP = 96;      // cooling unit top (sits on roof)

  return (
    <div>
      <svg viewBox="0 0 560 250" style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Rooftop cooling diagram">
        <defs>
          <style>{`
            .fan${uid} { animation: spin${uid} 0.9s linear infinite; transform-origin: center; transform-box: fill-box; }
            @keyframes spin${uid} { to { transform: rotate(360deg); } }
            .heatup${uid} { animation: heatup${uid} 2.4s ease-in infinite; }
            @keyframes heatup${uid} { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 0.9; } 100% { transform: translateY(-56px); opacity: 0; } }
            .skydisp${uid} { animation: skydisp${uid} 3s ease-out infinite; }
            @keyframes skydisp${uid} { 0% { transform: translate(0,0) scale(0.7); opacity: 0.9; } 100% { transform: translate(30px,-30px) scale(1.4); opacity: 0; } }
            .drip${uid} { animation: drip${uid} 1s linear infinite; }
            @keyframes drip${uid} { from { transform: translateY(0); opacity: 1; } to { transform: translateY(18px); opacity: 0; } }
            .vap${uid}  { animation: rise${uid} 2.6s ease-in infinite; }
            .vap2${uid} { animation: rise${uid} 2.6s ease-in infinite; animation-delay: -1.3s; }
            @keyframes rise${uid} { 0% { transform: translate(0,0); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(28px,-58px); opacity: 0; } }
          `}</style>
        </defs>

        {/* ── Sky ── */}
        <text x="30" y="30" fill={C.muted} fontSize="11">outside air</text>
        <text x="30" y="50" fill={skyColor} fontSize="17" fontWeight="700">{temp}°C</text>
        {hot && (
          <>
            <text x="470" y="34" fill={skyColor} fontSize="11" textAnchor="middle">too warm to</text>
            <text x="470" y="48" fill={skyColor} fontSize="11" textAnchor="middle">absorb heat</text>
          </>
        )}

        {/* ── Building / server hall (below roof) ── */}
        <rect x={HALL_X} y={ROOF_Y} width={HALL_W} height="60" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        <text x={HALL_X + HALL_W / 2} y={ROOF_Y + 38} fill={C.muted} fontSize="12" textAnchor="middle">server hall</text>
        {/* heat dots rising inside hall toward roof */}
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={HALL_X + 50 + i * 45} cy={ROOF_Y + 40} r="3.5" fill={heatColor} className={`heatup${uid}`} style={{ animationDelay: `${i * 0.8}s` }} />
        ))}

        {/* ── Roof line ── */}
        <line x1="20" y1={ROOF_Y} x2="540" y2={ROOF_Y} stroke="rgba(255,255,255,0.25)" strokeWidth="2" />

        {/* ── Cooling unit on the roof ── */}
        <rect x={TOWER_X} y={TOWER_TOP} width={TOWER_W} height={ROOF_Y - TOWER_TOP} rx="6" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

        {/* roof fan(s) on top of the unit */}
        {[TOWER_X + 32, TOWER_X + TOWER_W - 32].map((cx, i) => (
          <g key={i}>
            <circle cx={cx} cy={TOWER_TOP} r="18" fill="rgba(255,255,255,0.05)" stroke={skyColor} strokeWidth="1.5" />
            <g className={`fan${uid}`}>
              {[0, 90, 180, 270].map((deg) => (
                <ellipse key={deg} cx={cx} cy={TOWER_TOP - 8} rx="3.5" ry="9" fill={skyColor} opacity="0.85" transform={`rotate(${deg} ${cx} ${TOWER_TOP})`} />
              ))}
            </g>
            <circle cx={cx} cy={TOWER_TOP} r="3" fill={skyColor} />
          </g>
        ))}

        {/* ── COLD PATH: warm air vented straight to the cold sky ── */}
        {!hot && (
          <>
            {/* heat rising out of the unit into the sky and dispersing */}
            {[0, 1, 2].map((i) => (
              <g key={i} className={`skydisp${uid}`} style={{ animationDelay: `${i * 1}s` }}>
                <circle cx={TOWER_X + 32 + i * 34} cy={TOWER_TOP - 22} r="4" fill={heatColor} />
              </g>
            ))}
            <text x={TOWER_X + TOWER_W / 2} y={TOWER_TOP - 60} fill={heatColor} fontSize="12" fontWeight="600" textAnchor="middle">warm air out</text>
            <text x={TOWER_X + TOWER_W / 2} y={TOWER_TOP - 46} fill={C.moss} fontSize="10" textAnchor="middle">(no water)</text>
            <text x={TOWER_X + TOWER_W / 2} y={ROOF_Y + 42} fill={C.muted} fontSize="11" textAnchor="middle">dry cooler</text>
          </>
        )}

        {/* ── HOT PATH: evaporative tower sprays water, vapour carries heat ── */}
        {hot && (
          <>
            {/* water spray bar inside the top of the tower */}
            <rect x={TOWER_X + 18} y={TOWER_TOP + 16} width={TOWER_W - 36} height="10" rx="3" fill="rgba(127,179,232,0.2)" stroke={waterBlue} strokeWidth="1" />
            {[0, 1, 2, 3, 4].map((i) => (
              <circle key={i} cx={TOWER_X + 28 + i * 20} cy={TOWER_TOP + 32} r="2.5" fill={waterBlue} className={`drip${uid}`} style={{ animationDelay: `${i * 0.18}s` }} />
            ))}
            <text x={TOWER_X + TOWER_W / 2} y={TOWER_TOP + 12} fill={waterBlue} fontSize="10" textAnchor="middle">water spray</text>

            {/* vapour plumes rising off the tower */}
            <g className={`vap${uid}`}>
              <circle cx={TOWER_X + 32} cy={TOWER_TOP - 22} r="5" fill={waterBlue} opacity="0.85" />
              <circle cx={TOWER_X + 66} cy={TOWER_TOP - 26} r="4" fill={waterBlue} opacity="0.7" />
            </g>
            <g className={`vap2${uid}`}>
              <circle cx={TOWER_X + 96} cy={TOWER_TOP - 22} r="5" fill={waterBlue} opacity="0.85" />
              <circle cx={TOWER_X + 50} cy={TOWER_TOP - 30} r="3.5" fill={waterBlue} opacity="0.7" />
            </g>
            <text x={TOWER_X + TOWER_W / 2} y={TOWER_TOP - 64} fill={waterBlue} fontSize="12" fontWeight="600" textAnchor="middle">vapour carries heat away</text>
            <text x={TOWER_X + TOWER_W / 2} y={TOWER_TOP - 50} fill="#D4A574" fontSize="10" textAnchor="middle">(clean water, constantly replaced)</text>
            <text x={TOWER_X + TOWER_W / 2} y={ROOF_Y + 42} fill={C.muted} fontSize="11" textAnchor="middle">evaporative cooling tower</text>
          </>
        )}

        {/* caption */}
        <text x="280" y="242" fill={C.cloud} fontSize="11.5" textAnchor="middle" fontStyle="italic">
          {hot
            ? "On a hot roof the air can't take the heat — so it's loaded onto water molecules instead, at the cost of clean water and pump energy."
            : "On a cold roof the warm air is simply blown into the sky — just fans."}
        </text>
      </svg>

      {/* Live readout */}
      <div
        style={{
          marginTop: "0.5rem",
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
          <span style={{ color: C.peak, fontWeight: 600 }}>{name}</span> ·{" "}
          <span style={{ color: skyColor, fontWeight: 600 }}>{temp}°C</span> ·{" "}
          <strong style={{ color: hot ? "#D4A574" : C.moss }}>{hot ? "evaporative tower" : "dry cooler"}</strong>
        </div>
        <div style={{ fontSize: "0.8rem", color: C.muted }}>
          PUE <span style={{ color: C.peak, fontWeight: 600, fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)" }}>{pue.toFixed(2)}</span>
          <span> → cooling adds ~{coolingPct}% on top of IT energy</span>
        </div>
        <div style={{ fontSize: "0.8rem", color: C.muted }}>
          Water{" "}
          <span style={{ color: water === 0 ? C.moss : "#D4A574", fontWeight: 600, fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)" }}>
            {water === 0 ? "0" : water.toFixed(1)} L/kWh
          </span>
        </div>
      </div>
    </div>
  );
}
