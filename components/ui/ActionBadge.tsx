"use client";

/**
 * Institutional BUY / SELL / HOLD action badge — single source of truth.
 * Solid color coding for instant recognition across tables, cards, and drawers.
 */

import { cn } from "@/lib/utils";

export type ActionBadgeAction = "BUY" | "SELL" | "HOLD";

const STYLES: Record<
  ActionBadgeAction,
  { base: string; icon: string; label: string }
> = {
  BUY: {
    base:
      "border-[#22C55E] bg-[#16A34A] text-white hover:bg-[#15803D] focus-visible:ring-[#22C55E]",
    icon: "▲",
    label: "BUY",
  },
  SELL: {
    base:
      "border-[#EF4444] bg-[#DC2626] text-white hover:bg-[#B91C1C] focus-visible:ring-[#EF4444]",
    icon: "▼",
    label: "SELL",
  },
  HOLD: {
    base:
      "border-[#F59E0B] bg-[#D97706] text-white hover:bg-[#B45309] focus-visible:ring-[#F59E0B]",
    icon: "▬",
    label: "HOLD",
  },
};

/**
 * Normalize engine / UI action strings to BUY | SELL | HOLD.
 * Returns null when the value is not a recommendation action.
 */
export function normalizeActionBadge(
  action: string | null | undefined
): ActionBadgeAction | null {
  if (!action) return null;
  const key = action.trim().toUpperCase().replace(/\s+/g, "_");
  if (key === "BUY" || key === "ACCUMULATE" || key === "STRONG_BUY") return "BUY";
  if (key === "SELL" || key === "STRONG_SELL") return "SELL";
  if (
    key === "HOLD" ||
    key === "WATCH" ||
    key === "WATCHLIST" ||
    key === "NEUTRAL"
  ) {
    return "HOLD";
  }
  return null;
}

export function isActionBadgeValue(value: unknown): value is string {
  return typeof value === "string" && normalizeActionBadge(value) != null;
}

interface ActionBadgeProps {
  action: ActionBadgeAction | string;
  className?: string;
  /** Hide ▲/▼/▬ icon (default shows icon). */
  showIcon?: boolean;
}

export function ActionBadge({
  action,
  className,
  showIcon = true,
}: ActionBadgeProps) {
  const normalized = normalizeActionBadge(action) ?? "HOLD";
  const style = STYLES[normalized];

  return (
    <span
      role="status"
      tabIndex={0}
      aria-label={`Recommendation action ${style.label}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-tight",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
        style.base,
        className
      )}
    >
      {showIcon ? (
        <span aria-hidden="true" className="text-[9px] leading-none">
          {style.icon}
        </span>
      ) : null}
      {style.label}
    </span>
  );
}
