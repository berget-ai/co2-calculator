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
 * A stylised, animated diagram of the two cooling paths.
 *
 * A fan drives air through a server. When the incoming air is cold it can pick
 * up the server's heat and carry it straight out (free-air). When the incoming
 * air is too warm to absorb more heat, water must be sprayed in — the water
 * molecules pick up the heat and carry it out as vapour (evaporative cooling),
 * which both consumes clean water and takes extra energy (pumps + chillers).
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

  // Too warm to free-air cool once water is needed / PUE is high.
  const hot = water > 0 || pue > 1.2;
  const coolingPct = Math.round((pue - 1) * 100);

  const airColor = hot ? "#D4A574" : "#5B9BD5";
  const heatColor = "#D1392E";

  return (
    <div>
      <svg viewBox="0 0 560 260" style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Cooling diagram">
        <defs>
          {/* gentle drift for air particles */}
          <style>{`
            .cf-air${uid} { animation: cfMove${uid} 2.6s linear infinite; }
            .cf-air2${uid} { animation: cfMove${uid} 2.6s linear infinite; animation-delay: -1.3s; }
            .cf-vap${uid} { animation: cfRise${uid} 2.8s ease-in infinite; }
            .cf-vap2${uid} { animation: cfRise${uid} 2.8s ease-in infinite; animation-delay: -1.4s; }
            .cf-fan${uid} { animation: cfSpin${uid} 1s linear infinite; transform-origin: center; transform-box: fill-box; }
            @keyframes cfMove${uid} { from { transform: translateX(0); } to { transform: translateX(120px); } }
            @keyframes cfRise${uid} { 0% { transform: translate(0,0); opacity: 0; } 15% { opacity: 1; } 100% { transform: translate(40px,-64px); opacity: 0; } }
            @keyframes cfSpin${uid} { to { transform: rotate(360deg); } }
          `}</style>
        </defs>

        {/* intake label */}
        <text x="30" y="20" fill={C.muted} fontSize="11" textAnchor="middle">intake</text>
        <text x="30" y="36" fill={airColor} fontSize="13" fontWeight="700" textAnchor="middle">{temp}°C</text>

        {/* server chassis */}
        <rect x="180" y="80" width="180" height="100" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        {/* server units + heat */}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="196" y={94 + i * 30} width="120" height="20" rx="3" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
            <circle cx="326" cy={104 + i * 30} r="3" fill={heatColor}>
              <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" begin={`${i * 0.3}s`} />
            </circle>
          </g>
        ))}
        <text x="270" y="200" fill={C.muted} fontSize="10" textAnchor="middle">servers (heat source)</text>

        {/* ── Fan ── */}
        <g className={`cf-fan${uid}`}>
          <circle cx="100" cy="130" r="26" fill="rgba(255,255,255,0.05)" stroke={airColor} strokeWidth="1.5" />
          {[0, 60, 120].map((deg) => (
            <path
              key={deg}
              d="M100 130 L100 108 A22 22 0 0 1 116 122 Z"
              fill={airColor}
              opacity="0.8"
              transform={`rotate(${deg} 100 130)`}
            />
          ))}
          <circle cx="100" cy="130" r="5" fill={airColor} />
        </g>
        <text x="100" y="172" fill={C.muted} fontSize="10" textAnchor="middle">fan</text>

        {/* ── Air flow particles (cold: pass straight through & out) ── */}
        {!hot && (
          <>
            {[108, 130, 152].map((y0, i) => (
              <g key={i} className={i % 2 ? `cf-air2${uid}` : `cf-air${uid}`}>
                <circle cx="140" cy={y0} r="3.5" fill={airColor} opacity="0.9" />
                <circle cx="140" cy={y0} r="3.5" fill={airColor} opacity="0.5" />
              </g>
            ))}
            {/* warm air out the right side */}
            {[108, 152].map((y0, i) => (
              <g key={`out${i}`} className={i % 2 ? `cf-air2${uid}` : `cf-air${uid}`}>
                <circle cx="380" cy={y0} r="3.5" fill={heatColor} opacity="0.8" />
              </g>
            ))}
            <text x="470" y="120" fill={heatColor} fontSize="11" textAnchor="middle">warm air</text>
            <text x="470" y="136" fill={heatColor} fontSize="11" textAnchor="middle">out</text>
            <text x="470" y="160" fill={C.moss} fontSize="10" textAnchor="middle">(no water)</text>
          </>
        )}

        {/* ── Hot path: water spray + vapour ── */}
        {hot && (
          <>
            {/* water spray nozzle above server */}
            <rect x="250" y="46" width="40" height="16" rx="3" fill="rgba(91,155,213,0.2)" stroke="#5B9BD5" strokeWidth="1" />
            <text x="270" y="38" fill="#5B9BD5" fontSize="10" textAnchor="middle">water spray</text>
            {/* spray droplets down into server */}
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={258 + i * 12} cy={66} r="2.5" fill="#5B9BD5">
                <animate attributeName="cy" values="62;80" dur="0.8s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
                <animate attributeName="opacity" values="1;0" dur="0.8s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
              </circle>
            ))}

            {/* intake warm air particles (still move through) */}
            {[130, 152].map((y0, i) => (
              <g key={i} className={i % 2 ? `cf-air2${uid}` : `cf-air${uid}`}>
                <circle cx="140" cy={y0} r="3.5" fill={airColor} opacity="0.7" />
              </g>
            ))}

            {/* vapour molecules rising out of server carrying heat */}
            <g className={`cf-vap${uid}`}>
              <circle cx="240" cy="86" r="3" fill="#8FB8E8" />
              <circle cx="300" cy="86" r="2.5" fill="#8FB8E8" />
            </g>
            <g className={`cf-vap2${uid}`}>
              <circle cx="270" cy="86" r="3" fill="#8FB8E8" />
              <circle cx="330" cy="86" r="2.5" fill="#8FB8E8" />
            </g>
            <text x="430" y="50" fill="#8FB8E8" fontSize="11" textAnchor="middle">vapour carries</text>
            <text x="430" y="66" fill="#8FB8E8" fontSize="11" textAnchor="middle">heat away</text>
            <text x="430" y="90" fill="#D4A574" fontSize="10" textAnchor="middle">(clean water,</text>
            <text x="430" y="104" fill="#D4A574" fontSize="10" textAnchor="middle">constantly replaced)</text>

            {/* hot air is too warm to cool on its own */}
            <text x="470" y="200" fill={airColor} fontSize="10" textAnchor="middle">air too warm</text>
            <text x="470" y="214" fill={airColor} fontSize="10" textAnchor="middle">to absorb heat</text>
          </>
        )}

        {/* bottom caption of the path */}
        <text x="280" y="248" fill={C.cloud} fontSize="11" textAnchor="middle" fontStyle="italic">
          {hot
            ? "Heat must hitch a ride on water molecules — and the chillers + pumps cost their own energy."
            : "Cold outside air picks up the heat and carries it straight out — just fans."}
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
          <span style={{ color: airColor, fontWeight: 600 }}>{temp}°C</span> ·{" "}
          <strong style={{ color: hot ? "#D4A574" : C.moss }}>{hot ? "evaporative" : "free-air"}</strong>
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
