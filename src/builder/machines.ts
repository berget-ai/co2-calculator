/**
 * Fluent builder API for describing compute infrastructure.
 *
 * These classes wrap the low-level `ComputeInfrastructure` types with
 * sensible defaults and ergonomic factory methods so that customers
 * can model their data center without memorising every field.
 *
 * Example:
 * ```typescript
 * const machines = [
 *   new Machine().withGPU("NVIDIA", "A100", 8),
 *   new Server().withCPUs(96, 2),
 *   new NetworkSwitch().withPorts(48),
 *   new Storage().withDrives(16),
 * ];
 * ```
 */

import type { GPUNode, HardwareComponent } from "../infrastructure-types";

// ---------------------------------------------------------------------------
// GPU
// ---------------------------------------------------------------------------

export class GPU {
  private config: Partial<GPUNode> = {};

  constructor(
    private manufacturer: string,
    private model: string,
  ) {}

  count(n: number): GPU {
    this.config.count = n;
    return this;
  }

  powerWatts(w: number): GPU {
    this.config.powerRatingWattsPerGPU = w;
    return this;
  }

  utilizationRate(r: number): GPU {
    this.config.utilizationRate = r;
    return this;
  }

  operationalHours(h: number): GPU {
    this.config.operationalHoursPerDay = h;
    return this;
  }

  condition(c: "new" | "refurbished" | "existing"): GPU {
    this.config.condition = c;
    return this;
  }

  embodiedCarbonKg(kg: number): GPU {
    this.config.embodiedCarbonKgCO2e = kg;
    return this;
  }

  ageYears(y: number): GPU {
    this.config.ageYears = y;
    return this;
  }

  shared(totalGPUs: number, allocatedGPUs: number, sharedWith?: string[]): GPU {
    this.config.shared = { totalGPUs, allocatedGPUs, sharedWith };
    return this;
  }

  build(id?: string): GPUNode {
    return {
      id: id ?? `gpu-${this.model}-${Date.now()}`,
      manufacturer: this.manufacturer,
      model: this.model,
      count: this.config.count ?? 1,
      powerRatingWattsPerGPU: this.config.powerRatingWattsPerGPU ?? 400,
      utilizationRate: this.config.utilizationRate ?? 0.8,
      operationalHoursPerDay: this.config.operationalHoursPerDay ?? 24,
      condition: this.config.condition ?? "new",
      ageYears: this.config.ageYears,
      embodiedCarbonKgCO2e: this.config.embodiedCarbonKgCO2e,
      shared: this.config.shared,
    };
  }
}

// ---------------------------------------------------------------------------
// Factory presets
// ---------------------------------------------------------------------------

export class NVIDIA extends GPU {
  constructor(model: string) {
    super("NVIDIA", model);
  }
}
export class AMD extends GPU {
  constructor(model: string) {
    super("AMD", model);
  }
}

export function a100(count = 1): GPU {
  return new NVIDIA("A100").count(count).powerWatts(400).embodiedCarbonKg(1600);
}

export function h100(count = 1): GPU {
  return new NVIDIA("H100").count(count).powerWatts(700).embodiedCarbonKg(2000);
}

export function l40s(count = 1): GPU {
  return new NVIDIA("L40S").count(count).powerWatts(350).embodiedCarbonKg(1200);
}

export function rtx4090(count = 1): GPU {
  return new NVIDIA("RTX 4090").count(count).powerWatts(450).embodiedCarbonKg(1500);
}

export function mi300x(count = 1): GPU {
  return new AMD("MI300X").count(count).powerWatts(750).embodiedCarbonKg(1800);
}

// ---------------------------------------------------------------------------
// Server (CPU + RAM compute host)
// ---------------------------------------------------------------------------

export interface ServerOptions {
  cpuCores?: number;
  cpuSockets?: number;
  ramGB?: number;
  powerWatts?: number;
  utilizationRate?: number;
  operationalHoursPerDay?: number;
  condition?: "new" | "refurbished" | "existing";
  embodiedCarbonKg?: number;
  ageYears?: number;
  manufacturer?: string;
  model?: string;
}

export class Server {
  private options: ServerOptions = {};

  cpus(cores: number, sockets = 2): Server {
    this.options.cpuCores = cores * sockets;
    this.options.cpuSockets = sockets;
    return this;
  }

  ram(gb: number): Server {
    this.options.ramGB = gb;
    return this;
  }

  powerWatts(w: number): Server {
    this.options.powerWatts = w;
    return this;
  }

  utilizationRate(r: number): Server {
    this.options.utilizationRate = r;
    return this;
  }

  operationalHours(h: number): Server {
    this.options.operationalHoursPerDay = h;
    return this;
  }

  condition(c: "new" | "refurbished" | "existing"): Server {
    this.options.condition = c;
    return this;
  }

