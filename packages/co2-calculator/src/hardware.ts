/**
 * Hardware configurations — real specs from NVIDIA/AMD datasheets
 * and Dell/HPE LCA reports.
 *
 * Sources:
 *   - NVIDIA HGX/H200/H100 datasheets (TDP, max system power)
 *   - AMD MI300X system spec (192GB HBM3, TDP 750W per OAM)
 *   - Dell/HPE server LCA reports (embodied carbon disaggregated per GPU)
 *
 * IMPORTANT - Embodied Carbon Uncertainty:
 *   NVIDIA and AMD do NOT publish per-GPU embodied carbon LCAs.
 *   Values below are estimates derived from Dell/HPE server-level product
 *   carbon footprint reports by subtracting non-GPU components (CPU, chassis,
 *   DRAM, NIC, SSD). These estimates have ±30-50% uncertainty.
 *
 *   Academic literature (Gupta et al. "Chasing Carbon", HPCA 2021) confirms
 *   that manufacturing dominates lifecycle emissions for data center hardware,
 *   making embodied carbon inclusion essential despite uncertainty.
 *
 *   Reference server data points:
 *   - Dell R750 (2020, A100 option): 2,181-3,880 kg CO2 total embodied
 *   - HP ProLiant DL380 gen10+ (2021, GPU option): 2,181 kg CO2 embodied
 *   - Dell C4130 (2016, GPU server): 12,700 kg CO2 total embodied
 *
 * All idle numbers are measured at the node level (chassis + GPUs + fans + NIC).
 *
 * IMPORTANT - Two distinct embodied terms:
 *   1. `embodiedPerGpuKg` is the WHOLE GPU node's manufacturing footprint
 *      divided by its GPU count (see METHODOLOGY §4.2: best-estimate ~7 t
 *      server / 8 GPUs ≈ 1,000 kg per GPU). That per-GPU figure already
 *      includes the node's own CPU, DRAM, SSD, chassis, PSUs and NIC, so we do
 *      NOT add a separate "surrounding node" term for it.
 *   2. `otherComputeEmbodiedKg` is the SEPARATE supporting infrastructure that
 *      serves a node but is not part of its chassis or its measured power
 *      draw: databases, logging/object-storage servers and network gear
 *      (top-of-rack switches, firewalls). These are real, must be counted to
 *      reconcile against actual consumption, and are roughly equivalent across
 *      regions. Values below are an allocation of that shared infrastructure
 *      to one node.
 */

import type { HardwareConfig } from "./types.js";

export const HARDWARE_CONFIGS: Record<string, HardwareConfig> = {
  mi300x: {
    name: "AMD MI300X ×8 node (Supermicro AS-8125GS-TNMR2)",
    gpuCount: 8,
    gpuMemoryGb: 192, // 192GB HBM3 per GPU
    nodeIdleWatts: 1_000,
    nodePeakWatts: 7_000,
    embodiedPerGpuKg: 1_000,
    // Separate supporting infrastructure allocated to this node (NOT its own
    // chassis — that is in embodiedPerGpuKg): databases, logging/storage
    // servers and network gear. ~3× 1U servers (3,000 kg) + 2× firewalls
    // (600 kg) + 2× switches (400 kg) ≈ 4,000 kg CO₂e.
    otherComputeEmbodiedKg: 4_000,
    chassisWatts: 1_500,
    formFactor: "8-GPU Accelerator Node (8U)",
  },
  h200: {
    name: "NVIDIA H200 ×8 node (Supermicro AS-8125GS-TNHR)",
    gpuCount: 8,
    gpuMemoryGb: 141, // 141GB HBM3e per GPU
    nodeIdleWatts: 800,
    nodePeakWatts: 6_500,
    embodiedPerGpuKg: 1_000,
    otherComputeEmbodiedKg: 4_000, // supporting infra (DB/logging/network), see mi300x note
    chassisWatts: 1_200,
    formFactor: "8-GPU Accelerator Node (8U)",
  },
  h100: {
    name: "NVIDIA H100 ×8 node (Supermicro AS-8125GS-TNHR)",
    gpuCount: 8,
    gpuMemoryGb: 80, // 80GB HBM3 per GPU
    nodeIdleWatts: 700,
    nodePeakWatts: 6_500,
    embodiedPerGpuKg: 850,
    otherComputeEmbodiedKg: 4_000, // supporting infra (DB/logging/network), see mi300x note
    chassisWatts: 1_200,
    formFactor: "8-GPU Accelerator Node (8U)",
  },
  a100: {
    name: "NVIDIA A100 ×8 node",
    gpuCount: 8,
    gpuMemoryGb: 80, // 80GB HBM2e per GPU
    nodeIdleWatts: 600,
    nodePeakWatts: 3_200,
    embodiedPerGpuKg: 1_200,
    otherComputeEmbodiedKg: 4_000, // supporting infra (DB/logging/network), see mi300x note
    chassisWatts: 1_000,
    formFactor: "8-GPU Accelerator Node",
  },
  "l4-2u": {
    name: "NVIDIA L4 ×4 (2U server)",
    gpuCount: 4,
    gpuMemoryGb: 24, // 24GB GDDR6 per GPU
    nodeIdleWatts: 200,
    nodePeakWatts: 400,
    embodiedPerGpuKg: 300,
    otherComputeEmbodiedKg: 2_500, // supporting infra (DB/logging/network), smaller share than 8-GPU nodes
    chassisWatts: 600,
    formFactor: "2U Inference Server",
  },
  "l4-1u": {
    name: "NVIDIA L4 ×2 (1U server)",
    gpuCount: 2,
    gpuMemoryGb: 24, // 24GB GDDR6 per GPU
    nodeIdleWatts: 150,
    nodePeakWatts: 250,
    embodiedPerGpuKg: 300,
    otherComputeEmbodiedKg: 2_500, // supporting infra (DB/logging/network), smaller share than 8-GPU nodes
    chassisWatts: 400,
    formFactor: "1U Inference Server",
  },
};

/** Generic hourly demand curve (European GPU cloud pattern).
 *  Weights are relative; actual CI scaling is done by period factor. */
export const DEFAULT_DEMAND_CURVE = [
  0.15, 0.10, 0.10, 0.10, 0.10, 0.12, // 00–05 low / batch
  0.30, 0.60, 0.85, 0.95, 1.00, 0.95, // 06–11 ramp
  0.90, 0.85, 0.85, 0.90, 0.95, 1.00, // 12–17 peak
  0.85, 0.70, 0.55, 0.40, 0.25, 0.20, // 18–23 tail
];
