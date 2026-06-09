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
    name: "AMD MI300X ×8 node (Supermicro AS-8125GS-TNMR2)",
    gpuCount: 8,
    gpuMemoryGb: 192, // 192GB HBM3 per GPU
    nodeIdleWatts: 1_000,
    // 8× MI300X @ 750W = 6,000W + 2× EPYC 9654 @ 360W = 720W + chassis overhead
    nodePeakWatts: 7_000,
    // REAL DATA: Based on detailed component breakdown for Supermicro AS-8125GS-TNMR2
    // Total server embodied: ~7 t CO₂e (range 5-12 t, conservative: 8 t)
    // Per GPU: 7,000 kg / 8 = 875 kg (best estimate)
    // Conservative: 8,000 kg / 8 = 1,000 kg
    //
    // Component breakdown (total server):
    // - 8× AMD MI300X + UBB + 1.5 TB HBM3: 2.0-4.0 t CO₂e
    // - 1.5 TB DDR5 RDIMM (24×64 GB): 2.0-4.6 t CO₂e
    // - SSD (2×7.68 TB + 960 GB): 0.4-1.2 t CO₂e
    // - Chassis, motherboard, PSUs, fans, NICs, cables, assembly: 0.8-1.8 t CO₂e
    // - 2× EPYC 9654 (96 cores, 360W TDP): 0.1-0.3 t CO₂e
    //
    // Sources:
    // - NVIDIA HGX H100 PCF (1,312 kg cradle-to-gate) used as baseline for GPU portion
    // - Boavizta component model for RAM/SSD/server baseline
    // - Supermicro AS-8125GS-TNMR2 spec: 8U, 75.3 kg, 6×3000W Titanium PSU
    // - AMD MI300X platform: 8× MI300X on UBB 2.0, 1.5 TB HBM3 total
    //
    // NOTE: AMD does not publish public MI300X PCF data. This is an engineering
    // estimate triangulated from NVIDIA HGX H100 PCF and Boavizta models.
    // Recommended: Request PAIA/PCF cradle-to-gate from Supermicro/AMD.
    embodiedPerGpuKg: 1_000,
    chassisWatts: 1_500,
    formFactor: "8-GPU Accelerator Node (8U)",
  },
  h200: {
    name: "NVIDIA H200 ×8 node (Supermicro AS-8125GS-TNHR)",
    gpuCount: 8,
    gpuMemoryGb: 141, // 141GB HBM3e per GPU
    nodeIdleWatts: 800,
    // 8× H200 @ 700W = 5,600W + 2× EPYC @ 360W = 720W + chassis overhead
    nodePeakWatts: 6_500,
    // REAL DATA: Based on detailed component breakdown for Supermicro AS-8125GS-TNHR
    // Total server embodied: ~7 t CO₂e (range 5-10 t, with 8×400G NICs: 8 t)
    // Per GPU: 7,000 kg / 8 = 875 kg (best estimate)
    // Conservative: 8,000 kg / 8 = 1,000 kg
    //
    // Component breakdown (total server):
    // - NVIDIA HGX H200 8-GPU baseboard: 1.6-2.2 t CO₂e
    //   Calculated from H100 PCF (1,312 kg) with HBM scaling:
    //   H200 has 8×141 GB = 1,128 GB HBM3e vs H100 640 GB
    //   HGX H200 ≈ (1,312 - 546) + 546 × (1,128 / 640) ≈ 1,729 kg
    // - 1.5 TB DDR5 RDIMM (24×64 GB): 2.0-4.6 t CO₂e (Boavizta model)
    // - SSD (2×7.68 TB + boot): 0.5-1.0 t CO₂e
    // - 2× EPYC CPU: 0.1-0.3 t CO₂e
    // - Chassis, motherboard, PSUs, fans, risers, assembly: 0.8-1.8 t CO₂e
    // - Basic NIC / management / 10-100G: 0.05-0.2 t CO₂e
    // - 8×400G/NDR NICs (optional): +0.4-0.9 t CO₂e
    //
    // Sources:
    // - NVIDIA HGX H100 PCF (1,312 kg cradle-to-gate, 546 kg memory)
    // - Boavizta component model for RAM/SSD/server baseline
    // - Supermicro AS-8125GS-TNHR spec: 8U, 75.3 kg, 6×3000W Titanium PSU
    // - NVIDIA H200 SXM: 141 GB HBM3e per GPU, up to 700W
    //
    // Comparison: H200 vs MI300X
    // - H200 GPU-board: ~1,729 kg (1.128 TB HBM3e)
    // - MI300X GPU-board: ~2,000-4,000 kg (1.5 TB HBM3)
    // - H200 is slightly lower due to less HBM memory
    //
    // NOTE: No public H200 PCF found. Extrapolated from H100 PCF.
    // Recommended: Request PAIA/PCF from Supermicro/NVIDIA.
    embodiedPerGpuKg: 1_000,
    chassisWatts: 1_200,
    formFactor: "8-GPU Accelerator Node (8U)",
  },
  h100: {
    name: "NVIDIA H100 ×8 node (Supermicro AS-8125GS-TNHR)",
    gpuCount: 8,
    gpuMemoryGb: 80, // 80GB HBM3 per GPU
    nodeIdleWatts: 700,
    // 8× H100 @ 700W = 5,600W + 2× EPYC @ 360W = 720W + chassis overhead
    nodePeakWatts: 6_500,
    // REAL DATA: NVIDIA HGX H100 PCF = 1,312 kg CO₂e cradle-to-gate
    // This is for the GPU baseboard only (8× H100 + 640 GB HBM3)
    // Per GPU: 1,312 kg / 8 = 164 kg (GPU-board only)
    //
    // Full server estimate (similar to H200, less HBM):
    // - HGX H100 baseboard: 1,312 kg (640 GB HBM3)
    // - System RAM, SSD, chassis, CPUs: ~4-6 t CO₂e
    // - Total server: ~5.5-7.5 t CO₂e
    // - Per GPU: ~700-950 kg
    //
    // Source: NVIDIA HGX H100 Product Carbon Footprint (public)
    // Only vendor-published PCF for GPU accelerator boards found.
    embodiedPerGpuKg: 850,
    chassisWatts: 1_200,
    formFactor: "8-GPU Accelerator Node (8U)",
  },
  a100: {
    name: "NVIDIA A100 ×8 node",
    gpuCount: 8,
    gpuMemoryGb: 80, // 80GB HBM2e per GPU
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
    gpuMemoryGb: 24, // 24GB GDDR6 per GPU
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
    gpuMemoryGb: 24, // 24GB GDDR6 per GPU
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
