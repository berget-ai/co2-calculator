import { Sparkles, Recycle, Database, Network } from "lucide-react";
import { HARDWARE_CONFIGS } from "@berget/co2-calculator";
import { C, Card, formatCO2 } from "./shared";

interface Props {
  gpuCondition: "new" | "refurbished";
  onGpuConditionChange: (v: "new" | "refurbished") => void;
  infraCondition: "new" | "refurbished";
  onInfraConditionChange: (v: "new" | "refurbished") => void;
}

// Marginal embodied cost per query of choosing NEW over refurbished, computed
// with the SAME method as the calculator (METHODOLOGY §4.2/§4.2b + §3.2d):
// amortise over 50% projected lifetime utilisation across 5 years, then divide
// by the DAY-AVERAGE concurrency (3 for the Gemma reference query) — the same
// denominator for both the GPU term and the supporting-infra term, since the
// fixed costs are now amortised over the whole day, not split GPU-batch vs
// node-batch. Shown for the reference query (Gemma 4 31B, ~1.83 s
// token-adjusted GPU time). This matches the §6.2 worked example.
const LIFETIME_ACTIVE_S = 5 * 365 * 24 * 3600 * 0.5;
const REF_GPU_TIME_S = 1.83;
const DAY_AVERAGE_CONCURRENCY = 3; // Gemma's measured Little's Law value (§3.2d)
const gpuEmbodiedPerQuery =
  ((HARDWARE_CONFIGS.b300.embodiedPerGpuKg * 1000) / LIFETIME_ACTIVE_S) * REF_GPU_TIME_S / DAY_AVERAGE_CONCURRENCY;
const infraEmbodiedPerQuery =
  ((HARDWARE_CONFIGS.b300.otherComputeEmbodiedKg * 1000) / LIFETIME_ACTIVE_S) * REF_GPU_TIME_S / DAY_AVERAGE_CONCURRENCY;

export function HardwarePicker({
  gpuCondition,
  onGpuConditionChange,
  infraCondition,
  onInfraConditionChange,
}: Props) {
  return (
    <div>
      {/* GPU Selection */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: C.peak, marginBottom: "0.75rem" }}>
          GPU (NVIDIA B300 ×8)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <Card selected={gpuCondition === "new"} onClick={() => onGpuConditionChange("new")}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}>
              <Sparkles size={32} strokeWidth={1.5} />
            </div>
            <div style={{ fontWeight: 600, color: C.peak }}>New GPU</div>
            <div style={{ fontSize: "0.75rem", color: C.muted }}>Full embodied carbon</div>
            <div style={{ fontSize: "0.875rem", color: C.danger, marginTop: "0.5rem" }}>
              +{formatCO2(gpuEmbodiedPerQuery)} per query
            </div>
          </Card>
          <Card selected={gpuCondition === "refurbished"} onClick={() => onGpuConditionChange("refurbished")}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}>
              <Recycle size={32} strokeWidth={1.5} />
            </div>
            <div style={{ fontWeight: 600, color: C.peak }}>Refurbished GPU</div>
            <div style={{ fontSize: "0.75rem", color: C.muted }}>Zero embodied carbon</div>
            <div style={{ fontSize: "0.875rem", color: C.moss, marginTop: "0.5rem" }}>0 g per query</div>
          </Card>
        </div>
      </div>

      {/* Supporting infrastructure selection */}
      <div>
        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: C.peak, marginBottom: "0.5rem" }}>
          Supporting infrastructure
        </div>
        <div style={{ fontSize: "0.75rem", color: C.muted, marginBottom: "0.75rem" }}>
          The databases, logging/storage and network gear that serve the node — separate hardware from its chassis.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <Card selected={infraCondition === "new"} onClick={() => onInfraConditionChange("new")}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}>
              <Database size={32} strokeWidth={1.5} />
            </div>
            <div style={{ fontWeight: 600, color: C.peak }}>New infra</div>
            <div style={{ fontSize: "0.75rem", color: C.muted }}>Full embodied carbon</div>
            <div style={{ fontSize: "0.875rem", color: C.danger, marginTop: "0.5rem" }}>
              +{formatCO2(infraEmbodiedPerQuery)} per query
            </div>
          </Card>
          <Card selected={infraCondition === "refurbished"} onClick={() => onInfraConditionChange("refurbished")}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}>
              <Network size={32} strokeWidth={1.5} />
            </div>
            <div style={{ fontWeight: 600, color: C.peak }}>Refurbished infra</div>
            <div style={{ fontSize: "0.75rem", color: C.muted }}>Zero embodied carbon</div>
            <div style={{ fontSize: "0.875rem", color: C.moss, marginTop: "0.5rem" }}>0 g per query</div>
          </Card>
        </div>
      </div>
      <div style={{ marginTop: "0.75rem", fontSize: "0.68rem", color: C.muted, lineHeight: 1.45 }}>
        Per-query figures use the calculator's own method (50% lifetime utilisation, both terms ÷ the day-average
        concurrency 3) for the reference query — so they match the §6.2 breakdown and update if the
        hardware constants change.
      </div>
    </div>
  );
}
