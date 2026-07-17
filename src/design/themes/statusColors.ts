/**
 * Sprint 10C.R5 — premium status color roles.
 *
 * One canonical mapping from research semantics to themed utility classes.
 * Every class resolves through theme CSS variables, so all 8 themes and
 * all 6 accents recolor these automatically.
 */

export type StatusColorRole =
  | "positive"
  | "negative"
  | "warning"
  | "neutral"
  | "information"
  | "research"
  | "conviction"
  | "validation"
  | "trust"
  | "risk"
  | "lifecycle";

export interface StatusColorSpec {
  text: string;
  bg: string;
  border: string;
}

export const STATUS_COLORS: Readonly<Record<StatusColorRole, StatusColorSpec>> =
  Object.freeze({
    positive: { text: "text-gain", bg: "bg-gain-bg", border: "border-gain/30" },
    negative: { text: "text-loss", bg: "bg-loss-bg", border: "border-loss/30" },
    warning: {
      text: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/30",
    },
    neutral: {
      text: "text-text-secondary",
      bg: "bg-muted/60",
      border: "border-surface-border",
    },
    information: { text: "text-info", bg: "bg-info/10", border: "border-info/30" },
    research: {
      text: "text-accent",
      bg: "bg-accent/10",
      border: "border-accent/30",
    },
    conviction: {
      text: "text-accent",
      bg: "bg-accent/10",
      border: "border-accent/30",
    },
    validation: { text: "text-info", bg: "bg-info/10", border: "border-info/30" },
    trust: { text: "text-gain", bg: "bg-gain-bg", border: "border-gain/30" },
    risk: { text: "text-loss", bg: "bg-loss-bg", border: "border-loss/30" },
    lifecycle: {
      text: "text-text-secondary",
      bg: "bg-muted/60",
      border: "border-surface-border",
    },
  });

export const STATUS_COLOR_ROLES: readonly StatusColorRole[] = Object.freeze(
  Object.keys(STATUS_COLORS) as StatusColorRole[]
);
