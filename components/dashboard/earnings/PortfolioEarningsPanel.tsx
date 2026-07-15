import { Card, CardHeader } from "@/components/ui/Card";
import { EarningsIntelligenceHost } from "@/components/dashboard/earnings/EarningsIntelligenceHost";
import {
  toEarningsCardView,
  type PortfolioEarningsRow,
  EMPTY_MESSAGES,
} from "@/src/core/earnings/calendar";
import { Briefcase } from "lucide-react";

interface PortfolioEarningsPanelProps {
  rows: PortfolioEarningsRow[];
}

export function PortfolioEarningsPanel({ rows }: PortfolioEarningsPanelProps) {
  const cards = rows.map(({ event }) => toEarningsCardView(event));

  return (
    <Card padding="lg">
      <CardHeader
        title="Portfolio Earnings"
        subtitle="Holdings reporting soon · AI preview"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Briefcase className="h-4 w-4 text-accent" />
          </div>
        }
      />

      <EarningsIntelligenceHost
        cards={cards}
        compact
        emptyMessage={EMPTY_MESSAGES.noPortfolio}
      />
    </Card>
  );
}
