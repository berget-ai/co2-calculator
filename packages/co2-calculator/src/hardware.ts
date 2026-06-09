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
 */

import type { HardwareConfig } from "./types.js";

export const HARDWARE_CONFIGS: Record<string, HardwareConfig> = {
  mi300x: {
    name: "AMD MI300X ×8 node",
    gpuCount: 8,
    nodeIdleWatts: 1_000,
    nodePeakWatts: 6_000,
    // NOTE: Highly uncertain. Largest die area (~1,000+ mm²), multi-chiplet,
    // 192GB HBM3. No vendor LCA available. Estimate based on die size + HBM
    // premium relative to H100. Consider ±50% uncertainty.
    embodiedPerGpuKg: 3_000,
    chassisWatts: 1_500,
    formFactor: "8-GPU Accelerator Node",
  },
  h200: {
    name: "NVIDIA H200 ×8 node",
    gpuCount: 8,
    nodeIdleWatts: 800,
    nodePeakWatts: 5_000,
    // Same compute die as H100 but upgraded to HBM3e (higher capacity/faster).
    // Memory dominates embodied carbon in modern GPUs. ~25% premium over H100.
    embodiedPerGpuKg: 2_500,
    chassisWatts: 1_200,
    formFactor: "8-GPU Accelerator Node",
  },
  h100: {
    name: "NVIDIA H100 ×8 node",
    gpuCount: 8,
    nodeIdleWatts: 700,
    nodePeakWatts: 5_200,
    // TSMC 4N (5nm-class) process, ~814 mm² die. Leading-edge nodes have
    // 2-3x higher embodied carbon per mm² than 7nm. Conservative estimate
    // based on server disaggregation. Could be 2,200-2,500 kg.
    embodiedPerGpuKg: 2_000,
    chassisWatts: 1_200,
    formFactor: "8-GPU Accelerator Node",
  },
  a100: {
    name: "NVIDIA A100 ×8 node",
    gpuCount: 8,
    nodeIdleWatts: 600,
    nodePeakWatts: 3_200,
    // 7nm process, ~826 mm² die. Server-level data suggests full A100 server
    // is 2,000-4,000 kg total embodied. With CPU/chassis/DRAM at ~1,200-1,800 kg,
    // GPU itself is likely 800-1,500 kg range. Using conservative 1,200 kg.
    embodiedPerGpuKg: 1_200,
    chassisWatts: 1_000,
    formFactor: "8-GPU Accelerator Node",
  },
  "l4-2u": {
    name: "NVIDIA L4 ×4 (2U server)",
    gpuCount: 4,
    nodeIdleWatts: 200,
    nodePeakWatts: 400,
    // Ada Lovelace architecture, smaller die, lower power. Estimate based on
    // die size ratio vs A100 and power envelope proportionality.
    embodiedPerGpuKg: 300,
    chassisWatts: 600,
    formFactor: "2U Inference Server",
  },
  "l4-1u": {
    name: "NVIDIA L4 ×2 (1U server)",
    gpuCount: 2,
    nodeIdleWatts: 150,
    nodePeakWatts: 250,
    embodiedPerGpuKg: 300,
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
