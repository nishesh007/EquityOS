"use client";

/**
 * AI Flash Cards — actionable one-liners from live dashboard calculations.
 */

import type { ChipTone, FlashCard } from "@/lib/dashboard/executive-intelligence";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Landmark,
  Newspaper,
  Sparkles,
  TrendingUp,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

const TONE_BORDER: Record<ChipTone, string> = {
  green: "border-l-gain",
  amber: "border-l-warning",
  red: "border-l-loss",
  blue: "border-l-info",
  neutral: "border-l-surface-border",
};

const TONE_ICON: Record<ChipTone, string> = {
  green: "text-gain",
  amber: "text-warning",
  red: "text-loss",
  blue: "text-info",
  neutral: "text-text-muted",
};

const CATEGORY_ICON: Record<FlashCard["category"], ComponentType<{ className?: string }>> = {
  "BUY SIGNAL": TrendingUp,
  BREAKOUT: ArrowUpRight,
  "RESULT ALERT": Newspaper,
  "PORTFOLIO RISK": AlertTriangle,
  "WATCHLIST ALERT": Bell,
  DIVIDEND: Landmark,
  "SECTOR ROTATION": BarChart3,
  VALUATION: Sparkles,
  "HIGH VOLUME": Volume2,
  "NEW 52W HIGH": ArrowUpRight,
};

interface AiFlashCardsProps {
  cards: FlashCard[];
}

export function AiFlashCards({ cards }: AiFlashCardsProps) {
  if (cards.length === 0) return null;

  return (
    <section aria-label="AI flash cards" className="flex gap-2 overflow-x-auto pb-0.5">
      {cards.map((card) => {
        const Icon = CATEGORY_ICON[card.category];
        return (
          <Link
            key={card.id}
            href={card.href}
            className={cn(
              "min-w-[148px] max-w-[200px] shrink-0 rounded-md border border-surface-border-subtle border-l-[3px] bg-card/50 px-2.5 py-2 transition-colors hover:bg-surface-hover",
              TONE_BORDER[card.tone]
            )}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <Icon className={cn("h-3.5 w-3.5 shrink-0", TONE_ICON[card.tone])} />
              <span className="truncate text-[9px] font-bold uppercase tracking-wider text-text-muted">
                {card.category}
              </span>
            </div>
            <p className="line-clamp-2 text-[11px] leading-snug text-text-primary">
              {card.insight}
            </p>
          </Link>
        );
      })}
    </section>
  );
}
