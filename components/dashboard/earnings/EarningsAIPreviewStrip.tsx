"use client";

import { Badge } from "@/components/ui/Badge";
import { SignalBadge } from "@/components/ui/SignalBadge";
import {
  badgeVariant,
  type EarningsCardPreviewView,
} from "@/src/core/earnings/intelligence";
import type { Signal } from "@/types";

interface EarningsAIPreviewStripProps {
  preview: EarningsCardPreviewView;
  compact?: boolean;
}

function toSignal(outlook: string): Signal {
  const normalized = outlook.toLowerCase();
  if (normalized === "bullish") return "bullish";
  if (normalized === "bearish") return "bearish";
  return "neutral";
}

export function EarningsAIPreviewStrip({
  preview,
  compact = false,
}: EarningsAIPreviewStripProps) {
  if (!preview.ready) {
    return (
      <p className="mt-2 text-[10px] text-text-muted">{preview.emptyMessage}</p>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <SignalBadge signal={toSignal(preview.outlook)} size="sm" />
        <Badge variant="accent" size="sm">
          Conf {preview.confidence}
        </Badge>
        {!compact ? (
          <>
            <Badge variant="neutral" size="sm">
              Rev {preview.expectedRevenue}
            </Badge>
            <Badge variant="neutral" size="sm">
              EPS {preview.expectedEps}
            </Badge>
            <Badge variant="neutral" size="sm">
              Margin {preview.expectedMarginTrend}
            </Badge>
          </>
        ) : (
          <Badge variant="neutral" size="sm">
            {preview.expectedRevenue}
          </Badge>
        )}
      </div>

      {!compact ? (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-faint">
          <span>Vol {preview.expectedVolatility}</span>
          <span>Inst {preview.institutionalInterest}</span>
          <span>{preview.historicalBeatRate}</span>
          <span>{preview.consensusDirection}</span>
        </div>
      ) : null}

      <p className="text-[10px] text-text-muted">{preview.importantWatchItem}</p>

      {preview.badges.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {preview.badges.map((badge) => (
            <Badge key={badge} variant={badgeVariant(badge)} size="sm">
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
