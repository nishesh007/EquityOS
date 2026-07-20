import { MarketHeatmap } from "@/components/dashboard/market-heatmap";
import {
  ComingSoonWidget,
  PersonalizedDashboard,
} from "@/components/dashboard/workspace";
import {
  AiOpportunitiesWidget,
  EarningsIntelligenceWidget,
  MarketBreadthWidget,
  MarketMoversWidget,
  MarketNewsWidget,
  MarketPulseWidget,
  MarketSnapshotWidget,
  PortfolioSummaryWidget,
  ResultsCalendarWidget,
  WatchlistWidget,
} from "@/components/dashboard/widgets/DashboardWidgets";
import { WidgetSkeleton } from "@/components/dashboard/widgets/WidgetSkeleton";
import { getDashboardMarketSnapshot } from "@/lib/market-orchestrator";
import { AccentContainer, PageContainer } from "@/src/design";
import {
  BellRing,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

/**
 * Dashboard shell — single consumer of the central market orchestrator.
 * Widgets receive typed slices only; they do not fetch shared dashboard context.
 * MarketHeatmap receives snapshot.heatmap as initial so it skips the mount-time API scan.
 */
export default async function DashboardPage() {
  const snapshot = await getDashboardMarketSnapshot();

  const header = (
    <header className="mb-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"
        >
          <LayoutDashboard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Customizable institutional workspace · Edit Mode to rearrange
          </p>
        </div>
      </div>
      <div
        aria-hidden
        className="mt-4 h-px w-full bg-gradient-to-r from-indigo-500/60 via-indigo-500/20 to-transparent"
      />
    </header>
  );

  return (
    <PageContainer>
      <PersonalizedDashboard
        header={header}
        widgets={{
          "market-snapshot": (
            <Suspense fallback={<WidgetSkeleton label="Market Snapshot" className="h-64" />}>
              <MarketSnapshotWidget
                indices={snapshot.market.indices}
                marketIntelligence={snapshot.intelligence}
                breadth={snapshot.breadth}
              />
            </Suspense>
          ),
          "market-pulse": (
            <Suspense fallback={<WidgetSkeleton label="Market Pulse" className="h-56" />}>
              <MarketPulseWidget
                pulse={snapshot.market.pulse}
                marketIntelligence={snapshot.intelligence}
              />
            </Suspense>
          ),
          "market-heatmap": (
            <MarketHeatmap
              initial={snapshot.heatmap}
              defaultUniverse="nse"
            />
          ),
          "market-breadth": (
            <Suspense fallback={<WidgetSkeleton label="Market Breadth" className="h-72" />}>
              <MarketBreadthWidget breadth={snapshot.breadth} />
            </Suspense>
          ),
          "market-movers": (
            <Suspense fallback={<WidgetSkeleton label="Market Movers" className="h-48" />}>
              <MarketMoversWidget breadth={snapshot.breadth} />
            </Suspense>
          ),
          "ai-opportunities": (
            <Suspense fallback={<WidgetSkeleton label="AI Opportunities" className="h-72" />}>
              <AiOpportunitiesWidget
                recommendations={snapshot.opportunities.recommendations}
              />
            </Suspense>
          ),
          "ai-alerts": (
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
          ),
          "portfolio-summary": (
            <Suspense fallback={<WidgetSkeleton label="Portfolio" className="h-56" />}>
              <PortfolioSummaryWidget portfolio={snapshot.portfolio} />
            </Suspense>
          ),
          watchlist: (
            <Suspense fallback={<WidgetSkeleton label="Watchlist" className="h-48" />}>
              <WatchlistWidget
                watchlist={snapshot.watchlist.items}
                recommendations={snapshot.opportunities.recommendations}
              />
            </Suspense>
          ),
          "portfolio-health": (
            <ComingSoonWidget
              title="Portfolio Health"
              subtitle="Open Portfolio Doctor for live health metrics"
            />
          ),
          "research-summary": (
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
          ),
          "ai-brief": (
            <ComingSoonWidget
              title="AI Market Brief"
              subtitle="Briefing surface reserved for layout"
            />
          ),
          "economic-calendar": (
            <ComingSoonWidget title="Economic Calendar" />
          ),
          "results-calendar": (
            <Suspense fallback={<WidgetSkeleton label="Results Calendar" className="h-48" />}>
              <ResultsCalendarWidget results={snapshot.upcomingResults} />
            </Suspense>
          ),
          "market-news": (
            <Suspense fallback={<WidgetSkeleton label="News" className="h-48" />}>
              <MarketNewsWidget news={snapshot.news} />
            </Suspense>
          ),
          "earnings-intelligence": (
            <Suspense fallback={<WidgetSkeleton label="Earnings" className="h-40" />}>
              <EarningsIntelligenceWidget results={snapshot.upcomingResults} />
            </Suspense>
          ),
          "validation-center": (
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
          ),
        }}
      />
    </PageContainer>
  );
}
