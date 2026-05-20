/**
 * Branded types for physical units to prevent accidental mixing at compile time.
 *
 * Following the pattern described in:
 * https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-aliases
 * with intersection types to create nominal typing.
 */

// --- Energy ---
export type Joules = number & { readonly __brand: "Joules" };
export type KilowattHours = number & { readonly __brand: "KilowattHours" };

export function joules(value: number): Joules {
  return value as Joules;
}

export function kilowattHours(value: number): KilowattHours {
  return value as KilowattHours;
}

export function joulesToKilowattHours(j: Joules): KilowattHours {
  return kilowattHours(j / 3_600_000);
}

export function kilowattHoursToJoules(kwh: KilowattHours): Joules {
  return joules(kwh * 3_600_000);
}

// --- Power ---
export type Watts = number & { readonly __brand: "Watts" };
export type Kilowatts = number & { readonly __brand: "Kilowatts" };

export function watts(value: number): Watts {
  return value as Watts;
}

export function kilowatts(value: number): Kilowatts {
  return value as Kilowatts;
}

export function wattsToKilowatts(w: Watts): Kilowatts {
  return kilowatts(w / 1_000);
}

// --- Duration ---
export type Seconds = number & { readonly __brand: "Seconds" };
export type Hours = number & { readonly __brand: "Hours" };

export function seconds(value: number): Seconds {
  return value as Seconds;
}

export function hours(value: number): Hours {
  return value as Hours;
}

export function secondsToHours(s: Seconds): Hours {
  return hours(s / 3_600);
}

export function hoursToSeconds(h: Hours): Seconds {
  return seconds(h * 3_600);
}

// --- Carbon ---
export type GramsCO2e = number & { readonly __brand: "GramsCO2e" };
export type KilogramsCO2e = number & { readonly __brand: "KilogramsCO2e" };
export type GramsCO2ePerToken = number & { readonly __brand: "GramsCO2ePerToken" };

export function gramsCO2e(value: number): GramsCO2e {
  return value as GramsCO2e;
}

export function kilogramsCO2e(value: number): KilogramsCO2e {
  return value as KilogramsCO2e;
}

export function gramsCO2ePerToken(value: number): GramsCO2ePerToken {
  return value as GramsCO2ePerToken;
}

export function gramsToKilogramsCO2e(g: GramsCO2e): KilogramsCO2e {
  return kilogramsCO2e(g / 1_000);
}

// --- Carbon Intensity ---
export type GramsCO2ePerKilowattHour = number & {
  readonly __brand: "GramsCO2ePerKilowattHour";
};

export function gramsCO2ePerKilowattHour(
  value: number,
): GramsCO2ePerKilowattHour {
  return value as GramsCO2ePerKilowattHour;
}

// --- FLOPs (Floating Point Operations) ---
export type Flops = number & { readonly __brand: "Flops" };
export type FlopsPerToken = number & { readonly __brand: "FlopsPerToken" };

export function flops(value: number): Flops {
  return value as Flops;
}

export function flopsPerToken(value: number): FlopsPerToken {
  return value as FlopsPerToken;
}

export function multiplyFlopsPerToken(
  fpt: FlopsPerToken,
  tokens: number,
): Flops {
  return flops(fpt * tokens);
}

// --- Model Parameters ---
export type ModelParameters = number & { readonly __brand: "ModelParameters" };

export function modelParameters(value: number): ModelParameters {
  return value as ModelParameters;
}

// --- Tokens ---
export type TokenCount = number & { readonly __brand: "TokenCount" };

export function tokenCount(value: number): TokenCount {
  return value as TokenCount;
}

// --- Efficiency / Architecture Factors ---
/**
 * Architecture-specific efficiency factor (0–1).
 * Higher means more efficient (fewer actual FLOPs needed per parameter).
 */
export type ArchitectureEfficiencyFactor = number & {
  readonly __brand: "ArchitectureEfficiencyFactor";
};

export function architectureEfficiencyFactor(
  value: number,
): ArchitectureEfficiencyFactor {
  if (value < 0 || value > 1) {
    throw new Error(
      `Architecture efficiency must be between 0 and 1, got ${value}`,
    );
  }
  return value as ArchitectureEfficiencyFactor;
}

// --- Helpers ---
export function addGramsCO2e(...values: GramsCO2e[]): GramsCO2e {
  return gramsCO2e(values.reduce((sum, v) => sum + v, 0));
}

export function divideGramsCO2e(
  numerator: GramsCO2e,
  denominator: number,
): GramsCO2e {
  return gramsCO2e(numerator / denominator);
}
