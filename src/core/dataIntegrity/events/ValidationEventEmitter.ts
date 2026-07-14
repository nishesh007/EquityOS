/**
 * Normalizes and creates ValidationEvent instances for publishing.
 */

import type { ValidationEventConfiguration } from "./ValidationEventConfiguration";
import {
  createEventId,
  defaultSeverityForType,
  type ValidationEvent,
  type ValidationEventInput,
} from "./ValidationEventTypes";

export class ValidationEventEmitter {
  constructor(private readonly config: ValidationEventConfiguration) {}

  create<T = unknown>(input: ValidationEventInput<T>): ValidationEvent<T> {
    const eventType = input.eventType;
    return {
      eventId: input.eventId ?? createEventId(),
      timestamp: input.timestamp ?? new Date().toISOString(),
      eventType,
      module: input.module ?? "unknown",
      entityId: input.entityId,
      validationId: input.validationId,
      severity: input.severity ?? defaultSeverityForType(eventType),
      source: input.source ?? "validation-event-bus",
      correlationId: input.correlationId,
      payload: (input.payload ?? {}) as T,
      executionTimeMs: input.executionTimeMs,
      engineVersion: input.engineVersion ?? this.config.engineVersion,
    };
  }
}
