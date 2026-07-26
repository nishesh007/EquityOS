"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import type { BacktestRecommendationSnapshot } from "@/lib/backtesting/types";
import type { BacktestTradeEvent } from "@/lib/backtesting/types";
import type {
  CorporateActionRecord,
  HistoricalEventRecord,
} from "@/lib/backtesting/dataset";
import { CalendarDays, ListTree, Sparkles } from "lucide-react";

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RecommendationTimelinePanel({
  recommendations,
}: {
  recommendations: readonly BacktestRecommendationSnapshot[];
}) {
  return (
    <Card hover={false} padding="sm">
      <CardHeader title="Recommendation Timeline" subtitle="Visible signals only" />
      {recommendations.length === 0 ? (
        <EmptyStatePanel
          icon={Sparkles}
          message="No recommendation signals have occurred yet in this replay."
          source="Historical Replay"
          className="py-5"
        />
      ) : (
        <ol className="max-h-48 space-y-2 overflow-y-auto">
          {recommendations.map((rec) => (
            <li
              key={rec.recommendationId}
              className="rounded-lg border border-surface-border-subtle/70 bg-surface-hover/20 px-3 py-2"
            >
              <p className="text-xs font-semibold text-text-primary">
                {rec.symbol} · {rec.action}
              </p>
              <p className="font-mono text-[11px] text-text-muted">
                {formatTs(rec.asOf)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function TradeTimelinePanel({
  events,
}: {
  events: readonly BacktestTradeEvent[];
}) {
  return (
    <Card hover={false} padding="sm">
      <CardHeader title="Trade Timeline" subtitle="Markers as historically reached" />
      {events.length === 0 ? (
        <EmptyStatePanel
          icon={ListTree}
          message="No trade events yet at this replay cursor."
          source="Historical Replay"
          className="py-5"
        />
      ) : (
        <ol className="max-h-48 space-y-2 overflow-y-auto">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-surface-border-subtle/70 bg-surface-hover/20 px-3 py-2"
            >
              <div>
                <p className="text-xs font-semibold text-text-primary">
                  {event.label}
                </p>
                <p className="font-mono text-[11px] text-text-muted">
                  {formatTs(event.at)}
                </p>
              </div>
              {event.price != null ? (
                <span className="font-mono text-[11px] tabular-nums text-text-secondary">
                  ₹{event.price.toLocaleString("en-IN")}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function HistoricalEventTimelinePanel({
  events,
  corporateActions,
}: {
  events: readonly HistoricalEventRecord[];
  corporateActions: readonly CorporateActionRecord[];
}) {
  const rows = [
    ...events.map((event) => ({
      id: event.id,
      title: event.title,
      kind: event.eventType,
      at: event.at,
    })),
    ...corporateActions.map((action) => ({
      id: action.id,
      title: `${action.kind.toUpperCase()}${action.amount != null ? ` · ₹${action.amount}` : ""}${action.ratio ? ` · ${action.ratio}` : ""}`,
      kind: action.kind,
      at: action.exDate,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <Card hover={false} padding="sm" data-testid="event-timeline">
      <CardHeader
        title="Historical Event Timeline"
        subtitle="Earnings · dividends · splits · bonus · macro"
      />
      {rows.length === 0 ? (
        <EmptyStatePanel
          icon={CalendarDays}
          message="No historical events have occurred up to this candle."
          source="Historical Replay"
          className="py-5"
        />
      ) : (
        <ol className="max-h-56 space-y-0 overflow-y-auto">
          {rows.map((row, index) => (
            <li key={row.id} className="flex gap-3">
              <div className="flex w-4 flex-col items-center">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-accent" />
                {index < rows.length - 1 ? (
                  <span className="my-1 w-px flex-1 bg-surface-border" />
                ) : null}
              </div>
              <div className="pb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-text-faint">
                  {row.kind}
                </p>
                <p className="text-xs font-medium text-text-primary">{row.title}</p>
                <p className="font-mono text-[11px] text-text-muted">
                  {formatTs(row.at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
