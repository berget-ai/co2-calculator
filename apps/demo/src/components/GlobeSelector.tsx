import { useRef, useEffect, useState, useCallback } from "react";
import Globe from "react-globe.gl";
import { GRID_REGIONS } from "@berget/co2-calculator";

// Geo coordinates for all grid regions
const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  sweden: { lat: 60.1282, lng: 18.6435 },
  norway: { lat: 60.4720, lng: 8.4689 },
  france: { lat: 46.2276, lng: 2.2137 },
  quebec: { lat: 52.9399, lng: -73.5491 },
  ireland: { lat: 53.1424, lng: -7.6921 },
  germany: { lat: 51.1657, lng: 10.4515 },
  usa: { lat: 37.0902, lng: -95.7129 },
  useast: { lat: 40.7128, lng: -74.0060 },
  texas: { lat: 31.9686, lng: -99.9018 },
  california: { lat: 36.7783, lng: -119.4179 },
  japan: { lat: 36.2048, lng: 138.2529 },
  india: { lat: 20.5937, lng: 78.9629 },
  poland: { lat: 51.9194, lng: 19.1451 },
  china: { lat: 35.8617, lng: 104.1954 },
  global: { lat: 20.0, lng: 0.0 },
};

// Approximate energy mix for regions (for visualization)
const REGION_ENERGY_MIX: Record<string, { source: string; percentage: number }[]> = {
  sweden: [
    { source: "Hydro", percentage: 45 },
    { source: "Wind", percentage: 40 },
    { source: "Nuclear", percentage: 10 },
    { source: "Solar", percentage: 5 },
  ],
  norway: [
    { source: "Hydro", percentage: 88 },
    { source: "Wind", percentage: 8 },
    { source: "Other", percentage: 4 },
  ],
  france: [
    { source: "Nuclear", percentage: 70 },
    { source: "Hydro", percentage: 12 },
    { source: "Wind", percentage: 10 },
    { source: "Solar", percentage: 5 },
    { source: "Other", percentage: 3 },
  ],
  quebec: [
    { source: "Hydro", percentage: 95 },
    { source: "Wind", percentage: 4 },
    { source: "Other", percentage: 1 },
  ],
  ireland: [
    { source: "Natural Gas", percentage: 45 },
    { source: "Wind", percentage: 35 },
    { source: "Coal", percentage: 15 },
    { source: "Other", percentage: 5 },
  ],
  germany: [
    { source: "Coal", percentage: 30 },
    { source: "Wind", percentage: 25 },
    { source: "Natural Gas", percentage: 18 },
    { source: "Solar", percentage: 12 },
    { source: "Biomass", percentage: 10 },
    { source: "Hydro", percentage: 5 },
  ],
  usa: [
    { source: "Natural Gas", percentage: 40 },
    { source: "Coal", percentage: 20 },
    { source: "Nuclear", percentage: 20 },
    { source: "Wind", percentage: 10 },
    { source: "Solar", percentage: 6 },
    { source: "Hydro", percentage: 4 },
  ],
  useast: [
    { source: "Natural Gas", percentage: 45 },
    { source: "Coal", percentage: 25 },
    { source: "Nuclear", percentage: 20 },
    { source: "Other", percentage: 10 },
  ],
  texas: [
    { source: "Natural Gas", percentage: 50 },
    { source: "Wind", percentage: 25 },
    { source: "Coal", percentage: 15 },
    { source: "Solar", percentage: 8 },
    { source: "Other", percentage: 2 },
  ],
  california: [
    { source: "Natural Gas", percentage: 40 },
    { source: "Solar", percentage: 20 },
    { source: "Wind", percentage: 12 },
    { source: "Nuclear", percentage: 10 },
    { source: "Hydro", percentage: 10 },
    { source: "Other", percentage: 8 },
  ],
  japan: [
    { source: "Natural Gas", percentage: 35 },
    { source: "Coal", percentage: 30 },
    { source: "Renewables", percentage: 20 },
    { source: "Nuclear", percentage: 10 },
    { source: "Oil", percentage: 5 },
  ],
  india: [
    { source: "Coal", percentage: 75 },
    { source: "Solar", percentage: 10 },
    { source: "Wind", percentage: 8 },
    { source: "Hydro", percentage: 5 },
    { source: "Other", percentage: 2 },
  ],
  poland: [
    { source: "Coal", percentage: 70 },
    { source: "Wind", percentage: 12 },
    { source: "Natural Gas", percentage: 10 },
    { source: "Solar", percentage: 5 },
    { source: "Other", percentage: 3 },
  ],
  china: [
    { source: "Coal", percentage: 60 },
    { source: "Hydro", percentage: 15 },
    { source: "Wind", percentage: 10 },
    { source: "Solar", percentage: 8 },
    { source: "Natural Gas", percentage: 5 },
    { source: "Nuclear", percentage: 2 },
  ],
  global: [
    { source: "Coal", percentage: 35 },
    { source: "Natural Gas", percentage: 25 },
    { source: "Hydro", percentage: 15 },
    { source: "Nuclear", percentage: 10 },
    { source: "Wind", percentage: 8 },
    { source: "Solar", percentage: 5 },
    { source: "Other", percentage: 2 },
  ],
};

