/**
 * Usage-pattern builder for demand curves.
 *
 * Encapsulates the 24-hour and 7-day weight profiles that drive
 * time-of-day CO₂ pricing and idle-cost allocation.
 */

export class UsagePattern {
  /** 24 hourly weights (00:00–23:00). */
  hourlyWeights: number[] = Array(24).fill(0.5);

  /** 7 weekday weights (Mon=0 … Sun=6). */
  weekdayWeights: number[] = [0.85, 0.9, 0.95, 0.9, 0.85, 0.4, 0.35];

  /** Hours below this weight are classified as "low period". */
  lowPeriodThreshold = 0.2;

  /** Effective CI multiplier during low-demand hours (reward batching). */
  lowPeriodCIFactor = 0.7;

  /** Effective CI multiplier during high-demand hours. */
  highPeriodCIFactor = 1.15;

  constructor() {}

  withHourlyWeights(weights: number[]): UsagePattern {
    if (weights.length !== 24) {
      throw new Error("hourlyWeights must have exactly 24 entries");
    }
    this.hourlyWeights = weights;
    return this;
  }

  withWeekdayWeights(weights: number[]): UsagePattern {
    if (weights.length !== 7) {
      throw new Error("weekdayWeights must have exactly 7 entries");
    }
    this.weekdayWeights = weights;
    return this;
  }

  withLowPeriodThreshold(t: number): UsagePattern {
    this.lowPeriodThreshold = t;
    return this;
  }

  withLowPeriodCIFactor(f: number): UsagePattern {
    this.lowPeriodCIFactor = f;
    return this;
  }

  withHighPeriodCIFactor(f: number): UsagePattern {
    this.highPeriodCIFactor = f;
    return this;
  }

  /** Returns true if the given hour-of-day is classified as low period. */
  isLowPeriod(hourOfDay: number): boolean {
    const idx = Math.max(0, Math.min(23, hourOfDay));
    return this.hourlyWeights[idx] <= this.lowPeriodThreshold;
  }

  /** Compute the effective CI factor for a specific hour. */
  getPeriodFactor(hourOfDay: number): number {
    return this.isLowPeriod(hourOfDay)
      ? this.lowPeriodCIFactor
      : this.highPeriodCIFactor;
  }
}
