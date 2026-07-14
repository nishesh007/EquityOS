/**
 * Filters for event subscription and history queries.
 */

import type {
  ValidationEvent,
  ValidationEventSeverity,
  ValidationEventType,
} from "./ValidationEventTypes";

export interface ValidationEventFilters {
  module?: string | string[];
  severity?: ValidationEventSeverity | ValidationEventSeverity[];
  eventType?: ValidationEventType | ValidationEventType[];
  validationId?: string;
  stock?: string;
  sector?: string;
  exchange?: string;
  recommendation?: string;
  dateFrom?: string;
  dateTo?: string;
  trustClassification?: string;
  entityId?: string;
  correlationId?: string;
  source?: string;
}

export function normalizeEventFilters(
  input?: ValidationEventFilters
): ValidationEventFilters {
  if (!input) return {};
  return { ...input };
}

function matchesList(
  value: string | undefined,
  filter: string | string[] | undefined
): boolean {
  if (!filter) return true;
  if (!value) return false;
  const list = Array.isArray(filter) ? filter : [filter];
  return list.some((f) => f.toLowerCase() === value.toLowerCase());
}

export function eventMatchesFilters(
  event: ValidationEvent,
  filters?: ValidationEventFilters
): boolean {
  if (!filters || Object.keys(filters).length === 0) return true;

  if (!matchesList(event.module, filters.module)) return false;
  if (!matchesList(event.severity, filters.severity)) return false;
  if (!matchesList(event.eventType, filters.eventType)) return false;
  if (!matchesList(event.validationId, filters.validationId)) return false;
  if (!matchesList(event.entityId, filters.entityId)) return false;
  if (!matchesList(event.correlationId, filters.correlationId)) return false;
  if (!matchesList(event.source, filters.source)) return false;

  const payload =
    event.payload && typeof event.payload === "object"
      ? (event.payload as Record<string, unknown>)
      : {};

  const stock = stringField(payload, ["stock", "symbol", "ticker"]);
  const sector = stringField(payload, ["sector"]);
  const exchange = stringField(payload, ["exchange"]);
  const recommendation = stringField(payload, [
    "recommendation",
    "action",
    "recommendationType",
  ]);
  const trustClassification = stringField(payload, [
    "trustClassification",
    "classification",
  ]);

  if (!matchesList(stock, filters.stock)) return false;
  if (!matchesList(sector, filters.sector)) return false;
  if (!matchesList(exchange, filters.exchange)) return false;
  if (!matchesList(recommendation, filters.recommendation)) return false;
  if (!matchesList(trustClassification, filters.trustClassification)) {
    return false;
  }

  const t = new Date(event.timestamp).getTime();
  if (filters.dateFrom && t < new Date(filters.dateFrom).getTime()) {
    return false;
  }
  if (filters.dateTo && t > new Date(filters.dateTo).getTime()) {
    return false;
  }

  return true;
}

function stringField(
  obj: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return undefined;
}
