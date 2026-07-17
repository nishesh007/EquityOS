/**
 * Sprint 10C.R4 — pure cell formatting for institutional tables.
 * Reuses the app-wide formatters; adds tone/arrow semantics per cell kind.
 * No calculations beyond display formatting.
 */

import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatPrice,
} from "@/lib/utils";
import type { CellKind } from "@/src/design/tables/tableEngine";

export type CellTone = "positive" | "negative" | "warning" | "neutral";

export interface RenderedCell {
  /** Display text (already formatted). */
  text: string;
  tone: CellTone;
  align: "left" | "right";
  /** Trend arrow direction, when applicable. */
  arrow: "up" | "down" | null;
}

export interface RenderCellOptions {
  /** Compact currency (₹1.2L / ₹3.4Cr). Defaults to true for `currency`. */
  compact?: boolean;
  decimals?: number;
}

const RISK_TONES: Record<string, CellTone> = {
  low: "positive",
  minimal: "positive",
  moderate: "warning",
  medium: "warning",
  high: "negative",
  extreme: "negative",
  critical: "negative",
};

const STATUS_TONES: Record<string, CellTone> = {
  active: "positive",
  healthy: "positive",
  passed: "positive",
  excellent: "positive",
  stable: "positive",
  valid: "positive",
  open: "positive",
  idle: "neutral",
  pending: "warning",
  warning: "warning",
  degraded: "warning",
  needs_attention: "warning",
  expired: "negative",
  failed: "negative",
  critical: "negative",
  offline: "negative",
  error: "negative",
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function formatDateText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Public API — format a raw value for a given cell kind.
 * Pure function: returns text, tone, alignment and trend arrow metadata.
 */
export function renderCell(
  kind: CellKind,
  value: unknown,
  options: RenderCellOptions = {}
): RenderedCell {
  const num = asFiniteNumber(value);

  switch (kind) {
    case "price": {
      if (num === null) return missing("right");
      return {
        text: formatPrice(num, options.decimals ?? 2),
        tone: "neutral",
        align: "right",
        arrow: null,
      };
    }
    case "currency": {
      if (num === null) return missing("right");
      return {
        text: formatCurrency(num, options.compact ?? true),
        tone: num > 0 ? "positive" : num < 0 ? "negative" : "neutral",
        align: "right",
        arrow: null,
      };
    }
    case "percent":
    case "trend": {
      if (num === null) return missing("right");
      return {
        text: formatPercent(num),
        tone: num > 0 ? "positive" : num < 0 ? "negative" : "neutral",
        align: "right",
        arrow: kind === "trend" ? (num > 0 ? "up" : num < 0 ? "down" : null) : null,
      };
    }
    case "number":
    case "gauge":
    case "progress":
    case "sparkline": {
      if (num === null) return missing("right");
      return {
        text: formatNumber(num, options.decimals ?? (Number.isInteger(num) ? 0 : 2)),
        tone: "neutral",
        align: "right",
        arrow: null,
      };
    }
    case "risk": {
      const text = value === null || value === undefined ? "—" : String(value);
      return {
        text,
        tone: RISK_TONES[text.toLowerCase()] ?? "neutral",
        align: "left",
        arrow: null,
      };
    }
    case "status":
    case "badge": {
      const text = value === null || value === undefined ? "—" : String(value);
      return {
        text,
        tone: STATUS_TONES[text.toLowerCase().replace(/\s+/g, "_")] ?? "neutral",
        align: "left",
        arrow: null,
      };
    }
    case "date":
      return { text: formatDateText(value), tone: "neutral", align: "left", arrow: null };
    case "tag":
    case "text":
    default: {
      const text =
        value === null || value === undefined || value === ""
          ? "—"
          : String(value);
      return { text, tone: "neutral", align: "left", arrow: null };
    }
  }
}

function missing(align: "left" | "right"): RenderedCell {
  return { text: "—", tone: "neutral", align, arrow: null };
}

export const CELL_TONE_TEXT_CLASS: Record<CellTone, string> = {
  positive: "text-gain",
  negative: "text-loss",
  warning: "text-warning",
  neutral: "text-text-secondary",
};

export const CELL_TONE_PILL_CLASS: Record<CellTone, string> = {
  positive: "bg-gain-bg text-gain",
  negative: "bg-loss-bg text-loss",
  warning: "bg-warning/10 text-warning",
  neutral: "bg-muted/60 text-text-secondary",
};
