"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { AlertCardView } from "@/src/core/earnings/alerts";
import type { QuickActionId } from "@/src/core/earnings/alerts";

interface EarningsAlertCardProps {
  card: AlertCardView;
  onAction?: (alertId: string, action: QuickActionId) => void;
}

function priorityVariant(
  priority: AlertCardView["priority"]
): "loss" | "accent" | "gain" | "neutral" {
  switch (priority) {
    case "Critical":
      return "loss";
    case "High":
      return "accent";
    case "Medium":
      return "gain";
    default:
      return "neutral";
  }
}

const ACTIONS: Array<{ id: QuickActionId; label: string }> = [
  { id: "open_research", label: "Research" },
  { id: "view_earnings", label: "Earnings" },
  { id: "view_transcript", label: "Transcript" },
  { id: "view_company", label: "Company" },
  { id: "add_to_watchlist", label: "Watchlist" },
  { id: "mark_read", label: "Read" },
  { id: "snooze", label: "Snooze" },
  { id: "dismiss", label: "Dismiss" },
];

export function EarningsAlertCard({ card, onAction }: EarningsAlertCardProps) {
  return (
    <article
      className={`rounded-lg border border-surface-border-subtle bg-surface/50 px-3 py-2.5 ${
        card.read ? "opacity-70" : ""
      }`}
      data-testid={`earnings-alert-card-${card.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-medium text-text-primary">
              {card.company}
            </p>
            <Badge variant="default" size="sm">
              {card.ticker}
            </Badge>
            <Badge variant={priorityVariant(card.priority)} size="sm">
              {card.priority}
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {card.event} · {card.timeRemaining}
          </p>
        </div>
        <Link
          href={card.href}
          className="text-[10px] font-medium text-accent hover:underline"
        >
          Open
        </Link>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] sm:grid-cols-3">
        <div>
          <dt className="text-text-faint">AI Outlook</dt>
          <dd className="text-text-secondary">{card.aiOutlook}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Confidence</dt>
          <dd className="text-text-secondary">{card.confidence}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Beat Probability</dt>
          <dd className="text-text-secondary">{card.beatProbability}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Expected Volatility</dt>
          <dd className="text-text-secondary">{card.expectedVolatility}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Portfolio Exposure</dt>
          <dd className="text-text-secondary">{card.portfolioExposure}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Status</dt>
          <dd className="capitalize text-text-secondary">{card.status}</dd>
        </div>
      </dl>

      {card.badges.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.badges.map((badge) => (
            <Badge key={`${card.id}-${badge}`} variant="neutral" size="sm">
              {badge}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction?.(card.id, action.id)}
            className="rounded border border-surface-border-subtle px-1.5 py-0.5 text-[10px] text-text-muted transition-colors hover:border-accent/40 hover:text-accent"
            data-testid={`alert-action-${action.id}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </article>
  );
}
