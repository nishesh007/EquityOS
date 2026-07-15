/**
 * Institutional AI Alert Engine — operational metrics (Sprint 9C.R1).
 */

export interface AlertOperationalMetrics {
  generated: number;
  active: number;
  expired: number;
  dismissed: number;
  grouped: number;
  deduplicated: number;
  suppressed: number;
  archived: number;
  averageConfidence: number;
  averageProcessingTimeMs: number;
  lastGeneratedAt: string | null;
}

export class AlertMetricsTracker {
  private generated = 0;
  private active = 0;
  private expired = 0;
  private dismissed = 0;
  private grouped = 0;
  private deduplicated = 0;
  private suppressed = 0;
  private archived = 0;
  private confidenceSum = 0;
  private confidenceCount = 0;
  private processingSum = 0;
  private processingCount = 0;
  private lastGeneratedAt: string | null = null;

  recordGenerated(input: {
    confidence: number;
    processingTimeMs: number;
  }): void {
    this.generated += 1;
    this.active += 1;
    if (Number.isFinite(input.confidence)) {
      this.confidenceSum += input.confidence;
      this.confidenceCount += 1;
    }
    if (Number.isFinite(input.processingTimeMs)) {
      this.processingSum += input.processingTimeMs;
      this.processingCount += 1;
    }
    this.lastGeneratedAt = new Date().toISOString();
  }

  recordDeduplicated(): void {
    this.deduplicated += 1;
  }

  recordGrouped(): void {
    this.grouped += 1;
  }

  recordSuppressed(): void {
    this.suppressed += 1;
  }

  recordDismissed(): void {
    this.dismissed += 1;
    this.active = Math.max(0, this.active - 1);
  }

  recordExpired(): void {
    this.expired += 1;
    this.active = Math.max(0, this.active - 1);
  }

  recordArchived(): void {
    this.archived += 1;
    this.active = Math.max(0, this.active - 1);
  }

  /** Recalculate active from an authoritative count (e.g. after sweep). */
  setActiveCount(count: number): void {
    this.active = Math.max(0, Math.floor(count));
  }

  getMetrics(): AlertOperationalMetrics {
    return {
      generated: this.generated,
      active: this.active,
      expired: this.expired,
      dismissed: this.dismissed,
      grouped: this.grouped,
      deduplicated: this.deduplicated,
      suppressed: this.suppressed,
      archived: this.archived,
      averageConfidence:
        this.confidenceCount === 0
          ? 0
          : round2(this.confidenceSum / this.confidenceCount),
      averageProcessingTimeMs:
        this.processingCount === 0
          ? 0
          : round2(this.processingSum / this.processingCount),
      lastGeneratedAt: this.lastGeneratedAt,
    };
  }

  reset(): void {
    this.generated = 0;
    this.active = 0;
    this.expired = 0;
    this.dismissed = 0;
    this.grouped = 0;
    this.deduplicated = 0;
    this.suppressed = 0;
    this.archived = 0;
    this.confidenceSum = 0;
    this.confidenceCount = 0;
    this.processingSum = 0;
    this.processingCount = 0;
    this.lastGeneratedAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