// Approximate average temperatures for PUE visualization
const REGION_TEMP: Record<string, number> = {
  sweden: 5, norway: 4, france: 12, quebec: 3, ireland: 9,
  germany: 10, usa: 12, useast: 13, texas: 20, california: 16,
  japan: 15, india: 25, poland: 8, china: 10, global: 14,
};

interface RegionData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  intensityGPerKwh: number;
  typicalPue: number;
  waterLitersPerKwh: number;
  avgTemp: number;
  energyMix: { source: string; percentage: number }[];
}

function getRegionData(): RegionData[] {
  return Object.entries(GRID_REGIONS).map(([id, grid]) => {
    const coords = REGION_COORDS[id];
    return {
      id,
      name: grid.name,
      lat: coords?.lat ?? 0,
      lng: coords?.lng ?? 0,
      intensityGPerKwh: grid.intensityGPerKwh,
      typicalPue: grid.typicalPue,
      waterLitersPerKwh: grid.waterLitersPerKwh,
      avgTemp: REGION_TEMP[id] ?? 12,
      energyMix: REGION_ENERGY_MIX[id] ?? [{ source: "Unknown", percentage: 100 }],
    };
  });
}

// Color scale for carbon intensity (green = low, red = high)
function getIntensityColor(intensity: number): string {
  if (intensity < 50) return "#60A580"; // Moss - very clean
  if (intensity < 150) return "#8EB29F"; // Sage - clean
  if (intensity < 300) return "#D4A574"; // Warm - moderate
  if (intensity < 500) return "#D1392E"; // Red - dirty
  return "#8B0000"; // Dark red - very dirty
}

// Color scale for temperature (blue = cold, red = hot)
function getTempColor(temp: number): string {
  if (temp < 5) return "#3975D6"; // Cold
  if (temp < 15) return "#60A580"; // Mild
  if (temp < 25) return "#D4A574"; // Warm
  return "#D1392E"; // Hot
}

interface GlobeSelectorProps {
  selectedRegion: string;
  onRegionSelect: (regionId: string) => void;
  showMode?: "intensity" | "temperature" | "pue";
}

