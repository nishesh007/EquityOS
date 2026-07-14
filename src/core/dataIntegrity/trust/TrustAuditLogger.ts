/**
 * Audit logger for Institutional Trust Score calculations.
 */

export interface TrustAuditEntry {
  trustScore: number;
  timestamp: string;
  objectId: string;
  objectType?: string;
  contributingModules: string[];
  weightDistribution: Record<string, number>;
  warnings: string[];
  engineVersion: string;
  classification: string;
  adjustmentsApplied: number;
  bonusesApplied: number;
}

export class TrustAuditLogger {
  private readonly entries: TrustAuditEntry[] = [];

  append(entry: TrustAuditEntry): TrustAuditEntry {
    this.entries.push(entry);
    return entry;
  }

  getLog(objectId?: string): TrustAuditEntry[] {
    if (!objectId) return [...this.entries];
    return this.entries.filter((e) => e.objectId === objectId);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
