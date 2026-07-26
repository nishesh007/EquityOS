/**
 * Paper Trading Lab — internal module ids (Sprint 11E.4).
 * Client-side workspace navigation; route remains /paper-trading.
 */

export type PaperLabModuleId =
  | "overview"
  | "active"
  | "closed"
  | "performance"
  | "intelligence";

export const PAPER_LAB_MODULES: readonly {
  id: PaperLabModuleId;
  label: string;
  description: string;
}[] = Object.freeze([
  {
    id: "overview",
    label: "Overview",
    description: "Engine status and KPI summary",
  },
  {
    id: "active",
    label: "Active Trades",
    description: "Open automated paper positions",
  },
  {
    id: "closed",
    label: "Closed Trades",
    description: "Completed paper-trade history",
  },
  {
    id: "performance",
    label: "Performance Analytics",
    description: "Institutional validation dashboard",
  },
  {
    id: "intelligence",
    label: "AI Recommendation Intelligence",
    description: "Recommendation quality & self-validation",
  },
]);

export function isPaperLabModuleId(value: string | null | undefined): value is PaperLabModuleId {
  return (
    value === "overview" ||
    value === "active" ||
    value === "closed" ||
    value === "performance" ||
    value === "intelligence"
  );
}