  embodiedCarbonKg(kg: number): Server {
    this.options.embodiedCarbonKg = kg;
    return this;
  }

  ageYears(y: number): Server {
    this.options.ageYears = y;
    return this;
  }

  manufacturer(m: string): Server {
    this.options.manufacturer = m;
    return this;
  }

  modelName(m: string): Server {
    this.options.model = m;
    return this;
  }

  build(): HardwareComponent {
    const p = this.options;
    return {
      type: "server",
      manufacturer: p.manufacturer ?? "Generic",
      model: p.model ?? "1U Server",
      powerRatingWatts: p.powerWatts ?? 500,
      utilizationRate: p.utilizationRate ?? 0.7,
      operationalHoursPerDay: p.operationalHoursPerDay ?? 24,
      condition: p.condition ?? "new",
      ageYears: p.ageYears,
      embodiedCarbonKgCO2e: p.embodiedCarbonKg ?? 1500,
    };
  }
}

export function generic1U(): Server {
  return new Server().cpus(64, 2).ram(512).powerWatts(500).embodiedCarbonKg(1500);
}

export function generic2U(): Server {
  return new Server().cpus(96, 2).ram(1024).powerWatts(800).embodiedCarbonKg(2000);
}

// ---------------------------------------------------------------------------
// Network Switch
// ---------------------------------------------------------------------------

export class NetworkSwitch {
  private powerWattsField = 50;
  private utilizationRateField = 0.6;
  private operationalHoursPerDayField = 24;
  private conditionField: "new" | "refurbished" | "existing" = "new";
  private embodiedCarbonKgField = 200;
  private ageYearsField?: number;
  private tierField: "edge" | "core" | "datacenter" = "datacenter";

  withPorts(_n: number): NetworkSwitch {
    return this;
  }

  powerWatts(w: number): NetworkSwitch {
    this.powerWattsField = w;
    return this;
  }

  utilizationRate(r: number): NetworkSwitch {
    this.utilizationRateField = r;
    return this;
  }

  operationalHours(h: number): NetworkSwitch {
    this.operationalHoursPerDayField = h;
    return this;
  }

  condition(c: "new" | "refurbished" | "existing"): NetworkSwitch {
    this.conditionField = c;
    return this;
  }

  embodiedCarbonKg(kg: number): NetworkSwitch {
    this.embodiedCarbonKgField = kg;
    return this;
  }

  ageYears(y: number): NetworkSwitch {
    this.ageYearsField = y;
    return this;
  }

  tier(t: "edge" | "core" | "datacenter"): NetworkSwitch {
    this.tierField = t;
    return this;
  }

  build(): HardwareComponent & { tier: string } {
    return {
      type: "network",
      powerRatingWatts: this.powerWattsField,
      utilizationRate: this.utilizationRateField,
      operationalHoursPerDay: this.operationalHoursPerDayField,
      condition: this.conditionField,
      ageYears: this.ageYearsField,
      embodiedCarbonKgCO2e: this.embodiedCarbonKgField,
      tier: this.tierField,
    };
  }
}

export function genericSwitch(): NetworkSwitch {
  return new NetworkSwitch().withPorts(48).powerWatts(50).embodiedCarbonKg(200);
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export class Storage {
  private powerWattsField = 30;
  private utilizationRateField = 0.5;
  private operationalHoursPerDayField = 24;
  private conditionField: "new" | "refurbished" | "existing" = "new";
  private embodiedCarbonKgField = 300;
  private ageYearsField?: number;

  drives(_n: number): Storage {
    return this;
  }

  type(_t: "SSD" | "HDD" | "NVMe"): Storage {
    return this;
  }

  capacityTB(_tb: number): Storage {
    return this;
  }

  powerWatts(w: number): Storage {
    this.powerWattsField = w;
    return this;
  }

  utilizationRate(r: number): Storage {
    this.utilizationRateField = r;
    return this;
  }

  operationalHours(h: number): Storage {
    this.operationalHoursPerDayField = h;
    return this;
  }

  condition(c: "new" | "refurbished" | "existing"): Storage {
    this.conditionField = c;
    return this;
  }

  embodiedCarbonKg(kg: number): Storage {
    this.embodiedCarbonKgField = kg;
    return this;
  }

  ageYears(y: number): Storage {
    this.ageYearsField = y;
    return this;
  }

  build(): HardwareComponent {
    return {
      type: "storage",
      powerRatingWatts: this.powerWattsField,
      utilizationRate: this.utilizationRateField,
      operationalHoursPerDay: this.operationalHoursPerDayField,
      condition: this.conditionField,
      ageYears: this.ageYearsField,
      embodiedCarbonKgCO2e: this.embodiedCarbonKgField,
    };
  }
}

export function genericStorage(): Storage {
  return new Storage().drives(12).type("NVMe").capacityTB(200).powerWatts(30).embodiedCarbonKg(300);
}
