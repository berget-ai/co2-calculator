import { Factory, Zap } from "lucide-react";
import { getEstimatedLifetimeQueries } from "@berget/co2-calculator";
import { C, Card, SourceCitation, formatCO2 } from "./shared";
import type { InferenceResult, ModelComparison, ModelProfile } from "./types";

interface Props {
  model: ModelProfile | undefined;
  result: InferenceResult | null;
  lifetimeQueries: number;
  includeTraining: boolean;
  onIncludeTrainingChange: (v: boolean) => void;
  modelComparisons: ModelComparison[];
  selectedModel: string;
  onModelSelect: (id: string, lifetimeQueries: number) => void;
}

export function TrainingExplorer({
  model,
  result,
  lifetimeQueries,
  includeTraining,
  onIncludeTrainingChange,
  modelComparisons,
  selectedModel,
  onModelSelect,
}: Props) {
  return (
    <div>
      {/* Training toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          padding: "0.75rem 1rem",
          background: C.ghost,
          borderRadius: 8,
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: C.peak }}>Include training emissions in total</div>
          <div style={{ fontSize: "0.75rem", color: C.muted }}>
            Training data has high uncertainty (±50%). Toggle off to focus on operational emissions only.
          </div>
        </div>
        <button
          onClick={() => onIncludeTrainingChange(!includeTraining)}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 6,
            border: `1px solid ${includeTraining ? C.moss : C.border}`,
            background: includeTraining ? C.mossDim : "transparent",
            color: includeTraining ? C.moss : C.muted,
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          {includeTraining ? "ON ✓" : "OFF"}
        </button>
      </div>

      {/* Explanation cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <Card>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}>
            <Factory size={32} strokeWidth={1.5} />
          </div>
          <div style={{ fontWeight: 600, color: C.peak, marginBottom: "0.25rem" }}>Training</div>
          <div style={{ fontSize: "0.75rem", color: C.muted }}>
            One-time event. GPUs run for weeks/months to teach the model patterns from data.
          </div>
          <div style={{ fontSize: "0.875rem", color: C.danger, marginTop: "0.5rem", fontWeight: 600 }}>
            {model ? formatCO2(model.totalTrainingCO2Grams / 1000) + " kg CO₂" : "—"}
          </div>
          <SourceCitation source={model?.trainingSource || "Manufacturer estimate"} />
        </Card>
        <Card>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}>
            <Zap size={32} strokeWidth={1.5} />
          </div>
          <div style={{ fontWeight: 600, color: C.peak, marginBottom: "0.25rem" }}>Inference</div>
          <div style={{ fontSize: "0.75rem", color: C.muted }}>Every time someone sends a prompt.</div>
          <div style={{ fontSize: "0.875rem", color: C.moss, marginTop: "0.5rem", fontWeight: 600 }}>
            {result ? formatCO2(result.totalCO2Grams - result.components.trainingAmortised.co2Grams) + " per query" : "—"}
          </div>
        </Card>
      </div>

      {/* Visual comparison */}
      {model && (
        <Card>
          <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600, marginBottom: "1rem" }}>
            How training cost is shared
          </div>

          {/* Training bar */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: C.muted }}>Total training emissions</span>
              <span style={{ fontSize: "0.75rem", color: C.peak }}>{formatCO2(model.totalTrainingCO2Grams / 1000)} kg</span>
            </div>
            <div style={{ height: 24, background: "rgba(209, 57, 46, 0.15)", borderRadius: 4, overflow: "hidden" }}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "#D1392E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingRight: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.7rem", color: "#fff", fontWeight: 600 }}>Training (one-time)</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ textAlign: "center", margin: "0.75rem 0", fontSize: "1.25rem", color: C.muted }}>
            ÷ {(lifetimeQueries / 1_000_000_000).toFixed(1)}B queries
          </div>

          {/* Per-query bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "0.75rem", color: C.muted }}>Your share per query</span>
              <span style={{ fontSize: "0.75rem", color: C.peak }}>
                {result ? formatCO2(result.components.trainingAmortised.co2Grams) : "—"}
              </span>
            </div>
            <div style={{ height: 24, background: "rgba(96, 165, 128, 0.15)", borderRadius: 4, overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.max(0.5, ((result?.components.trainingAmortised.co2Grams || 0) / (model.totalTrainingCO2Grams / 1000)) * 100)}%`,
                  height: "100%",
                  background: "#60A580",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.7rem", color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>Per query</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "rgba(0,0,0,0.2)", borderRadius: 6 }}>
            <div style={{ fontSize: "0.75rem", color: C.muted }}>
              <strong style={{ color: C.peak }}>Why so small?</strong> The training cost is divided among all users of the
              model. Based on OpenRouter data, {model.displayName} serves approximately{" "}
              {(lifetimeQueries / 1_000_000_000).toFixed(1)} billion queries over its lifetime.
            </div>
            <SourceCitation source="OpenRouter API (api/frontend/v1/stats/model-activity)" url="https://openrouter.ai/" />
          </div>
        </Card>
      )}

      {/* Model comparison */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: C.peak, marginBottom: "0.5rem" }}>Compare Models</h2>
        <p style={{ color: C.muted, marginBottom: "1rem", fontSize: "0.875rem" }}>
          Larger models cost more to train, but popular models serve more queries
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {modelComparisons.map((comp) => {
            if (!comp) return null;
            const isSelected = comp.id === selectedModel;
            const trainingPerQuery = comp.trainingCO2;

            return (
              <button
                key={comp.id}
                onClick={() => onModelSelect(comp.id, comp.lifetimeQueries)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: 8,
                  border: `1px solid ${isSelected ? C.moss : C.border}`,
                  background: isSelected ? C.mossDim : C.ghost,
                  cursor: "pointer",
                  textAlign: "left",
                  color: C.cloud,
                  width: "100%",
                }}
              >
                {/* Model info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: 600, color: C.peak }}>{comp.name}</span>
                    {isSelected && <span style={{ color: C.moss }}>✓</span>}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.25rem" }}>
                    {(comp.parameters / 1_000_000_000).toFixed(1)}B params · {(comp.lifetimeQueries / 1_000_000_000).toFixed(1)}B lifetime queries
                  </div>
                </div>

                {/* Training cost per query */}
                <div style={{ textAlign: "right", minWidth: 100 }}>
                  <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600 }}>{formatCO2(trainingPerQuery)}</div>
                  <div style={{ fontSize: "0.65rem", color: C.muted }}>training/query</div>
                </div>

                {/* Visual bar */}
                <div style={{ width: 80, display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: "0.6rem", color: C.muted, textAlign: "right" }}>Training cost</div>
                  <div style={{ height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, (trainingPerQuery / 0.01) * 100)}%`,
                        height: "100%",
                        background: trainingPerQuery < 0.001 ? "#60A580" : trainingPerQuery < 0.01 ? "#8EB29F" : "#D4A574",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Insight */}
        {modelComparisons.length > 1 && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              background: "rgba(96, 165, 128, 0.08)",
              borderRadius: 8,
              border: `1px solid ${C.borderMoss}`,
            }}
          >
            <div style={{ fontSize: "0.875rem", color: C.peak, fontWeight: 600, marginBottom: "0.5rem" }}>💡 Key Insight</div>
            <p style={{ fontSize: "0.875rem", color: C.muted, margin: 0 }}>
              {model?.displayName} costs {formatCO2(model?.totalTrainingCO2Grams || 0)} to train, but serves ~
              {(getEstimatedLifetimeQueries(selectedModel) / 1_000_000_000).toFixed(1)}B queries. Your share:{" "}
              {result ? formatCO2(result.components.trainingAmortised.co2Grams) : "—"} per request. Compare with{" "}
              {modelComparisons.find((m) => m?.id === "openai/gpt-oss-120b")?.name} at{" "}
              {formatCO2(modelComparisons.find((m) => m?.id === "openai/gpt-oss-120b")?.trainingCO2 || 0)} — cheaper per
              query despite higher training cost because it's used more.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
