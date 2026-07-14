/**
 * Event replay engine — by ID, validation ID, time range, failed/critical.
 */

import type { ValidationEvent } from "./ValidationEventTypes";
import type { ValidationEventHistory } from "./ValidationEventHistory";
import type { ValidationEventFilters } from "./ValidationEventFilters";
import { eventMatchesFilters } from "./ValidationEventFilters";

export type ReplayMode =
  | "EVENT_ID"
  | "VALIDATION_ID"
  | "TIME_RANGE"
  | "FAILED"
  | "CRITICAL"
  | "FILTERED";

export interface ReplayRequest {
  mode: ReplayMode;
  eventId?: string;
  validationId?: string;
  dateFrom?: string;
  dateTo?: string;
  filters?: ValidationEventFilters;
  limit?: number;
}

export interface ReplayResult {
  request: ReplayRequest;
  events: ValidationEvent[];
  replayedAt: string;
  count: number;
}

export class ValidationEventReplay {
  constructor(private readonly history: ValidationEventHistory) {}

  select(request: ReplayRequest): ValidationEvent[] {
    let events: ValidationEvent[] = [];

    switch (request.mode) {
      case "EVENT_ID": {
        const found = request.eventId
          ? this.history.getById(request.eventId)
          : undefined;
        events = found ? [found] : [];
        break;
      }
      case "VALIDATION_ID": {
        events = request.validationId
          ? this.history.getByValidationId(request.validationId)
          : [];
        break;
      }
      case "TIME_RANGE": {
        events = this.history.query({
          dateFrom: request.dateFrom,
          dateTo: request.dateTo,
          ...request.filters,
        });
        break;
      }
      case "FAILED":
        events = this.history
          .getFailed()
          .filter((e) => eventMatchesFilters(e, request.filters));
        break;
      case "CRITICAL":
        events = this.history
          .getCritical()
          .filter((e) => eventMatchesFilters(e, request.filters));
        break;
      case "FILTERED":
        events = this.history.query(request.filters);
        break;
      default:
        events = [];
    }

    if (request.limit !== undefined) {
      events = events.slice(-request.limit);
    }
    return events;
  }

  replay(request: ReplayRequest): ReplayResult {
    const events = this.select(request);
    return {
      request,
      events,
      replayedAt: new Date().toISOString(),
      count: events.length,
    };
  }
}
