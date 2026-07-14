import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { PortfolioEarningsRow } from "@/src/core/earnings/calendar";
import { EMPTY_MESSAGES } from "@/src/core/earnings/calendar";
import { Briefcase } from "lucide-react";

interface PortfolioEarningsPanelProps {
  rows: PortfolioEarningsRow[];
}

export function PortfolioEarningsPanel({ rows }: PortfolioEarningsPanelProps) {
  return (
    <Card padding="lg">
      <CardHeader
        title="Portfolio Earnings"
        subtitle="Holdings reporting soon"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Briefcase className="h-4 w-4 text-accent" />
          </div>
        }
      />

      {rows.length === 0 ? (
        <p className="text-xs text-text-muted">{EMPTY_MESSAGES.noPortfolio}</p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ event, daysRemaining, countdownLabel, expectedEvent }) => (
            <div
              key={event.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-surface-border-subtle bg-surface/50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {event.companyName}
                  </p>
                  <Badge variant="default" size="sm">
                    {event.ticker}
                  </Badge>
                  <Badge variant="accent" size="sm">
                    {countdownLabel}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[10px] text-text-muted">
                  {expectedEvent}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs tabular-nums text-text-primary">
                  {daysRemaining == null ? "—" : `${daysRemaining}d`}
                </p>
                <p className="text-[10px] text-text-faint">{event.quarter}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
