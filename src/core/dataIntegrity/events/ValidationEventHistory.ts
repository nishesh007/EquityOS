/**
 * Event history store with retention policy and categorized views.
 */

import type { ValidationEventConfiguration } from "./ValidationEventConfiguration";
import type { ValidationEvent } from "./ValidationEventTypes";
import type { ValidationEventFilters } from "./ValidationEventFilters";
import { eventMatchesFilters } from "./ValidationEventFilters";

export class ValidationEventHistory {
  private readonly events: ValidationEvent[] = [];
  private readonly replayBuffer: ValidationEvent[] = [];

  constructor(private config: ValidationEventConfiguration) {}

  updateConfig(config: ValidationEventConfiguration): void {
    this.config = config;
  }

  append(event: ValidationEvent): void {
    this.events.push(event);
    this.replayBuffer.push(event);
    this.enforceRetention();
  }

  getRecent(limit = 50): ValidationEvent[] {
    return this.events.slice(-limit);
  }

  getAll(): ValidationEvent[] {
    return [...this.events];
  }

  getFailed(): ValidationEvent[] {
    return this.events.filter(
      (e) =>
        e.eventType === "ValidationFailed" ||
        e.eventType === "PipelineFailed" ||
        e.severity === "ERROR" ||
        e.severity === "CRITICAL"
    );
  }

  getCritical(): ValidationEvent[] {
    return this.events.filter(
      (e) =>
        e.severity === "CRITICAL" || e.eventType === "CriticalFailure"
    );
  }

  query(filters?: ValidationEventFilters): ValidationEvent[] {
    return this.events.filter((e) => eventMatchesFilters(e, filters));
  }

  getById(eventId: string): ValidationEvent | undefined {
    return this.events.find((e) => e.eventId === eventId);
  }

  getByValidationId(validationId: string): ValidationEvent[] {
    return this.events.filter((e) => e.validationId === validationId);
  }

  getReplayBuffer(): ValidationEvent[] {
    return [...this.replayBuffer];
  }

  clear(): void {
    this.events.length = 0;
    this.replayBuffer.length = 0;
  }

  get size(): number {
    return this.events.length;
  }

  private enforceRetention(): void {
    const cutoff = Date.now() - this.config.retentionPeriodMs;
    while (
      this.events.length > 0 &&
      new Date(this.events[0]!.timestamp).getTime() < cutoff
    ) {
      this.events.shift();
    }
    while (this.events.length > this.config.maxHistoryEntries) {
      this.events.shift();
    }
    while (this.replayBuffer.length > this.config.replayBufferSize) {
      this.replayBuffer.shift();
    }
  }
}
