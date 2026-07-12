/**
 * Sprint 9D — AI Screener filter operator evaluation.
 */

import type { FilterCondition, FilterOperator } from "@/lib/screener/types";

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toString(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase().trim();
}

export function evaluateOperator(
  operator: FilterOperator,
  fieldValue: number | string | null,
  conditionValue: number | string,
  conditionValueTo?: number
): boolean {
  if (fieldValue === null || fieldValue === undefined) return false;

  switch (operator) {
    case "gt": {
      const left = toNumber(fieldValue);
      const right = toNumber(conditionValue);
      return left !== null && right !== null && left > right;
    }
    case "lt": {
      const left = toNumber(fieldValue);
      const right = toNumber(conditionValue);
      return left !== null && right !== null && left < right;
    }
    case "eq": {
      if (typeof fieldValue === "string" || typeof conditionValue === "string") {
        return toString(fieldValue) === toString(conditionValue);
      }
      const left = toNumber(fieldValue);
      const right = toNumber(conditionValue);
      return left !== null && right !== null && Math.abs(left - right) < 0.0001;
    }
    case "gte": {
      const left = toNumber(fieldValue);
      const right = toNumber(conditionValue);
      return left !== null && right !== null && left >= right;
    }
    case "lte": {
      const left = toNumber(fieldValue);
      const right = toNumber(conditionValue);
      return left !== null && right !== null && left <= right;
    }
    case "between": {
      const left = toNumber(fieldValue);
      const min = toNumber(conditionValue);
      const max = toNumber(conditionValueTo);
      return left !== null && min !== null && max !== null && left >= min && left <= max;
    }
    case "contains":
      return toString(fieldValue).includes(toString(conditionValue));
    case "starts_with":
      return toString(fieldValue).startsWith(toString(conditionValue));
    case "ends_with":
      return toString(fieldValue).endsWith(toString(conditionValue));
    default:
      return false;
  }
}

export function evaluateCondition(
  condition: FilterCondition,
  getMetric: (key: string) => number | string | null
): boolean {
  const fieldValue = getMetric(condition.filterKey);
  return evaluateOperator(
    condition.operator,
    fieldValue,
    condition.value,
    condition.valueTo
  );
}
