/**
 * Per-object Institutional Trust Score history store.
 */

import type { TrustSnapshot } from "./TrustSnapshot";
import type { TrustConfiguration } from "./TrustConfiguration";
import type { TrustClassificationLabel } from "./TrustClassification";

export interface TrustHistoryEntry {
  timestamp: string;
  trustScore: number;
  trustClassification: TrustClassificationLabel;
  validationSummary?: string;
  moduleScores: Record<string, number>;
  warnings: string[];
  failedRules: string[];
  historicalSnapshot: TrustSnapshot;
}

export class TrustHistoryStore {
  private readonly byObject = new Map<string, TrustHistoryEntry[]>();

  constructor(private readonly config: TrustConfiguration) {}

  append(objectId: string, entry: TrustHistoryEntry): string {
    const list = this.byObject.get(objectId) ?? [];
    list.push(entry);
    const max = this.config.maxHistoryEntries;
    if (list.length > max) {
      list.splice(0, list.length - max);
    }
    this.byObject.set(objectId, list);
    return entry.historicalSnapshot.snapshotId;
  }

  getHistory(objectId: string): TrustHistoryEntry[] {
    return [...(this.byObject.get(objectId) ?? [])];
  }

  getLatest(objectId: string): TrustHistoryEntry | undefined {
    const list = this.byObject.get(objectId);
    if (!list || list.length === 0) return undefined;
    return list[list.length - 1];
  }

  clear(objectId?: string): void {
    if (objectId) {
      this.byObject.delete(objectId);
      return;
    }
    this.byObject.clear();
  }

  objectIds(): string[] {
    return [...this.byObject.keys()];
  }
}
