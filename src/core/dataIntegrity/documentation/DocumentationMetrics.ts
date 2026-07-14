/**
 * Operational metrics for the documentation engine.
 */

export interface DocumentationHealthScore {
  apiCoverage: number;
  moduleCoverage: number;
  architectureCompleteness: number;
  developerGuideQuality: number;
  snapshotIntegrity: number;
  auditCompleteness: number;
  overall: number;
}

export interface DocumentationOperationalMetrics {
  documentsGenerated: number;
  apiDocs: number;
  moduleDocs: number;
  architectureDocs: number;
  guideDocs: number;
  documentationHealthScore: number;
  averageRuntimeMs: number;
  snapshotCount: number;
  lastRunAt: string | null;
}

export class DocumentationMetricsTracker {
  private documentsGenerated = 0;
  private apiDocs = 0;
  private moduleDocs = 0;
  private architectureDocs = 0;
  private guideDocs = 0;
  private documentationHealthScore = 0;
  private runtimeSum = 0;
  private runtimeCount = 0;
  private snapshotCount = 0;
  private lastRunAt: string | null = null;

  recordGeneration(input: {
    kind: "api" | "module" | "architecture" | "guide" | "other";
    runtimeMs: number;
    healthScore?: number;
  }): void {
    this.documentsGenerated += 1;
    if (input.kind === "api") this.apiDocs += 1;
    if (input.kind === "module") this.moduleDocs += 1;
    if (input.kind === "architecture") this.architectureDocs += 1;
    if (input.kind === "guide") this.guideDocs += 1;
    this.runtimeSum += input.runtimeMs;
    this.runtimeCount += 1;
    if (input.healthScore !== undefined) {
      this.documentationHealthScore = input.healthScore;
    }
    this.lastRunAt = new Date().toISOString();
  }

  setHealthScore(score: number): void {
    this.documentationHealthScore = score;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): DocumentationOperationalMetrics {
    return {
      documentsGenerated: this.documentsGenerated,
      apiDocs: this.apiDocs,
      moduleDocs: this.moduleDocs,
      architectureDocs: this.architectureDocs,
      guideDocs: this.guideDocs,
      documentationHealthScore: this.documentationHealthScore,
      averageRuntimeMs:
        this.runtimeCount === 0
          ? 0
          : round2(this.runtimeSum / this.runtimeCount),
      snapshotCount: this.snapshotCount,
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.documentsGenerated = 0;
    this.apiDocs = 0;
    this.moduleDocs = 0;
    this.architectureDocs = 0;
    this.guideDocs = 0;
    this.documentationHealthScore = 0;
    this.runtimeSum = 0;
    this.runtimeCount = 0;
    this.snapshotCount = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
