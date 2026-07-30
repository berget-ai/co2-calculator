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
          <div style={{ fontSize: "0.875rem", color: C.muted, marginBottom: "0.5rem" }}>Total CO₂ per request</div>
          <div style={{ fontSize: "3rem", fontWeight: 700, color: C.stone, lineHeight: 1.1 }}>
            {formatCO2(result.totalCO2Grams)}
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
          // A microwaved cup: 800W for 2 min (120s) = 0.03 kWh
          // Sweden: 0.03 kWh × 8 g/kWh = 0.24g CO₂
          const coffeeCO2PerSecond = 0.24 / 120; // grams CO2 per second of microwaving in Sweden
          const seconds = result.totalCO2Grams / coffeeCO2PerSecond;

          // The grid-intensity multiplier applies only to the operational
          // (energy) part of the footprint. Embodied hardware emissions are
          // location-independent, so scaling the whole total by the grid
          // ratio would overstate the difference.
          const operational =
            result.components.gpuOperational.co2Grams +
            result.components.serverOperational.co2Grams +
            result.components.datacenterOverhead.co2Grams;
          const germanyRatio = 380 / 8;
          const operationalOnGermany = operational * germanyRatio;
          const germanySeconds = operationalOnGermany / coffeeCO2PerSecond;
          const germanyMultiple = operational > 0 ? (operationalOnGermany / operational).toFixed(0) : "—";

          return (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "2rem", fontWeight: 700, color: C.stone }}>
                  {seconds < 1 ? "< 1" : seconds < 60 ? Math.round(seconds) : (seconds / 60).toFixed(1)}
                </span>
                <span style={{ fontSize: "1rem", color: C.cloud }}>
                  {seconds < 60 ? "seconds" : "minutes"} of microwaving coffee in Sweden
                </span>
              </div>

              <div
                style={{
                  height: 8,
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 4,
                  overflow: "hidden",
                  marginBottom: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, (seconds / 120) * 100)}%`,
                    height: "100%",
                    background: seconds < 30 ? C.moss : seconds < 60 ? C.sage : C.stone,
                    borderRadius: 4,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>

              <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
                One AI request = {seconds < 1 ? "less than a second" : `${Math.round(seconds)} seconds`} of running an
                800W microwave in Sweden. A full cup takes ~2 minutes.
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
                <strong style={{ color: C.peak }}>Context:</strong> Sweden's grid is 8 g/kWh (hydro + nuclear); Germany's
                is 380. The <em>energy</em> part of this request would emit ~{germanyMultiple}× more on the German grid
                {operational > 0 ? ` (≈${Math.round(germanySeconds)}s of microwaving)` : ""} — the hardware part is the
                same anywhere.
              </div>
            </div>
          );
        })()}
      </div>

      {/* Breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {[
          { key: "gpuOperational", label: "GPU Energy", color: COMPONENT_COLORS.gpu.bg },
          { key: "serverOperational", label: "Server & DC", color: COMPONENT_COLORS.server.bg },
          { key: "datacenterOverhead", label: "Cooling", color: COMPONENT_COLORS.overhead.bg },
          { key: "embodiedGpu", label: "GPU Hardware", color: COMPONENT_COLORS.embodied.bg },
          { key: "embodiedOther", label: "Other Compute", color: COMPONENT_COLORS.embodied.bg },
        ].map((item) => {
          const value = result.components[item.key as keyof typeof result.components].co2Grams;
          const pct = (value / result.totalCO2Grams) * 100;
          return (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
              <div style={{ flex: 1, fontSize: "0.875rem" }}>{item.label}</div>
              <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600 }}>{formatCO2(value)}</div>
              <div style={{ fontSize: "0.75rem", color: C.muted, width: 40, textAlign: "right" }}>{pct.toFixed(0)}%</div>
            </div>
          );
        })}
      </div>

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