export function GlobeSelector({ 
  selectedRegion, 
  onRegionSelect,
  showMode = "intensity" 
}: GlobeSelectorProps) {
  const globeRef = useRef<any>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const regions = getRegionData();

  // Build hex data for the globe
  const hexData = regions.map(region => ({
    lat: region.lat,
    lng: region.lng,
    intensity: region.intensityGPerKwh,
    temp: region.avgTemp,
    pue: region.typicalPue,
    name: region.name,
    id: region.id,
    color: showMode === "intensity" 
      ? getIntensityColor(region.intensityGPerKwh)
      : showMode === "temperature"
        ? getTempColor(region.avgTemp)
        : getIntensityColor(region.typicalPue * 200),
    size: region.id === selectedRegion ? 1.2 : 0.8,
  }));

  const handleHexClick = useCallback((hex: any) => {
    if (hex && hex.id) {
      onRegionSelect(hex.id);
    }
  }, [onRegionSelect]);

  const handleHexHover = useCallback((hex: any) => {
    setHoveredRegion(hex?.id || null);
  }, []);

  // Auto-rotate and zoom to selected region
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    
    if (selectedRegion) {
      // Zoom in on selected region
      const region = regions.find(r => r.id === selectedRegion);
      if (region) {
        globe.pointOfView({ lat: region.lat, lng: region.lng, altitude: 1.2 }, 1200);
      }
    } else {
      // Slow auto-rotation when no region selected
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.5;
    }
  }, [selectedRegion, regions]);

  const selectedRegionData = regions.find(r => r.id === selectedRegion);
  const hoveredRegionData = hoveredRegion ? regions.find(r => r.id === hoveredRegion) : null;
  const displayRegion = hoveredRegionData || selectedRegionData;

  return (
    <div style={{ position: "relative", width: "100%", height: 420 }}>
      <Globe
        ref={globeRef}
        width={800}
        height={420}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        hexBinPointsData={hexData}
        hexBinPointLat="lat"
        hexBinPointLng="lng"
        hexBinPointWeight="size"
        hexTopColor={(d: any) => d.color}
        hexSideColor={(d: any) => d.color}
        hexBinResolution={3}
        hexBinMerge={true}
        hexLabel={(d: any) => {
          const region = regions.find(r => r.id === d.id);
          if (!region) return "";
          return `
            <div style="padding: 8px; font-family: DM Sans, sans-serif;">
              <strong style="font-size: 14px; color: #E5DDD5;">${region.name}</strong><br/>
              <span style="color: #A6A6A6; font-size: 12px;">
                ${region.intensityGPerKwh} g CO₂/kWh<br/>
                ${region.avgTemp}°C avg temp<br/>
                PUE: ${region.typicalPue}
              </span>
            </div>
          `;
        }}
        onHexClick={handleHexClick}
        onHexHover={handleHexHover}
        atmosphereColor="#60A580"
        atmosphereAltitude={0.15}
        labelsData={hexData}
        labelLat="lat"
        labelLng="lng"
        labelText={(d: any) => d.name}
        labelSize={0.5}
        labelColor={() => "rgba(229, 221, 213, 0.8)"}
        labelAltitude={0.02}
        labelIncludeDot={(d: any) => d.id === selectedRegion}
        labelDotRadius={0.3}
        labelResolution={2}
      />

      {/* Info panel - compact, side-positioned */}
      {displayRegion && (
        <div style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          right: 12,
          background: "rgba(10, 10, 10, 0.92)",
          backdropFilter: "blur(10px)",
          borderRadius: 10,
          padding: "0.75rem 1rem",
          border: "1px solid rgba(229, 221, 213, 0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {/* Name + intensity */}
            <div style={{ flex: "0 0 auto" }}>
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "#FFFFFF", fontFamily: "Ovo, serif" }}>
                {displayRegion.name}
              </div>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)" }}>
                {displayRegion.id === selectedRegion ? "Selected" : "Hovering"}
              </div>
            </div>

            {/* Stats row */}
            <div style={{ flex: 1, display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: getIntensityColor(displayRegion.intensityGPerKwh) }}>
                  {displayRegion.intensityGPerKwh}
                </div>
                <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>g/kWh</div>
              </div>
              <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: getTempColor(displayRegion.avgTemp) }}>
                  {displayRegion.avgTemp}°
                </div>
                <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>Temp</div>
              </div>
              <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#E5DDD5" }}>
                  {displayRegion.typicalPue}
                </div>
                <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>PUE</div>
              </div>
              <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: displayRegion.waterLitersPerKwh === 0 ? "#60A580" : "#D1392E" }}>
                  {displayRegion.waterLitersPerKwh === 0 ? "0" : displayRegion.waterLitersPerKwh}
                </div>
                <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>L/kWh</div>
              </div>
            </div>

            {/* Energy mix bar */}
            <div style={{ flex: "0 0 120px" }}>
              <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", marginBottom: 2 }}>
                {displayRegion.energyMix.map((source) => (
                  <div
                    key={source.source}
                    style={{
                      width: `${source.percentage}%`,
                      background: getEnergyColor(source.source),
                    }}
                    title={`${source.source}: ${source.percentage}%`}
                  />
                ))}
              </div>
              <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
                Energy mix
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend - compact */}
      <div style={{
        position: "absolute",
        top: 12,
        right: 12,
        background: "rgba(10, 10, 10, 0.85)",
        backdropFilter: "blur(10px)",
        borderRadius: 8,
        padding: "0.5rem 0.75rem",
        border: "1px solid rgba(229, 221, 213, 0.05)",
      }}>
        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", marginBottom: "0.35rem", fontWeight: 500 }}>
          {showMode === "intensity" ? "Carbon Intensity" : showMode === "temperature" ? "Temperature" : "PUE"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          {showMode === "intensity" && (
            <>
              <LegendItem color="#60A580" label="< 50" />
              <LegendItem color="#8EB29F" label="50-150" />
              <LegendItem color="#D4A574" label="150-300" />
              <LegendItem color="#D1392E" label="300-500" />
              <LegendItem color="#8B0000" label="> 500" />
            </>
          )}
          {showMode === "temperature" && (
            <>
              <LegendItem color="#3975D6" label="< 5°C" />
              <LegendItem color="#60A580" label="5-15°C" />
              <LegendItem color="#D4A574" label="15-25°C" />
              <LegendItem color="#D1392E" label="> 25°C" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)" }}>{label}</span>
    </div>
  );
}

function getEnergyColor(source: string): string {
  const colors: Record<string, string> = {
    "Hydro": "#3975D6",
    "Nuclear": "#8B5CF6",
    "Wind": "#60A580",
    "Solar": "#D4A574",
    "Coal": "#4A4A4A",
    "Natural Gas": "#D1392E",
    "Other": "#A6A6A6",
  };
  return colors[source] || "#A6A6A6";
}

export { getRegionData };
