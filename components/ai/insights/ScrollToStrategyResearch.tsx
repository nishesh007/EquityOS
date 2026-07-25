"use client";

import { strategyResearchAnchorId } from "@/lib/ai/insights-research";
import type { InstitutionalStrategyId } from "@/lib/recommendations";
import { useEffect } from "react";

/** Scrolls to the selected strategy research section after navigation. */
export function ScrollToStrategyResearch({
  strategyId,
}: {
  strategyId: InstitutionalStrategyId | null;
}) {
  useEffect(() => {
    if (!strategyId) return;
    const el = document.getElementById(strategyResearchAnchorId(strategyId));
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [strategyId]);

  return null;
}
