import { Sparkles, Recycle, Database, Network } from "lucide-react";
import { HARDWARE_CONFIGS } from "@berget/co2-calculator";
import { C, Card, formatCO2 } from "./shared";

interface Props {
  gpuCondition: "new" | "refurbished";
  onGpuConditionChange: (v: "new" | "refurbished") => void;
  infraCondition: "new" | "refurbished";
  onInfraConditionChange: (v: "new" | "refurbished") => void;
}

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
          GPU (NVIDIA H200 ×8)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <Card selected={gpuCondition === "new"} onClick={() => onGpuConditionChange("new")}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem", color: C.peak }}>
              <Sparkles size={32} strokeWidth={1.5} />
            </div>
            <div style={{ fontWeight: 600, color: C.peak }}>New GPU</div>
            <div style={{ fontSize: "0.75rem", color: C.muted }}>Full embodied carbon</div>
            <div style={{ fontSize: "0.875rem", color: C.danger, marginTop: "0.5rem" }}>
              +{formatCO2(((HARDWARE_CONFIGS.h200.embodiedPerGpuKg * 1000) / (5 * 365 * 24 * 3600)) * 2)} per query
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
              +{formatCO2(((HARDWARE_CONFIGS.h200.otherComputeEmbodiedKg * 1000) / (5 * 365 * 24 * 3600)) * 2)} per query
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
    </div>
  );
}
