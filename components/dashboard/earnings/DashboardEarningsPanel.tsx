import { Card, CardHeader } from "@/components/ui/Card";
import { EarningsMetricsStrip } from "@/components/dashboard/earnings/EarningsMetricsStrip";
import { EarningsSection } from "@/components/dashboard/earnings/EarningsSection";
import type { DashboardEarningsView } from "@/src/core/earnings/calendar";
import { Calendar } from "lucide-react";

interface DashboardEarningsPanelProps {
  view: DashboardEarningsView;
  compact?: boolean;
}

export function DashboardEarningsPanel({
  view,
  compact = false,
}: DashboardEarningsPanelProps) {
  return (
    <div className="space-y-4">
      <Card padding="lg">
        <CardHeader
          title="Upcoming Earnings"
          subtitle="Institutional earnings calendar"
          action={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Calendar className="h-4 w-4 text-accent" />
            </div>
          }
        />
        <EarningsMetricsStrip
          metrics={view.metrics}
          ready={view.metricsReady}
        />
      </Card>

      <div
        className={
          compact
            ? "grid grid-cols-1 gap-4 lg:grid-cols-2"
            : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        }
      >
        <EarningsSection section={view.today} />
        <EarningsSection section={view.tomorrow} />
        <EarningsSection section={view.next7Days} />
        <EarningsSection section={view.portfolio} />
        <EarningsSection section={view.watchlist} />
        <EarningsSection section={view.highImpact} />
      </div>
    </div>
  );
}
