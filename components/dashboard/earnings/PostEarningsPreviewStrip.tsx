"use client";

import { Badge } from "@/components/ui/Badge";
import {
  postBadgeVariant,
  type PostEarningsCardView,
} from "@/src/core/earnings/postAnalysis";

interface PostEarningsPreviewStripProps {
  view: PostEarningsCardView;
  compact?: boolean;
}

function verdictVariant(
  verdict: string
): "gain" | "loss" | "neutral" | "accent" {
  if (verdict.includes("Positive")) return "gain";
  if (verdict.includes("Negative")) return "loss";
  return "accent";
}

export function PostEarningsPreviewStrip({
  view,
  compact = false,
}: PostEarningsPreviewStripProps) {
  if (!view.ready) {
    return (
      <p className="mt-2 text-[10px] text-text-muted">{view.emptyMessage}</p>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={verdictVariant(view.verdict)} size="sm">
          {view.verdict}
        </Badge>
        <Badge variant="accent" size="sm">
          Conf {view.confidence}
        </Badge>
        <Badge variant="neutral" size="sm">
          Rev {view.revenueBeat}
        </Badge>
        {!compact ? (
          <Badge variant="neutral" size="sm">
            EPS {view.epsBeat}
          </Badge>
        ) : null}
      </div>
      {!compact ? (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-faint">
          <span>Guidance {view.guidance}</span>
          <span>{view.gapReaction}</span>
        </div>
      ) : null}
      {view.badges.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {view.badges.map((badge) => (
            <Badge key={badge} variant={postBadgeVariant(badge)} size="sm">
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
