/**
 * Operational metrics for the Institutional Earnings Data Engine.
 */

export interface EarningsOperationalMetrics {
  loads: number;
  normalizations: number;
  validationsPassed: number;
  validationsRejected: number;
  aggregations: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  averageRuntimeMs: number;
  lastLoadAt: string | null;
}

export class EarningsMetricsTracker {
  private loads = 0;
  private normalizations = 0;
  private validationsPassed = 0;
  private validationsRejected = 0;
  private aggregations = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private errors = 0;
  private runtimeSum = 0;
  private runtimeCount = 0;
  private lastLoadAt: string | null = null;

  recordLoad(runtimeMs: number): void {
    this.loads += 1;
    this.runtimeSum += runtimeMs;
    this.runtimeCount += 1;
    this.lastLoadAt = new Date().toISOString();
  }

  recordNormalization(): void {
    this.normalizations += 1;
  }

  recordValidation(passed: boolean): void {
    if (passed) this.validationsPassed += 1;
    else this.validationsRejected += 1;
  }

  recordAggregation(): void {
    this.aggregations += 1;
  }

  recordCacheHit(): void {
    this.cacheHits += 1;
  }

  recordCacheMiss(): void {
    this.cacheMisses += 1;
  }

  recordError(): void {
    this.errors += 1;
  }

  getMetrics(): EarningsOperationalMetrics {
    return {
      loads: this.loads,
      normalizations: this.normalizations,
      validationsPassed: this.validationsPassed,
      validationsRejected: this.validationsRejected,
      aggregations: this.aggregations,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      errors: this.errors,
      averageRuntimeMs:
        this.runtimeCount === 0
          ? 0
          : round2(this.runtimeSum / this.runtimeCount),
      lastLoadAt: this.lastLoadAt,
    };
  }

  reset(): void {
    this.loads = 0;
    this.normalizations = 0;
    this.validationsPassed = 0;
    this.validationsRejected = 0;
    this.aggregations = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.errors = 0;
    this.runtimeSum = 0;
    this.runtimeCount = 0;
    this.lastLoadAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
