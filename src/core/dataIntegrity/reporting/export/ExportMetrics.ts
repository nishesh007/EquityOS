/**
 * Export operational metrics (Prompt 9F.R1).
 */

export interface ExportOperationalMetrics {
  pdfExports: number;
  excelExports: number;
  markdownExports: number;
  prints: number;
  failures: number;
  averageExportTimeMs: number;
  lastExportAt: string | null;
  lastFormat: string | null;
}

export class ExportMetricsTracker {
  private pdfExports = 0;
  private excelExports = 0;
  private markdownExports = 0;
  private prints = 0;
  private failures = 0;
  private timeSum = 0;
  private successCount = 0;
  private lastExportAt: string | null = null;
  private lastFormat: string | null = null;

  recordSuccess(format: string, executionTimeMs: number): void {
    const key = format.toUpperCase();
    if (key === "PDF") this.pdfExports += 1;
    else if (key === "EXCEL") this.excelExports += 1;
    else if (key === "MARKDOWN") this.markdownExports += 1;
    else if (key === "PRINT") this.prints += 1;

    this.successCount += 1;
    this.timeSum += Math.max(0, executionTimeMs);
    this.lastExportAt = new Date().toISOString();
    this.lastFormat = key;
  }

  recordFailure(format?: string): void {
    this.failures += 1;
    this.lastExportAt = new Date().toISOString();
    if (format) this.lastFormat = format.toUpperCase();
  }

  getMetrics(): ExportOperationalMetrics {
    return {
      pdfExports: this.pdfExports,
      excelExports: this.excelExports,
      markdownExports: this.markdownExports,
      prints: this.prints,
      failures: this.failures,
      averageExportTimeMs:
        this.successCount === 0
          ? 0
          : round2(this.timeSum / this.successCount),
      lastExportAt: this.lastExportAt,
      lastFormat: this.lastFormat,
    };
  }

  reset(): void {
    this.pdfExports = 0;
    this.excelExports = 0;
    this.markdownExports = 0;
    this.prints = 0;
    this.failures = 0;
    this.timeSum = 0;
    this.successCount = 0;
    this.lastExportAt = null;
    this.lastFormat = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
