"use client";

import { AskAIButton } from "@/components/ai/AskAIButton";
import { useOptionalRecommendationDetailDrawer } from "@/components/recommendations/detail-drawer";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import {
  FileSearch,
  GitCompareArrows,
  Loader2,
  Star,
  StickyNote,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface ActionButtonsProps {
  symbol: string;
  companyName?: string;
  className?: string;
}

const actions = [
  { id: "watchlist", label: "Add to Watchlist", icon: Star },
  { id: "note", label: "Add Note", icon: StickyNote },
  { id: "compare", label: "Compare", icon: GitCompareArrows, href: true },
] as const;

export function ActionButtons({
  symbol,
  companyName,
  className,
}: ActionButtonsProps) {
  const drawer = useOptionalRecommendationDetailDrawer();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [openingRec, setOpeningRec] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    []
  );

  const handleAction = (actionId: string) => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setActiveAction(actionId);
    resetTimer.current = setTimeout(() => setActiveAction(null), 1500);
  };

  async function viewRecommendation(): Promise<void> {
    if (!drawer || openingRec) return;
    setOpeningRec(true);
    try {
      await drawer.openBySymbol(symbol, companyName, "company");
    } finally {
      setOpeningRec(false);
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <button
        type="button"
        onClick={() => void viewRecommendation()}
        disabled={!drawer || openingRec}
        aria-label={`View recommendation for ${symbol}`}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/15 px-4 py-2 text-xs font-semibold text-accent shadow-glow transition-all hover:border-accent/60 hover:bg-accent/25 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60",
          FOCUS_RING_CLASS
        )}
      >
        {openingRec ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <FileSearch className="h-3.5 w-3.5" aria-hidden />
        )}
        {openingRec ? "Opening…" : "View Recommendation"}
      </button>

      <AskAIButton
        symbol={symbol}
        prompt={`Analyse ${symbol}`}
        pageContext="company"
        label="AI Analyse"
      />

      {actions.map((action) => {
        const Icon = action.icon;
        const isActive = activeAction === action.id;

        if ("href" in action && action.href) {
          return (
            <Link
              key={action.id}
              href={`/ai/compare`}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition-all",
                "border-surface-border-subtle bg-surface-overlay/50 text-text-secondary hover:border-surface-border hover:bg-surface-hover hover:text-text-primary",
                FOCUS_RING_CLASS
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {action.label}
            </Link>
          );
        }

        return (
          <button
            key={action.id}
            type="button"
            onClick={() => handleAction(action.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition-all",
              isActive
                ? "border-accent/40 bg-accent/15 text-accent shadow-glow"
                : "border-surface-border-subtle bg-surface-overlay/50 text-text-secondary hover:border-surface-border hover:bg-surface-hover hover:text-text-primary",
              FOCUS_RING_CLASS
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {isActive ? "Added!" : action.label}
          </button>
        );
      })}
      <span className="sr-only">Actions for {symbol}</span>
    </div>
  );
}
