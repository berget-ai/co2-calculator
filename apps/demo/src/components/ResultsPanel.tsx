import { Coffee, Droplets } from "lucide-react";
import { C, COMPONENT_COLORS, formatCO2 } from "./shared";
import type { GridRegion, InferenceResult, ModelProfile } from "./types";

interface Props {
  result: InferenceResult;
  model: ModelProfile | undefined;
  grid: GridRegion | undefined;
}

export function ResultsPanel({ result, model, grid }: Props) {
  return (
    <div>
      {/* Total with Globe Background */}
      <div
        style={{
          position: "relative",
          borderRadius: 12,
          padding: "1.5rem",
          border: `1px solid ${C.borderStrong}`,
          marginBottom: "1.5rem",
          textAlign: "center",
          overflow: "hidden",
          minHeight: 200,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Globe background image */}
        <div
          style={{
            position: "absolute",
            top: "-50%",
            left: "-50%",
            right: "-50%",
            bottom: "-50%",
            backgroundImage: "url(//unpkg.com/three-globe/example/img/earth-dark.jpg)",
            backgroundSize: "contain",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: 0.6,
          }}
        />
        {/* Dark overlay for readability */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "radial-gradient(ellipse at center, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.85) 70%)",
          }}
        />
        {/* Content */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "0.875rem", color: C.muted, marginBottom: "0.5rem" }}>Total CO₂e per request</div>
          <div style={{ fontSize: "3rem", fontWeight: 700, color: C.stone, lineHeight: 1.1 }}>
            {formatCO2(result.totalCO2Grams)}{" "}
            <span style={{ fontSize: "1.25rem", fontWeight: 500, color: C.muted }}>CO₂e</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.5rem" }}>
            {model?.displayName} on {grid?.name}
          </div>
          <div style={{ fontSize: "0.75rem", color: C.moss, marginTop: "0.5rem", fontStyle: "italic" }}>
            Operational + hardware emissions. Training excluded (too uncertain —{" "}
            <a
              href="https://github.com/berget-ai/co2-calculator/blob/main/METHODOLOGY.md"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: C.moss, textDecoration: "underline" }}
            >
              see methodology
            </a>
            ).
          </div>
        </div>
      </div>

      {/* Coffee Comparison */}
      <div
        style={{
          background: "rgba(229, 221, 213, 0.06)",
          borderRadius: 12,
          padding: "1.5rem",
          border: `1px solid ${C.borderStrong}`,
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <Coffee size={24} strokeWidth={1.5} style={{ color: C.peak }} />
          <span style={{ fontWeight: 600, color: C.peak }}>For Comparison</span>
        </div>

        {(() => {
          // We anchor the comparison to microwaving ON SWEDEN'S GRID (the
          // cleanest we offer), priced at the same 14:00 day-adjusted intensity
          // (9.2 g/kWh) used everywhere else on the page. That is the honest
          // baseline: it prices every activity — the AI request and the coffee
          // alike — at the lowest available CO₂ cost, instead of normalising to
          // a dirtier grid where the same request would look smaller. The
          // consequence: because the baseline itself is so clean, even a tiny
          // CO₂ amount maps to many seconds of microwaving. That is the point —
          // on a clean grid a second of anything costs almost nothing, so a
          // small CO₂ figure is still "many clean seconds", not a large footprint.
          // Use the day-adjusted Sweden intensity (8 × 1.15 = 9.2 g/kWh) so the
          // microwave figure matches the 14:00 peak case shown everywhere else
          // on the page (and the footer), rather than the flat 8 g base.
          const SWEDEN_INTENSITY_DAY = 8 * 1.15; // g/kWh, clean baseline at 14:00
          const coffeeCO2PerSecond = (0.8 / 3600) * SWEDEN_INTENSITY_DAY;
          const seconds = result.totalCO2Grams / coffeeCO2PerSecond;

          // The grid-intensity multiplier applies only to the operational
          // (energy) part of the footprint. Embodied hardware emissions are
          // location-independent, so scaling the whole total by the grid
          // ratio would overstate the difference.
          const operational =
            result.components.gpuOperational.co2Grams +
            result.components.serverOperational.co2Grams +
            result.components.datacenterOverhead.co2Grams;

          // Contrast against the OTHER side of the open/closed divide. A
          // Berget-served open-weight model runs on Sweden's clean grid (8
          // g/kWh); a closed frontier model runs on a US hyperscaler grid
          // (Texas, 420 g/kWh). Contrasting the two shows the grid lever in
          // the direction that matters for the selected scenario. The
          // multiplier applies only to the operational (energy) part, since
          // embodied hardware emissions are location-independent.
          const SWEDEN = { name: "Sweden", intensity: 8 };
          const TEXAS = { name: "Texas (a US hyperscaler)", intensity: 420 };
          const currentIntensity = grid?.intensityGPerKwh ?? SWEDEN.intensity;
          // Contrast against the dirtier of the two reference grids unless we
          // are already on it — then contrast against the cleaner one.
          const contrast = currentIntensity <= SWEDEN.intensity ? TEXAS : SWEDEN;
          const contrastRatio = contrast.intensity / currentIntensity;
          const isCleanerThanContrast = contrastRatio > 1;
          const operationalOnContrast = operational * contrastRatio;
          const contrastMultiple =
            operational > 0 ? (operationalOnContrast / operational).toFixed(1).replace(/\.0$/, "") : "—";

          return (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "2rem", fontWeight: 700, color: C.stone }}>
                  {seconds < 1 ? "< 1" : seconds < 60 ? Math.round(seconds) : (seconds / 60).toFixed(1)}
                </span>
                <span style={{ fontSize: "1rem", color: C.cloud }}>
                  {seconds < 60 ? "seconds" : "minutes"} of microwaving coffee on Sweden's clean grid
                </span>
              </div>

              {(() => {
                // Show the footprint as a ROW of coffee cups — one cup per 120
                // seconds of microwaving (a full cup of water takes ~2 minutes
                // in an 800W microwave) — so the quantity is visually absolute:
                // 240 s renders twice as many cups as 120 s. A relative bar (the
                // old design, scaled to a fixed max) made every result fill a
                // similar-looking fraction of a track, hiding the real
                // difference in magnitude. A partial cup shows the remainder, so
                // 180 s reads as one full cup and a half.
                const SECONDS_PER_CUP = 120;
                const cups = seconds / SECONDS_PER_CUP;
                const fullCups = Math.floor(cups);
                const partial = cups - fullCups; // 0..1 fill of the last cup
                const CUP = 22;
                const cupColor = seconds < 30 ? C.moss : seconds < 60 ? C.sage : C.stone;
                return (
                  <div
                    role="img"
                    aria-label={`${Math.round(seconds)} seconds of microwaving, shown as ${cups.toFixed(1)} coffee cups`}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "0.35rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {Array.from({ length: fullCups }).map((_, i) => (
                      <Coffee key={i} size={CUP} strokeWidth={1.5} style={{ color: cupColor }} />
                    ))}
                    {partial > 0.05 && (
                      <span style={{ position: "relative", width: CUP, height: CUP, display: "inline-block" }}>
                        {/* faint empty cup as the track */}
                        <Coffee size={CUP} strokeWidth={1.5} style={{ color: cupColor, opacity: 0.22 }} />
                        {/* clipped full cup overlaid to show the partial fill */}
                        <span
                          style={{
                            position: "absolute",
                            inset: 0,
                            overflow: "hidden",
                            width: `${partial * 100}%`,
                          }}
                        >
                          <Coffee size={CUP} strokeWidth={1.5} style={{ color: cupColor }} />
                        </span>
                      </span>
                    )}
                    {fullCups === 0 && partial <= 0.05 && (
                      <span style={{ fontSize: "0.8rem", color: C.muted }}>less than one cup</span>
                    )}
                  </div>
                );
              })()}

              <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                One AI request = {seconds < 1 ? "less than a second" : `${Math.round(seconds)} seconds`} of running an
                800W microwave, both priced on Sweden's grid. The number of seconds looks large precisely{" "}
                <em>because</em> the baseline is so clean — a second of anything here costs almost no CO₂, so a small
                footprint still buys many clean seconds. A full cup takes ~2 minutes.
              </p>

              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 8,
                  fontSize: "0.75rem",
                  color: C.muted,
                }}
              >
                {isCleanerThanContrast ? (
                  <>
                    <strong style={{ color: C.peak }}>Context:</strong> this grid ({grid?.name ?? "selected region"},{" "}
                    {currentIntensity} g/kWh) is cleaner than {contrast.name} ({contrast.intensity} g/kWh). The{" "}
                    <em>energy</em> part of this request would emit ~{contrastMultiple}× more there — the hardware
                    part is the same anywhere.
                  </>
                ) : (
                  <>
                    <strong style={{ color: C.peak }}>Context:</strong> this grid ({grid?.name ?? "selected region"},{" "}
                    {currentIntensity} g/kWh) is no cleaner than {contrast.name} ({contrast.intensity} g/kWh), so
                    moving it to a cleaner grid is the available saving here. The hardware part is the same anywhere.
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Breakdown */}
      {(() => {
        const items = [
          { key: "gpuOperational", label: "GPU Compute", color: COMPONENT_COLORS.gpu.bg },
          { key: "gpuIdle", label: "GPU Idle Baseline", color: COMPONENT_COLORS.server.bg },
          { key: "serverOperational", label: "Server & DC", color: COMPONENT_COLORS.server.bg },
          { key: "datacenterOverhead", label: "Cooling", color: COMPONENT_COLORS.overhead.bg },
          { key: "embodiedGpu", label: "GPU Hardware", color: COMPONENT_COLORS.embodied.bg },
          { key: "embodiedOther", label: "Supporting Infra (DB/logging/network)", color: COMPONENT_COLORS.embodied.bg },
        ];
        // ABSOLUTE scale: every bar is sized against a FIXED ceiling, not against
        // the current total. The old per-row "%" made a component's share grow
        // visually whenever the total shrank (e.g. GPU Idle going from 1.5 g to
        // 30 mg still read as a bigger slice), which looked like emissions were
        // rising. Scaling to a fixed ceiling makes the bars physically shrink as
        // the footprint shrinks. 0.5 g comfortably covers the largest result we
        // show (a closed frontier model, ~0.3 g) with headroom.
        const SCALE_CEILING_GRAMS = 0.5;
        const total = result.totalCO2Grams;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
            {/* Stacked absolute bar: total width tracks the real total, so a
                smaller footprint is visibly a shorter bar. */}
            <div
              role="img"
              aria-label={`Total ${formatCO2(total)}, broken down by component`}
              style={{
                display: "flex",
                height: 14,
                width: `${Math.min(100, (total / SCALE_CEILING_GRAMS) * 100)}%`,
                minWidth: 4,
                borderRadius: 4,
                overflow: "hidden",
                marginBottom: "0.5rem",
                transition: "width 0.4s ease",
              }}
            >
              {items.map((item) => {
                const value = result.components[item.key as keyof typeof result.components].co2Grams;
                if (value <= 0 || total <= 0) return null;
                return (
                  <div
                    key={item.key}
                    title={`${item.label}: ${formatCO2(value)}`}
                    style={{ width: `${(value / total) * 100}%`, background: item.color }}
                  />
                );
              })}
            </div>
            {items.map((item) => {
              const value = result.components[item.key as keyof typeof result.components].co2Grams;
              const pct = total > 0 ? (value / total) * 100 : 0;
              // Per-row bar is also absolute (against the fixed ceiling), so a
              // component that shrinks in mg shows a shorter bar even if its
              // percentage share of the total grew.
              const absWidth = Math.min(100, (value / SCALE_CEILING_GRAMS) * 100);
              return (
                <div key={item.key} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: "0.875rem", minWidth: 0 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</div>
                    <div style={{ height: 4, background: "rgba(0,0,0,0.3)", borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
                      <div style={{ width: `${absWidth}%`, height: "100%", background: item.color, borderRadius: 2, transition: "width 0.4s ease" }} />
                    </div>
                  </div>
                  <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600, flexShrink: 0 }}>{formatCO2(value)}</div>
                  <div style={{ fontSize: "0.75rem", color: C.muted, width: 40, textAlign: "right", flexShrink: 0 }}>{pct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Water */}
      <div
        style={{
          background: "rgba(26, 26, 26, 0.6)",
          borderRadius: 12,
          padding: "1rem",
          border: `1px solid ${C.borderStrong}`,
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Droplets size={16} strokeWidth={1.5} style={{ color: C.peak }} />
          <span style={{ fontWeight: 600, color: C.peak }}>Water Usage</span>
        </div>
        <div style={{ fontSize: "1.25rem", color: result.waterLiters === 0 ? C.moss : C.stone }}>
          {result.waterLiters === 0 ? "0 L (free-air cooling)" : `${(result.waterLiters * 1000).toFixed(2)} ml per request`}
        </div>
      </div>
    </div>
  );
}
