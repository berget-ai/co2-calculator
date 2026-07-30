import { lazy, Suspense } from "react";
import { GRID_REGIONS } from "@berget/co2-calculator";
import { C } from "./shared";

// Lazy load GlobeSelector to avoid loading Three.js on initial page load
const GlobeSelector = lazy(() =>
  import("./GlobeSelector").then((module) => ({
    default: module.GlobeSelector,
  }))
);

interface Props {
  region: string;
  onRegionSelect: (region: string) => void;
}

export function RegionPicker({ region, onRegionSelect }: Props) {
  return (
    <div>
      {/* Globe - lazy loaded with fallback */}
      <div
        style={{
          background: C.ghost,
          borderRadius: 12,
          border: `1px solid ${C.border}`,
          overflow: "hidden",
          marginBottom: "1.5rem",
          minHeight: 420,
        }}
      >
        <Suspense
          fallback={
            <div
              style={{
                height: 420,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.muted,
              }}
            >
              Loading 3D globe...
            </div>
          }
        >
          <GlobeSelector selectedRegion={region} onRegionSelect={onRegionSelect} showMode="intensity" />
        </Suspense>
      </div>

      {/* Compact region list */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "0.5rem",
        }}
      >
        {Object.entries(GRID_REGIONS).map(([key, g]) => (
          <button
            key={key}
            onClick={() => onRegionSelect(key)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: 6,
              border: `1px solid ${region === key ? C.moss : C.border}`,
              background: region === key ? C.mossDim : "transparent",
              color: region === key ? C.moss : C.cloud,
              cursor: "pointer",
              fontSize: "0.75rem",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background:
                  g.intensityGPerKwh < 50 ? "#60A580" : g.intensityGPerKwh < 300 ? "#D4A574" : "#D1392E",
                display: "inline-block",
              }}
            />
            <span style={{ flex: 1 }}>{g.name}</span>
            <span style={{ color: C.muted, fontSize: "0.65rem" }}>{g.intensityGPerKwh}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
