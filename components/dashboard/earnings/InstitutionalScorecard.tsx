"use client";

import { Badge } from "@/components/ui/Badge";
import {
  toRankedCardPresentation,
  type RankedEarningsItem,
} from "@/src/core/earnings/dashboard";

interface InstitutionalScorecardProps {
  item: RankedEarningsItem;
  compact?: boolean;
}

function ScoreBar({
  label,
  value,
  tone = "accent",
}: {
  label: string;
  value: string;
  tone?: "accent" | "gain" | "loss" | "neutral";
}) {
  const numeric = Number(value);
  const width =
    Number.isFinite(numeric) && numeric > 0
      ? Math.max(8, Math.min(100, numeric))
      : 8;
  const barColor =
    tone === "gain"
      ? "bg-gain"
      : tone === "loss"
        ? "bg-loss"
        : tone === "neutral"
          ? "bg-text-faint"
          : "bg-accent";

  return (
    <div className="min-w-[72px] flex-1">
      <div className="mb-0.5 flex items-center justify-between gap-1 text-[10px] text-text-faint">
        <span>{label}</span>
        <span className="font-mono text-text-secondary">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-overlay">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function heatClass(level: string): string {
  switch (level) {
    case "Critical":
      return "bg-loss/20 border-loss/40";
    case "High":
      return "bg-accent/15 border-accent/30";
    case "Medium":
      return "bg-gain/10 border-gain/25";
    default:
      return "bg-surface-overlay border-surface-border";
  }
}

export function InstitutionalScorecard({
  item,
  compact = false,
}: InstitutionalScorecardProps) {
  const view = toRankedCardPresentation(item);

  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${heatClass(view.heatLevel)}`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="accent" size="sm">
          #{item.rank}
        </Badge>
        <Badge variant="neutral" size="sm">
          {view.priority}
        </Badge>
        <Badge variant="neutral" size="sm">
          {view.attentionLevel}
        </Badge>
        <span className="text-[10px] text-text-muted">
          Score {view.institutionalScoreLabel}
        </span>
      </div>

      <div className={`flex flex-wrap gap-3 ${compact ? "" : "mb-2"}`}>
        <ScoreBar label="AI" value={view.aiConfidenceLabel} />
        <ScoreBar
          label="Beat %"
          value={view.beatProbabilityLabel}
          tone="gain"
        />
        <ScoreBar label="Risk" value={view.riskLabel} tone="loss" />
        {!compact ? (
          <ScoreBar
            label="Opp"
            value={view.opportunityLabel}
            tone="neutral"
          />
        ) : null}
      </div>

      {!compact ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {view.badges.map((badge) => (
            <Badge key={badge} variant="neutral" size="sm">
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}

      {!view.ready ? (
        <p className="mt-1 text-[10px] text-text-muted">{view.emptyMessage}</p>
      ) : null}
    </div>
  );
}
