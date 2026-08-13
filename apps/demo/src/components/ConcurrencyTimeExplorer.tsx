import { useState } from "react";
import { C, Card } from "./shared";
import type { ModelCategoryDef, ModelProfile } from "./types";

interface Props {
  category: ModelCategoryDef;
  model: ModelProfile | undefined;
}

// Mirror of the library's applyConcurrencyDelay (baseline concurrency = 8,
// sub-linear logarithmic scaling above it).
function concurrencyDelay(baseResponseTime: number, concurrency: number): number {
  const baseline = 8;
  if (concurrency <= baseline) return baseResponseTime;
  const ratio = concurrency / baseline;
  return baseResponseTime * (1 + Math.log2(ratio) * 0.15);
}

/**
 * Lives in §1: lets the reader see how many seconds their query is estimated
 * to occupy the GPU, and how sharing the node across more concurrent users
 * stretches the per-request latency (queueing). This is a LATENCY view only —
 * it does not change the per-request CO₂, because the node's fixed cost is
 * amortised over the whole day, not over the concurrency of the moment.
 */
export function ConcurrencyTimeExplorer({ category, model }: Props) {
  // Local slider state: this explores latency only, so it is decoupled from
  // the calculator's deployment model (which owns the CO₂ allocation).
  const [concurrency, setConcurrency] = useState(8);

  // The library scales response time by sqrt(tokenRatio) relative to the
  // model's default token counts. Here the workload is the category default,
  // so tokenRatio = 1 and the base time is the category response time.
  const baseSeconds = category.responseTime;
  const effectiveSeconds = concurrencyDelay(baseSeconds, concurrency);
  const inputTokens = model?.defaultInputTokens ?? 0;
  const outputTokens = model?.defaultOutputTokens ?? 0;

  return (
    <div>
      <Card>
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ color: C.peak, fontWeight: 600 }}>Concurrent Requests</span>
            <span style={{ color: C.moss }}>{concurrency}</span>
          </div>
          <input
            type="range"
            min={1}
            max={64}
            step={1}
            value={concurrency}
            onChange={(e) => setConcurrency(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.25rem" }}>
            More concurrent requests mean a little more queueing, so each request occupies the GPU slightly longer.
            This affects latency, not the per-request carbon — the node's fixed cost is already amortised over the day.
          </div>
        </div>
      </Card>

      {/* Estimated request length */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "1rem",
          marginTop: "1rem",
          padding: "1rem 1.25rem",
          background: "rgba(96, 165, 128, 0.07)",
          borderRadius: 8,
          border: `1px solid ${C.borderMoss}`,
        }}
      >
        <div>
          <div style={{ fontSize: "0.75rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Estimated request length
          </div>
          <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.15rem" }}>
            {model ? `${model.displayName} · ${inputTokens} in / ${outputTokens} out tokens` : "—"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontSize: "1.75rem", fontWeight: 700, color: C.stone, fontFamily: "var(--berget-font-mono, 'DM Mono', monospace)" }}>
            {effectiveSeconds < 1 ? `${(effectiveSeconds * 1000).toFixed(0)} ms` : `${effectiveSeconds.toFixed(2)} s`}
          </span>
          <div style={{ fontSize: "0.7rem", color: C.muted }}>of GPU time occupied</div>
        </div>
      </div>
    </div>
  );
}
