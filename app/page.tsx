import {
  PersonalizedDashboard,
} from "@/components/dashboard/workspace";
import {
  AiOpportunitiesWidget,
  MarketPulseWidget,
  MarketSnapshotWidget,
  PortfolioSummaryWidget,
  WatchlistWidget,
} from "@/components/dashboard/widgets/DashboardWidgets";
import {
  LazyAiAlertsCard,
  LazyComingSoonWidget,
  LazyEarningsIntelligenceWidget,
  LazyMarketBreadthWidget,
  LazyMarketHeatmap,
  LazyMarketMoversWidget,
  LazyMarketNewsWidget,
  LazyResearchSummaryCard,
  LazyResultsCalendarWidget,
  LazyValidationCenterCard,
} from "@/components/dashboard/widgets/LazyDashboardWidgets";
import { WidgetSkeleton } from "@/components/dashboard/widgets/WidgetSkeleton";
import { getDashboardMarketSnapshot } from "@/lib/market-orchestrator";
import { PageContainer } from "@/src/design";
import { LayoutDashboard } from "lucide-react";
import { Suspense } from "react";

/**
 * Dashboard shell — single consumer of the central market orchestrator.
 * Widgets receive typed slices only; they do not fetch shared dashboard context.
 * Market Snapshot / Pulse / Intelligence use lightweight dashboardContext
 * (no runTradingPipeline / fetchMarketBreadth on the render path).
 * MarketHeatmap receives snapshot.heatmap as initial so it skips the mount-time API scan.
 *
 * Above-fold critical widgets hydrate immediately; below-fold widgets load via
 * next/dynamic after the dashboard becomes interactive.
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
            <LazyMarketHeatmap
              initial={snapshot.heatmap}
              defaultUniverse="nse"
            />
          ),
          "market-breadth": (
            <LazyMarketBreadthWidget breadth={snapshot.breadth} />
          ),
          "market-movers": (
            <LazyMarketMoversWidget breadth={snapshot.breadth} />
          ),
          "ai-opportunities": (
            <Suspense fallback={<WidgetSkeleton label="AI Opportunities" className="h-72" />}>
              <AiOpportunitiesWidget
                recommendations={snapshot.opportunities.recommendations}
              />
            </Suspense>
          ),
          "ai-alerts": <LazyAiAlertsCard />,
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
            <LazyComingSoonWidget
              title="Portfolio Health"
              subtitle="Open Portfolio Doctor for live health metrics"
            />
          ),
          "research-summary": <LazyResearchSummaryCard />,
          "ai-brief": (
            <LazyComingSoonWidget
              title="AI Market Brief"
              subtitle="Briefing surface reserved for layout"
            />
          ),
          "economic-calendar": (
            <LazyComingSoonWidget title="Economic Calendar" />
          ),
          "results-calendar": (
            <LazyResultsCalendarWidget results={snapshot.upcomingResults} />
          ),
          "market-news": <LazyMarketNewsWidget news={snapshot.news} />,
          "earnings-intelligence": (
            <LazyEarningsIntelligenceWidget results={snapshot.upcomingResults} />
          ),
          "validation-center": <LazyValidationCenterCard />,
        }}
      />
    </PageContainer>
  );
}
