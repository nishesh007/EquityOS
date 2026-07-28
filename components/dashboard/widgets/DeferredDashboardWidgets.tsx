import { DashboardResultsSnapshot } from "@/components/dashboard/DashboardResultsSnapshot";
import { MarketMoversCards } from "@/components/dashboard/MarketMoversCards";
import { MarketNewsTicker } from "@/components/dashboard/MarketNewsTicker";
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
} from "lucide-react";
import Link from "next/link";

/** Five institutional mover cards — presentation only (deferred / below-fold). */
export function MarketMoversWidget({
  breadth,
}: {
  breadth: MarketBreadthData;
}) {
  return <MarketMoversCards breadth={breadth} />;
}

export function ResultsCalendarWidget({
  results,
}: {
  results: UpcomingResult[];
}) {
  return (
    <div className="flex h-full min-h-[12rem] flex-col space-y-2">
      <SectionHeader
        title="Results Calendar"
        subtitle="Compact earnings windows"
        summary={`${results.length} upcoming result windows.`}
        accent="orange"
        level={3}
        icon={<CalendarDays className="h-5 w-5" />}
        actions={
          <Link
            href="/results"
            className="text-caption font-semibold text-accent transition-opacity duration-150 hover:opacity-80"
          >
            Open Earnings →
          </Link>
        }
      />
      <div className="min-h-0 flex-1">
        <DashboardResultsSnapshot results={results} />
      </div>
    </div>
  );
}

export function MarketNewsWidget({ news }: { news: MarketNews[] }) {
  return (
    <div className="h-full min-h-[12rem]">
      <MarketNewsTicker news={news} />
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
