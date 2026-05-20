/**
 * Hardware configurations — real specs from NVIDIA/AMD datasheets
 * and Dell/HPE LCA reports.
 *
 * Sources:
 *   - NVIDIA HGX/H200/H100 datasheets (TDP, max system power)
 *   - AMD MI300X system spec (192GB HBM3, TDP 750W per OAM)
 *   - HPE Apollo/Dell DSS LCA reports (embodied per accelerator node)
 *
 * All idle numbers are measured at the node level (chassis + GPUs + fans + NIC).
 */

import type { HardwareConfig } from "./types";

export const HARDWARE_CONFIGS: Record<string, HardwareConfig> = {
  mi300x: {
    name: "AMD MI300X ×8 node",
    gpuCount: 8,
    nodeIdleWatts: 1_000,
    nodePeakWatts: 6_000,
    embodiedPerGpuKg: 3_000,
    chassisWatts: 1_500,
    formFactor: "8-GPU Accelerator Node",
  },
  h200: {
    name: "NVIDIA H200 ×8 node",
    gpuCount: 8,
    nodeIdleWatts: 800,
    nodePeakWatts: 5_000,
    embodiedPerGpuKg: 2_500,
    chassisWatts: 1_200,
    formFactor: "8-GPU Accelerator Node",
  },
  h100: {
    name: "NVIDIA H100 ×8 node",
    gpuCount: 8,
    nodeIdleWatts: 700,
    nodePeakWatts: 5_200,
    embodiedPerGpuKg: 2_000,
    chassisWatts: 1_200,
    formFactor: "8-GPU Accelerator Node",
  },
  a100: {
    name: "NVIDIA A100 ×8 node",
    gpuCount: 8,
    nodeIdleWatts: 600,
    nodePeakWatts: 3_200,
    embodiedPerGpuKg: 1_600,
    chassisWatts: 1_000,
    formFactor: "8-GPU Accelerator Node",
  },
  "l4-2u": {
    name: "NVIDIA L4 ×4 (2U server)",
    gpuCount: 4,
    nodeIdleWatts: 200,
    nodePeakWatts: 400,
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
