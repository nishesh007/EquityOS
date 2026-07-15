/**
 * Institutional AI Screener — operational metrics (Sprint 9D.R1).
 */

export interface ScreenOperationalMetrics {
  symbolsScanned: number;
  matches: number;
  scanTimeMs: number;
  cacheHit: number;
  cacheMiss: number;
  averageConfidence: number;
  runs: number;
  lastScanAt: string | null;
}

export class ScreenMetricsTracker {
  private symbolsScanned = 0;
  private matches = 0;
  private scanTimeSum = 0;
  private scanTimeCount = 0;
  private lastScanTimeMs = 0;
  private cacheHit = 0;
  private cacheMiss = 0;
  private confidenceSum = 0;
  private confidenceCount = 0;
  private runs = 0;
  private lastScanAt: string | null = null;

  recordScan(input: {
    symbolsScanned: number;
    matches: number;
    scanTimeMs: number;
    fromCache: boolean;
    averageConfidence?: number;
  }): void {
    this.runs += 1;
    this.symbolsScanned += Math.max(0, Math.floor(input.symbolsScanned));
    this.matches += Math.max(0, Math.floor(input.matches));
    if (Number.isFinite(input.scanTimeMs)) {
      this.scanTimeSum += input.scanTimeMs;
      this.scanTimeCount += 1;
      this.lastScanTimeMs = input.scanTimeMs;
    }
    if (input.fromCache) this.cacheHit += 1;
    else this.cacheMiss += 1;
    if (
      input.averageConfidence != null &&
      Number.isFinite(input.averageConfidence)
    ) {
      this.confidenceSum += input.averageConfidence;
      this.confidenceCount += 1;
    }
    this.lastScanAt = new Date().toISOString();
  }

  getMetrics(): ScreenOperationalMetrics {
    return {
      symbolsScanned: this.symbolsScanned,
      matches: this.matches,
      scanTimeMs: this.lastScanTimeMs,
      cacheHit: this.cacheHit,
      cacheMiss: this.cacheMiss,
      averageConfidence:
        this.confidenceCount === 0
          ? 0
          : round2(this.confidenceSum / this.confidenceCount),
      runs: this.runs,
      lastScanAt: this.lastScanAt,
    };
  }

  /** Average scan time across all recorded runs (for tests / diagnostics). */
  getAverageScanTimeMs(): number {
    return this.scanTimeCount === 0
      ? 0
      : round2(this.scanTimeSum / this.scanTimeCount);
  }

  reset(): void {
    this.symbolsScanned = 0;
    this.matches = 0;
    this.scanTimeSum = 0;
    this.scanTimeCount = 0;
    this.lastScanTimeMs = 0;
    this.cacheHit = 0;
    this.cacheMiss = 0;
    this.confidenceSum = 0;
    this.confidenceCount = 0;
    this.runs = 0;
    this.lastScanAt = null;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
