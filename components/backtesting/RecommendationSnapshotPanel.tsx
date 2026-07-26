"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import type { BacktestRecommendationSnapshot } from "@/lib/backtesting/types";
import { Crosshair } from "lucide-react";

export function RecommendationSnapshotPanel({
  recommendation,
}: {
  recommendation: BacktestRecommendationSnapshot | null;
}) {
  if (!recommendation) {
    return (
      <EmptyStatePanel
        icon={Crosshair}
        title="Recommendation Snapshot"
        message="No historical recommendation is visible at this replay moment."
        source="Historical values only"
        className="h-full"
      />
    );
  }

  return (
    <Card hover={false} padding="sm" data-testid="recommendation-snapshot">
      <CardHeader
        title="Recommendation Snapshot"
        subtitle={`${recommendation.symbol} · ${recommendation.action} · historical as-of`}
        timestamp={new Date(recommendation.asOf).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Conviction" value={fmt(recommendation.conviction)} />
        <Metric
          label="Recommendation Score"
          value={fmt(recommendation.recommendationScore)}
        />
        <Metric label="Risk" value={recommendation.riskLabel ?? "—"} />
        <Metric
          label="Confidence"
          value={
            recommendation.confidence != null
              ? `${recommendation.confidence.toFixed(0)}%`
              : "—"
          }
        />
      </div>
      <div className="mt-3 space-y-2 text-xs leading-relaxed text-text-secondary">
        <Block title="Technical Summary" body={recommendation.technicalSummary} />
        <Block
          title="Fundamental Summary"
          body={recommendation.fundamentalSummary}
        />
        <Block title="Valuation Summary" body={recommendation.valuationSummary} />
        {recommendation.catalysts && recommendation.catalysts.length > 0 ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Catalysts
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {recommendation.catalysts.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function fmt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(0);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border-subtle/70 bg-surface-hover/20 px-2.5 py-2">
      <p className="data-label">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-text-primary">
        {value}
      </p>
    </div>
  );
}

function Block({ title, body }: { title: string; body?: string }) {
  if (!body) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
        {title}
      </p>
      <p className="mt-1">{body}</p>
    </div>
  );
}
