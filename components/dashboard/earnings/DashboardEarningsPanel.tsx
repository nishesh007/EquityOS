import { Card, CardHeader } from "@/components/ui/Card";
import { EarningsMetricsStrip } from "@/components/dashboard/earnings/EarningsMetricsStrip";
import { EarningsSection } from "@/components/dashboard/earnings/EarningsSection";
import { InstitutionalDashboardMetrics } from "@/components/dashboard/earnings/InstitutionalDashboardMetrics";
import { InstitutionalScorecard } from "@/components/dashboard/earnings/InstitutionalScorecard";
import type { DashboardEarningsView } from "@/src/core/earnings/calendar";
import type {
  EarningsDashboardMetrics,
  RankedEarningsItem,
} from "@/src/core/earnings/dashboard";
import { Calendar } from "lucide-react";
import Link from "next/link";

interface DashboardEarningsPanelProps {
  view: DashboardEarningsView;
  rankedMetrics?: EarningsDashboardMetrics | null;
  topRanked?: RankedEarningsItem[];
  compact?: boolean;
}

export function DashboardEarningsPanel({
  view,
  rankedMetrics = null,
  topRanked = [],
  compact = false,
}: DashboardEarningsPanelProps) {
  return (
    <div className="space-y-4">
      <Card padding="lg">
        <CardHeader
          title="Upcoming Earnings"
          subtitle="Institutional earnings calendar"
          action={
            <div className="flex items-center gap-2">
              <Link
                href="/results"
                className="text-[10px] font-medium text-accent hover:underline"
              >
                Open dashboard
              </Link>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <Calendar className="h-4 w-4 text-accent" />
              </div>
            </div>
          }
        />
        {rankedMetrics ? (
          <InstitutionalDashboardMetrics metrics={rankedMetrics} />
        ) : (
          <EarningsMetricsStrip
            metrics={view.metrics}
            ready={view.metricsReady}
          />
        )}
      </Card>

      {topRanked.length > 0 ? (
        <Card padding="md">
          <CardHeader
            title="Top Ranked Earnings"
            subtitle="Institutional priority scorecards"
          />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {topRanked.slice(0, 6).map((item) => (
              <InstitutionalScorecard
                key={`top-${item.event.id}`}
                item={item}
                compact
              />
            ))}
          </div>
        </Card>
      ) : null}

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
