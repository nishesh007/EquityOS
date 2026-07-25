"use client";

import { useOptionalGlobalEventDrawer } from "@/components/events/GlobalEventDrawerProvider";
import {
  buildRecommendationEventWarning,
} from "@/src/core/events/integration";
import { buildEventSeedCatalog, toDateKey } from "@/src/core/events";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

interface RecommendationEventWarningBadgeProps {
  symbol: string;
  className?: string;
}

/**
 * Warning-only badge for recommendations (Sprint 10D.5).
 * Does not alter recommendation scoring or selection logic.
 */
export function RecommendationEventWarningBadge({
  symbol,
  className,
}: RecommendationEventWarningBadgeProps) {
  const drawer = useOptionalGlobalEventDrawer();
  const today = useMemo(() => toDateKey(new Date()), []);
  const warning = useMemo(() => {
    const catalog = buildEventSeedCatalog(today);
    return buildRecommendationEventWarning(catalog, symbol, today);
  }, [symbol, today]);

  if (!warning.primary || !warning.label) return null;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        drawer?.openEvent(warning.primary!.event);
      }}
      title={`Upcoming: ${warning.primary.event.title}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-amber-400/45 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200 transition-opacity hover:opacity-90",
        className
      )}
    >
      <AlertTriangle className="h-2.5 w-2.5 shrink-0" aria-hidden />
      {warning.label}
      {warning.impactScore != null && warning.impactScore >= 70
        ? " · High Impact"
        : ""}
    </button>
  );
}
