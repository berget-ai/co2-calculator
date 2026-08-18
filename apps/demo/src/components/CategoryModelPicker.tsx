import { RefreshCw } from "lucide-react";
import { C, Card } from "./shared";
import type { ModelCategories, ModelProfilesMap } from "./types";

interface Props {
  modelCategory: string;
  selectedModel: string;
  modelCategories: ModelCategories;
  onCategoryChange: (key: string) => void;
  onModelSelect: (id: string) => void;
  modelsLoading: boolean;
  modelsError: string | null;
  hasFetchedData: boolean;
  onRefresh: () => void;
}

export function CategoryModelPicker({
  modelCategory,
  selectedModel,
  modelCategories,
  onCategoryChange,
  onModelSelect,
  modelsLoading,
  modelsError,
  hasFetchedData,
  onRefresh,
}: Props) {
  const category = modelCategories[modelCategory];
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        {Object.entries(modelCategories).map(([key, cat]) => (
          <Card key={key} selected={modelCategory === key} onClick={() => onCategoryChange(key)}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}>
              <cat.icon size={32} strokeWidth={1.5} />
            </div>
            <div style={{ fontWeight: 600, color: C.peak, fontSize: "1rem" }}>{cat.label}</div>
            <div style={{ fontSize: "0.75rem", color: C.muted }}>{cat.description}</div>
          </Card>
        ))}
      </div>

      <div style={{ background: C.ghost, borderRadius: 12, padding: "1rem", border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.75rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Model
          </div>
          {modelsLoading && (
            <div style={{ fontSize: "0.75rem", color: C.moss, display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <RefreshCw size={12} className="spin" /> Loading models...
            </div>
          )}
          {hasFetchedData && (
            <button
              onClick={onRefresh}
              style={{
                fontSize: "0.75rem",
                color: C.muted,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
              title="Refresh model data"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          )}
        </div>
        {/* A single horizontally-scrolling row of model chips — swipe sideways
            on mobile rather than wrapping to several rows. */}
        <div
          style={{
            display: "flex",
            flexWrap: "nowrap",
            overflowX: "auto",
            gap: "0.5rem",
            paddingBottom: "0.25rem",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {category.models.map((m) => (
            <button
              key={m.id}
              onClick={() => onModelSelect(m.id)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: 6,
                border: `1px solid ${selectedModel === m.id ? C.moss : C.border}`,
                background: selectedModel === m.id ? C.mossDim : "transparent",
                color: selectedModel === m.id ? C.moss : C.cloud,
                cursor: "pointer",
                fontSize: "0.75rem",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                minHeight: "2.25rem",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {m.name}
            </button>
          ))}
        </div>
        {modelsError && (
          <div style={{ fontSize: "0.75rem", color: C.danger, marginTop: "0.5rem" }}>
            Error loading models: {modelsError}
          </div>
        )}
      </div>
    </div>
  );
}
