/**
 * Audit logger for event bus dispatch and replay operations.
 */

export interface EventBusAuditEntry {
  timestamp: string;
  action:
    | "PUBLISH"
    | "DISPATCH"
    | "REPLAY"
    | "SUBSCRIBE"
    | "UNSUBSCRIBE"
    | "OVERFLOW"
    | "FAILURE";
  eventId?: string;
  eventType?: string;
  subscribers?: number;
  dispatchTimeMs?: number;
  failures?: number;
  retries?: number;
  message?: string;
  engineVersion: string;
}

export class ValidationEventAuditLogger {
  private readonly entries: EventBusAuditEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  setMaxEntries(n: number): void {
    this.maxEntries = n;
  }

  append(entry: EventBusAuditEntry): EventBusAuditEntry {
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    return entry;
  }

  getLog(limit?: number): EventBusAuditEntry[] {
    if (limit === undefined) return [...this.entries];
    return this.entries.slice(-limit);
  }

  reset(): void {
    this.entries.length = 0;
  }
}
