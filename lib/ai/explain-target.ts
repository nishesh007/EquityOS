/**
 * Client-safe explain target types + seed prompt helper.
 * Server explain streaming lives in `@/lib/ai/explainEngine` (server-only).
 */

export type ExplainTargetType =
  | "ratio"
  | "financial_row"
  | "chart"
  | "technical"
  | "score";

export interface ExplainTarget {
  type: ExplainTargetType;
  key: string;
  label: string;
  value?: string | number | null;
  symbol: string;
  pageContext?: string | null;
  detail?: string | null;
}

/** Lightweight seed prompt for the AI workspace UI (no server I/O). */
export function buildExplainSeedPrompt(target: ExplainTarget): string {
  const value =
    target.value !== undefined && target.value !== null ? ` (${target.value})` : "";
  return `Explain ${target.label}${value} for ${target.symbol}`;
}
