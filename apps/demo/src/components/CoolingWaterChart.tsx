import { useEffect, useId, useRef, useState } from "react";
import { C } from "./shared";
import type { GridRegion } from "./types";

interface Props {
  grid: GridRegion | undefined;
  region?: string;
  onRegionSelect?: (region: string) => void;
  /** Operational energy of the current request (kWh) — drives fan speed + heat molecule count. */
  energyKwh?: number;
  /** Cooling water consumed by the current request (litres) — drives water flow speed. */
  waterLiters?: number;
}

type FullGrid = GridRegion & {
  typicalPue?: number;
  waterLitersPerKwh?: number;
};

const REGION_TEMP: Record<string, number> = {
  Sweden: 5, Norway: 4, France: 12, Quebec: 3, Ireland: 9, Germany: 10,
  "US Average": 12, "US East (PJM)": 13, "Texas (ERCOT)": 20, "California (CAISO)": 16,
  Japan: 15, India: 25, Poland: 8, China: 10, "Global Average": 14,
};

// Water is always shown in blue so it reads as water everywhere on the page.
const WATER_BLUE = "#6FA8DC";

/**
 * The core idea: the exhaust leaving each hall is the SAME temperature in both
 * scenes. The only difference is the SKY it must be rejected into. A cold sky is
 * cooler than the exhaust, so the heat rises and disperses on its own (free-air,
 * just fans). A hot sky is already too warm to absorb the exhaust, so the heat
 * won't rise — instead water is pumped across the vent, and water molecules
 * evaporate and rise, carrying the heat away. That's what PUE (and the water
 * bill) is made of.
 *
 * The physics is computed, not keyframed: particle velocities derive from the
 * temperature difference between the exhaust and the atmosphere, and the water
 * flow rate derives from the region's water intensity — so any region's numbers
 * plug in and render correctly.
 */
