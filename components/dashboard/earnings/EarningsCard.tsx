"use client";

import { Badge } from "@/components/ui/Badge";
import { EarningsAIPreviewStrip } from "@/components/dashboard/earnings/EarningsAIPreviewStrip";
import { PostEarningsPreviewStrip } from "@/components/dashboard/earnings/PostEarningsPreviewStrip";
import type { EarningsCardView } from "@/src/core/earnings/calendar";
import type { EarningsCardPreviewView } from "@/src/core/earnings/intelligence";
import type { PostEarningsCardView } from "@/src/core/earnings/postAnalysis";
import { Briefcase, Star } from "lucide-react";

interface EarningsCardProps {
  card: EarningsCardView;
  preview?: EarningsCardPreviewView | null;
  postAnalysis?: PostEarningsCardView | null;
  compact?: boolean;
  onOpenResearch?: (card: EarningsCardView) => void;
}

function countdownVariant(
  status: EarningsCardView["countdown"]["status"]
): "accent" | "gain" | "neutral" | "loss" {
  switch (status) {
    case "today":
    case "hours":
    case "minutes":
      return "accent";
    case "tomorrow":
      return "gain";
    case "result_released":
      return "neutral";
    case "expired":
      return "loss";
    default:
      return "neutral";
  }
}

export function EarningsCard({
  card,
  preview = null,
  postAnalysis = null,
  compact = false,
  onOpenResearch,
}: EarningsCardProps) {
  const showPost =
    Boolean(postAnalysis) &&
    (card.countdown.isReleased || card.countdown.isExpired);

  return (
    <button
      type="button"
      onClick={() => onOpenResearch?.(card)}
      className="group flex w-full items-start gap-3 rounded-lg border border-surface-border-subtle bg-surface/50 p-3 text-left transition-all hover:border-surface-border hover:bg-surface-hover/50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium text-text-primary group-hover:text-accent">
            {card.companyName}
          </p>
          <Badge variant="default" size="sm">
            {card.ticker}
          </Badge>
          <Badge variant="neutral" size="sm">
            {card.exchange}
          </Badge>
          <Badge variant={countdownVariant(card.countdown.status)} size="sm">
            {card.countdown.label}
          </Badge>
          {card.inPortfolio ? (
            <span title="Portfolio" className="text-accent">
              <Briefcase className="h-3 w-3" />
            </span>
          ) : null}
          {card.inWatchlist ? (
            <span title="Watchlist" className="text-gain">
              <Star className="h-3 w-3" />
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-text-muted">
          <Badge variant="neutral" size="sm">
            {card.quarter}
          </Badge>
          <Badge variant="neutral" size="sm">
            {card.financialYear}
          </Badge>
          <Badge variant="neutral" size="sm">
            {card.sector}
          </Badge>
          {!compact ? (
            <span className="text-text-faint">{card.industry}</span>
          ) : null}
        </div>

        {!compact ? (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-faint">
            <span>Cap {card.marketCap}</span>
            <span>{card.resultDate}</span>
            <span>{card.resultTime}</span>
            <span>{card.sessionLabel}</span>
            <span>Prev {card.previousResultDate}</span>
          </div>
        ) : (
          <div className="mt-1 text-[10px] text-text-faint">
            {card.resultDate} · {card.sessionLabel} · {card.marketCap}
          </div>
        )}

        {showPost && postAnalysis ? (
          <PostEarningsPreviewStrip view={postAnalysis} compact={compact} />
        ) : preview ? (
          <EarningsAIPreviewStrip preview={preview} compact={compact} />
        ) : null}
      </div>
    </button>
  );
}
