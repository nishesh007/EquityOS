import { DashboardResultsSnapshot } from "@/components/dashboard/DashboardResultsSnapshot";
import { LatestMarketNews } from "@/components/dashboard/LatestMarketNews";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { StockLink } from "@/components/ui/StockLink";
import { AccentContainer, SectionHeader } from "@/src/design";
import type {
  MarketBreadth as MarketBreadthData,
  MarketNews,
  UpcomingResult,
} from "@/types";
import {
  BellRing,
  CalendarDays,
  ChevronRight,
  Newspaper,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

/** Slim movers card — presentation only (deferred / below-fold). */
export function MarketMoversWidget({
  breadth,
}: {
  breadth: MarketBreadthData;
}) {
  return (
    <Card padding="lg" accent="emerald">
      <CardHeader
        title="Market Movers"
        subtitle={breadth.universeLabel ?? "Selected universe"}
        icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gain">
            Top Gainers
          </p>
          <ul className="space-y-1.5">
            {breadth.gainers.slice(0, 5).map((item) => (
              <li
                key={item.symbol}
                className="flex items-center justify-between text-[11px]"
              >
                <StockLink
                  symbol={item.symbol}
                  className="font-semibold text-text-primary"
                >
                  {item.symbol}
                </StockLink>
                <ChangeIndicator
                  value={item.changePercent}
                  size="sm"
                  showIcon={false}
                />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-loss">
            Top Losers
          </p>
          <ul className="space-y-1.5">
            {breadth.losers.slice(0, 5).map((item) => (
              <li
                key={item.symbol}
                className="flex items-center justify-between text-[11px]"
              >
                <StockLink
                  symbol={item.symbol}
                  className="font-semibold text-text-primary"
                >
                  {item.symbol}
                </StockLink>
                <ChangeIndicator
                  value={item.changePercent}
                  size="sm"
                  showIcon={false}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

export function ResultsCalendarWidget({
  results,
}: {
  results: UpcomingResult[];
}) {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Results Calendar"
        subtitle="Compact earnings windows"
        summary={`${results.length} upcoming result windows.`}
        accent="orange"
        icon={<CalendarDays className="h-5 w-5" />}
        actions={
          <Link
            href="/results"
            className="text-xs font-semibold text-accent transition-colors hover:text-accent/80"
          >
            Open Earnings →
          </Link>
        }
      />
      <DashboardResultsSnapshot results={results} />
    </div>
  );
}

export function MarketNewsWidget({ news }: { news: MarketNews[] }) {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="News"
        subtitle="Verified coverage from approved publishers"
        summary={`${news.length} verified headlines in the latest feed.`}
        accent="indigo"
        icon={<Newspaper className="h-5 w-5" />}
      />
      <LatestMarketNews news={news} />
    </div>
  );
}

export function EarningsIntelligenceWidget({
  results,
}: {
  results: UpcomingResult[];
}) {
  return <DashboardResultsSnapshot results={results} />;
}

export function AiAlertsCard() {
  return (
    <AccentContainer accent="purple" tint strip padding="md">
      <Link
        href="/ai"
        className="flex items-center justify-between transition-opacity hover:opacity-90"
      >
        <span className="flex items-center gap-3">
          <BellRing className="h-4 w-4 text-purple-400" />
          <span>
            <span className="block text-sm font-semibold text-text-primary">
              AI Alerts
            </span>
            <span className="block text-xs text-text-muted">
              Review material AI insights and market changes
            </span>
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-text-muted" />
      </Link>
    </AccentContainer>
  );
}

export function ResearchSummaryCard() {
  return (
    <AccentContainer accent="violet" tint strip padding="md">
      <Link
        href="/validation"
        className="flex items-center justify-between transition-opacity hover:opacity-90"
      >
        <span>
          <span className="block text-sm font-semibold text-text-primary">
            Research Summary
          </span>
          <span className="block text-xs text-text-muted">
            Research Confidence · workspace shortcuts
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-text-muted" />
      </Link>
    </AccentContainer>
  );
}

export function ValidationCenterCard() {
  return (
    <AccentContainer accent="cyan" tint strip padding="md">
      <Link
        href="/validation"
        className="flex items-center justify-between transition-opacity hover:opacity-90"
      >
        <span className="block text-sm font-semibold text-text-primary">
          Research Confidence
        </span>
        <ChevronRight className="h-4 w-4 text-text-muted" />
      </Link>
    </AccentContainer>
  );
}