export function CoolingWaterChart({ grid, region, onRegionSelect, energyKwh, waterLiters }: Props) {
  const uid = useId().replace(/:/g, "");

  // Normalise the current request's energy + water against a reference request
  // (a ~0.1 Wh job, ~0.5 ml of water) so the animation scales sensibly across
  // the whole range the calculator can produce. Clamped so it never freezes or
  // explodes.
  const energyScale = energyKwh !== undefined ? Math.min(Math.max(energyKwh / 0.0001, 0.4), 3) : 1;
  const waterScale = waterLiters !== undefined ? Math.min(Math.max(waterLiters / 0.0005, 0.4), 3) : 1;
  const g = (grid || {}) as FullGrid;
  const name = g.name ?? "Sweden";
  const water = g.waterLitersPerKwh ?? 0.0;
  const pue = g.typicalPue ?? 1.15;
  const temp = REGION_TEMP[name] ?? 14;
  const selectedHot = water > 0 || pue > 1.2;

  // The illustration contrasts a COLD sky with a HOT sky. When the selected
  // region is itself cold, we still need a hot counterpoint on the right, so we
  // pair it with Texas as the representative hot climate; when it's hot we pair
  // with Sweden as the cold counterpoint.
  const sweden = { key: "sweden", name: "Sweden", temp: REGION_TEMP.Sweden, pue: 1.15, water: 0.0 };
  const texas = { key: "texas", name: "Texas (ERCOT)", temp: REGION_TEMP["Texas (ERCOT)"], pue: 1.8, water: 1.5 };
  const selected = { key: region ?? "sweden", name, temp, pue, water };

  // Left panel is always the cold scene, right always the hot scene. The
  // selected region occupies whichever side matches its climate; the other side
  // is the counterpoint that keeps the contrast meaningful.
  const coldPanel = selectedHot ? sweden : selected;
  const hotPanel = selectedHot ? selected : texas;

  const go = (key: string) => {
    if (onRegionSelect) onRegionSelect(key);
  };

  const panels = [
    { side: "left" as const, data: coldPanel, hot: false },
    { side: "right" as const, data: hotPanel, hot: true },
  ];

  // The selected region's panel is the highlighted one. A cold selection lights
  // the left (cold) panel; a hot selection lights the right (hot) panel.
  const activeSide = selectedHot ? "right" : "left";

  return (
    <div>
      {/* The switch — also drives the location picker above */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {panels.map((p) => (
          <button
            key={p.side}
            onClick={() => go(p.data.key)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "0.45rem 0.5rem",
              borderRadius: 7,
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: onRegionSelect ? "pointer" : "default",
              border: `1px solid ${activeSide === p.side ? "rgba(255,255,255,0.5)" : C.border}`,
              background: activeSide === p.side ? "rgba(255,255,255,0.05)" : "transparent",
              color: activeSide === p.side ? C.peak : C.muted,
            }}
          >
            {p.data.name} · {p.data.temp}°C sky
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {panels.map((p) => (
          <Scene
            key={p.side}
            uid={uid + p.side}
            kind={p.hot ? "hot" : "cold"}
            active={activeSide === p.side}
            temp={p.data.temp}
            pue={p.data.pue}
            water={p.data.water}
            energyScale={energyScale}
            waterScale={waterScale}
          />
        ))}
      </div>

      {/* Live readout */}
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
          <span style={{ color: C.peak, fontWeight: 600 }}>{name}</span> runs on the{" "}
          <strong style={{ color: selectedHot ? WATER_BLUE : C.moss }}>{selectedHot ? "hot-sky (evaporative)" : "cold-sky (free-air)"}</strong> path
        </div>
        <div style={{ fontSize: "0.8rem", color: C.muted }}>
          PUE <span style={{ color: C.peak, fontWeight: 600, fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)" }}>{pue.toFixed(2)}</span>
          <span> → cooling adds ~{Math.round((pue - 1) * 100)}% on top of IT energy</span>
        </div>
        <div style={{ fontSize: "0.8rem", color: C.muted }}>
          Water{" "}
          <span style={{ color: water === 0 ? C.moss : WATER_BLUE, fontWeight: 600, fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)" }}>
            {water === 0 ? "0" : water.toFixed(1)} L/kWh
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Physics constants ───
const W = 250;
const H = 262;
const HALL_Y = 176;
const CX = W / 2;
const T_EXHAUST = 40; // °C — the exhaust leaving the hall, same in both scenes

// Layout: heat rises off the whole roof (the hall's full width). The top zone
// (above CHANNEL_TOP) is reserved for the title, so particles never overlap it.
const HALL_LEFT = 20;         // the hall's left edge
const HALL_RIGHT = W - 20;    // the hall's right edge
const CHANNEL_TOP = 8;        // particles rise all the way to the top edge
const PIPE_Y = HALL_Y - 62;   // the water pipe sits higher above the roof, fans below it
const PIPE_LEFT = 8;          // the pipe runs from the left edge across the hall
const PIPE_RIGHT = HALL_RIGHT + 8; // …to just past the hall's right edge

// A water/air molecule.
interface Particle {
  x: number;
  y: number;
  vy: number;
  r: number;
  maxY: number; // spawn reference
}

/**
 * Upward buoyant speed of a molecule, in px/frame, from the temperature lift
 * between the exhaust and the atmosphere. A bigger lift → faster rise. We floor
 * it so motion never stops entirely, and scale by the region's water intensity
 * for the vapour stream (more water → faster throughput).
 */
function riseSpeed(tempSky: number, water: number, forVapour: boolean): number {
  const lift = Math.max(T_EXHAUST - tempSky, 2); // °C of buoyant lift, min 2
  const base = lift * 0.045; // px/frame per °C
  return forVapour ? base * (0.7 + water * 0.6) : base;
}

/** Horizontal water-flow speed along the pipe, px/frame ∝ water intensity. */
function flowSpeed(water: number): number {
  return 0.4 + water * 1.1;
}

/** Pipe heat 0..1 — how hot the water pipe gets from the trapped exhaust. */
function pipeHeat(tempSky: number): number {
  return Math.min(Math.max((T_EXHAUST - tempSky) / (T_EXHAUST - 5), 0), 1);
}

/** Number of fans scales with the cooling work: more overhead (PUE−1) → more fans. */
function fanCount(pue: number): number {
  return Math.min(Math.max(Math.round((pue - 1) * 6), 1), 5); // 1 at 1.15, ~5 at 2.0
}

/** Fan spin period (seconds/rev): higher PUE → faster spin (shorter period).
 *  energyScale further speeds them up when the request carries more energy. */
function fanPeriod(pue: number, energyScale: number): number {
  const base = Math.max(1.6 - (pue - 1) * 1.6, 0.45); // ~1.4s at 1.15 → ~0.45s at 2.0
  return Math.max(base / energyScale, 0.2);
}

// ─── One scene: hall at the bottom, sky above, heat rising ───
function Scene({ uid, kind, active, temp, pue, water, energyScale, waterScale }: {
  uid: string;
  kind: "cold" | "hot";
  active: boolean;
  temp: number;
  pue: number;
  water: number;
  energyScale: number;
  waterScale: number;
}) {
  const cold = kind === "cold";

  // ── Particle state, advanced with requestAnimationFrame ──
  const [particles, setParticles] = useState<Particle[]>([]);
  const [air, setAir] = useState<Particle[]>([]); // warm air trapped under the pipe (hot scene)
  const [flowX, setFlowX] = useState(0);
  const raf = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const airRef = useRef<Particle[]>([]);

  const vSpeed = riseSpeed(temp, water, !cold);
  // The water flows faster the more water the request actually sends through.
  const fSpeed = flowSpeed(water) * waterScale;
  // More energy in the request → more heat molecules to reject.
  const heatCount = (base: number) => Math.round(base * energyScale);

  // Spawn a vapour/heat molecule across the hall's full width. In the hot scene
  // small water vapour particles spawn ON the pipe and rise; in the cold scene
  // larger air heat molecules spawn at the roof.
  const spawn = (): Particle => {
    const startY = cold ? HALL_Y - 8 : PIPE_Y;
    return {
      x: HALL_LEFT + Math.random() * (HALL_RIGHT - HALL_LEFT),
      y: startY,
      vy: -vSpeed * (0.85 + Math.random() * 0.3),
      r: cold ? 5 + Math.random() * 3 : 2.5 + Math.random() * 1.5,
      maxY: startY,
    };
  };

  // Spawn warm air that the fans push up from the hall toward the underside of
  // the water pipe (hot scene). It rises, then stalls at the pipe — that's why
  // the water has to carry the heat away.
  const spawnAir = (): Particle => ({
    x: HALL_LEFT + Math.random() * (HALL_RIGHT - HALL_LEFT),
    y: HALL_Y - 8,
    vy: -(0.5 + Math.random() * 0.4),
    r: 3 + Math.random() * 1.5,
    maxY: HALL_Y - 8,
  });

  useEffect(() => {
    // seed an initial population, staggered through the channel. Count scales
    // with the request's energy — more joules → more heat to reject.
    const n = cold ? heatCount(8) : heatCount(13);
    particlesRef.current = Array.from({ length: n }, () => {
      const p = spawn();
      p.y = CHANNEL_TOP + Math.random() * (p.maxY - CHANNEL_TOP);
      return p;
    });
    // seed warm air between the hall and the pipe (hot scene)
    airRef.current = cold ? [] : Array.from({ length: heatCount(6) }, () => {
      const p = spawnAir();
      p.y = (PIPE_Y + 8) + Math.random() * (HALL_Y - 8 - (PIPE_Y + 8));
      return p;
    });

    const tick = () => {
      // advance vapour/heat molecules straight up; respawn at the bottom when
      // they leave the top edge
      particlesRef.current = particlesRef.current.map((p) => {
        const ny = p.y + p.vy;
        if (ny < CHANNEL_TOP) return spawn();
        return { ...p, y: ny };
      });
      // warm air rises from the hall and stalls at the pipe's underside (hot)
      if (!cold) {
        airRef.current = airRef.current.map((p) => {
          const ny = p.y + p.vy;
          if (ny < PIPE_Y + 8) return spawnAir(); // reached the pipe → recycle at the hall
          return { ...p, y: ny };
        });
        setAir([...airRef.current]);
      }
      // water flow along the pipe, entering at the left edge and travelling
      // right across the channel (hot scene only)
      const pipeLen = PIPE_RIGHT - PIPE_LEFT;
      setFlowX((x) => (cold ? 0 : (x + fSpeed) % pipeLen));
      setParticles([...particlesRef.current]);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cold, temp, water, vSpeed, fSpeed, energyScale]);

  // Line-art palette: white geometry, red = air heat, blue = water.
  const ink = "rgba(255,255,255,0.55)";      // thin structural lines
  const grey = "rgba(255,255,255,0.35)";     // cooled molecules (absorbed heat)
  const heat = C.danger;                     // warm air
  const waterCol = WATER_BLUE;               // water / vapour

  // The water pipe warms toward red as it absorbs the trapped exhaust.
  const pipeColor = (t: number) => {
    // lerp white → red
    const r = 255;
    const g = Math.round(255 - (255 - 57) * t);
    const b = Math.round(255 - (255 - 46) * t);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div
      style={{
        flex: 1,
        minWidth: 240,
        opacity: active ? 1 : 0.45,
        transition: "opacity 0.3s",
        borderRadius: 10,
        border: `1.5px solid ${active ? "rgba(255,255,255,0.35)" : C.border}`,
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* ── Flowing molecules rising off the whole roof, from the bottom to
             the top edge. Vapour starts warm (red) at the source and cools to
             white as it climbs; heat in the cold scene is red throughout. ── */}
        {particles.map((p, i) => {
          // warmth: 1 at the source (bottom), cooling to 0 at the top edge.
          const warmth = (p.y - CHANNEL_TOP) / (p.maxY - CHANNEL_TOP);
          // Air heat (cold scene + hall): red → grey as it's absorbed.
          // Water vapour (hot scene): blue → grey as it releases its heat.
          const sourceCol = cold ? heat : waterCol;
          // blend source colour toward grey as it cools
          const col = warmth > 0.45 ? sourceCol : grey;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill="none"
              stroke={col}
              strokeWidth="1.3"
              opacity={0.3 + warmth * 0.65}
            />
          );
        })}

        {cold ? (
          /* fans at the channel mouth helping the heat out — count and speed
             both scale with the region's PUE */
          (() => {
            const n = fanCount(pue);
            const dur = fanPeriod(pue, energyScale);
            const spacing = 26;
            const startX = CX - ((n - 1) * spacing) / 2;
            return Array.from({ length: n }, (_, i) => (
              <g key={i} stroke={ink} strokeWidth="1.3" fill="none">
                <circle cx={startX + i * spacing} cy={HALL_Y - 26} r="11" />
                <Fan uid={uid} kind={kind + i} cx={startX + i * spacing} cy={HALL_Y - 26} color={ink} dur={dur} />
              </g>
            ));
          })()
        ) : (
          <>
            {/* warm air rising from the servers and stalling at the pipe's
                underside — the fans must push it against the water, which is the
                extra work (along with circulating the water itself) */}
            {air.map((p, i) => {
              const warmth = (p.y - (PIPE_Y + 8)) / (p.maxY - (PIPE_Y + 8)); // 1 hall, 0 pipe
              return (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill="none"
                  stroke={warmth > 0.4 ? heat : grey}
                  strokeWidth="1.2"
                  opacity={0.35 + warmth * 0.55}
                />
              );
            })}

            {/* the water pipe: red on the underside where the warm air hits it,
                blue on the top where the cool water is */}
            <defs>
              <linearGradient id={`pipe${uid}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={heat} />
                <stop offset="55%" stopColor={waterCol} />
              </linearGradient>
            </defs>
            <rect
              x={PIPE_LEFT}
              y={PIPE_Y - 6}
              width={PIPE_RIGHT - PIPE_LEFT}
              height="12"
              rx="5"
              fill="none"
              stroke={`url(#pipe${uid})`}
              strokeWidth="1.8"
            />
            {/* flowing water (blue dots) entering left, moving right */}
            {[0.12, 0.32, 0.52, 0.72, 0.92].map((f) => (
              <circle
                key={f}
                cx={PIPE_LEFT + ((flowX / (PIPE_RIGHT - PIPE_LEFT) + f) % 1) * (PIPE_RIGHT - PIPE_LEFT)}
                cy={PIPE_Y}
                r="2.4"
                fill={waterCol}
              />
            ))}
            {/* fans below the pipe blowing the warm air up against it — count and
                speed scale with PUE (more cooling work → more, faster fans) */}
            {(() => {
              const n = Math.min(fanCount(pue), 4); // cap so the row stays readable
              const dur = fanPeriod(pue, energyScale);
              const spacing = 30;
              const startX = CX - ((n - 1) * spacing) / 2;
              return Array.from({ length: n }, (_, i) => (
                <g key={i} stroke={ink} strokeWidth="1.1" fill="none">
                  <circle cx={startX + i * spacing} cy={HALL_Y - 18} r="8" />
                  <Fan uid={uid} kind={kind + i} cx={startX + i * spacing} cy={HALL_Y - 18} color={ink} dur={dur} />
                </g>
              ));
            })()}
          </>
        )}

        {/* ── Server hall ── */}
        <rect x="20" y={HALL_Y} width={W - 40} height="56" fill="none" stroke={ink} strokeWidth="1.3" />
        <text x={CX} y={HALL_Y + 33} fill={heat} fontSize="13" fontWeight="600" textAnchor="middle" letterSpacing="2">
          SERVERS
        </text>

        {/* PUE badge — the region's actual figures. Water is shown in blue. */}
        <text x={CX} y={H - 8} fill={C.peak} fontSize="11.5" fontWeight="600" textAnchor="middle">
          PUE {pue.toFixed(2)} · cooling ≈{Math.round((pue - 1) * 100)}% ·{" "}
          <tspan fill={water === 0 ? C.muted : WATER_BLUE}>{water === 0 ? "0" : water.toFixed(1)} L water</tspan>
        </text>
      </svg>
    </div>
  );
}

// A spinning fan blade. The spin speed scales with the region's PUE — a higher
// PUE means more cooling work, so the blades turn faster. `dur` is seconds/rev.
function Fan({ uid, kind, cx, cy, color, dur }: { uid: string; kind: string; cx: number; cy: number; color: string; dur: number }) {
  return (
    <g>
      <style>{`.fan${uid}${kind}{animation:spin${uid}${kind} ${dur}s linear infinite;transform-origin:center;transform-box:fill-box;}@keyframes spin${uid}${kind}{to{transform:rotate(360deg);}}`}</style>
      <g className={`fan${uid}${kind}`} stroke={color} strokeWidth="1.3">
        {[0, 90, 180, 270].map((deg) => (
          <line key={deg} x1={cx} y1={cy} x2={cx} y2={cy - 6} transform={`rotate(${deg} ${cx} ${cy})`} />
        ))}
      </g>
    </g>
  );
}
