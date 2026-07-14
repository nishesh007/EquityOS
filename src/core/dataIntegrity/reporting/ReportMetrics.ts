/**
 * Operational metrics for the reporting engine.
 */

export interface ReportingOperationalMetrics {
  reportsGenerated: number;
  generationTime: number;
  averageGenerationTime: number;
  averageSize: number;
  snapshotCount: number;
  exportModelCount: number;
  templateUsage: Record<string, number>;
  lastGeneratedAt: string | null;
}

export class ReportMetricsTracker {
  private reportsGenerated = 0;
  private generationTimeSum = 0;
  private lastGenerationTime = 0;
  private sizeSum = 0;
  private snapshotCount = 0;
  private exportModelCount = 0;
  private readonly templateUsage: Record<string, number> = {};
  private lastGeneratedAt: string | null = null;

  recordGeneration(input: {
    runtimeMs: number;
    sizeBytes: number;
    reportType: string;
  }): void {
    this.reportsGenerated += 1;
    this.generationTimeSum += input.runtimeMs;
    this.lastGenerationTime = input.runtimeMs;
    this.sizeSum += input.sizeBytes;
    this.templateUsage[input.reportType] =
      (this.templateUsage[input.reportType] ?? 0) + 1;
    this.lastGeneratedAt = new Date().toISOString();
  }

  recordExport(): void {
    this.exportModelCount += 1;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): ReportingOperationalMetrics {
    return {
      reportsGenerated: this.reportsGenerated,
      generationTime: this.lastGenerationTime,
      averageGenerationTime:
        this.reportsGenerated === 0
          ? 0
          : round2(this.generationTimeSum / this.reportsGenerated),
      averageSize:
        this.reportsGenerated === 0
          ? 0
          : round2(this.sizeSum / this.reportsGenerated),
      snapshotCount: this.snapshotCount,
      exportModelCount: this.exportModelCount,
      templateUsage: { ...this.templateUsage },
      lastGeneratedAt: this.lastGeneratedAt,
    };
  }

  reset(): void {
    this.reportsGenerated = 0;
    this.generationTimeSum = 0;
    this.lastGenerationTime = 0;
    this.sizeSum = 0;
    this.snapshotCount = 0;
    this.exportModelCount = 0;
    this.lastGeneratedAt = null;
    for (const key of Object.keys(this.templateUsage)) {
      delete this.templateUsage[key];
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
