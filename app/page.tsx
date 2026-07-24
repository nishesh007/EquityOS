import { PersonalizedDashboard } from "@/components/dashboard/workspace";
import {
  AiOpportunitiesSlot,
  EarningsIntelligenceSlot,
  MarketBreadthSlot,
  MarketMoversSlot,
  MarketNewsSlot,
  MarketPulseSlot,
  MarketSnapshotSlot,
  PortfolioSummarySlot,
  ResultsCalendarSlot,
  WatchlistSlot,
} from "@/components/dashboard/widgets/DashboardAsyncSlots";
import {
  LazyAiAlertsCard,
  LazyComingSoonWidget,
  LazyMarketHeatmap,
  LazyResearchSummaryCard,
  LazyValidationCenterCard,
} from "@/components/dashboard/widgets/LazyDashboardWidgets";
import { WidgetSkeleton } from "@/components/dashboard/widgets/WidgetSkeleton";
import { PageContainer } from "@/src/design/components/PageContainer";
import { LayoutDashboard } from "lucide-react";
import { Suspense, type ReactNode } from "react";

/**
 * Dashboard shell — returns HTML immediately (no top-level data await).
 *
 * Streaming rules:
 * - Heatmap: client-only (initial=null), never SSR-blocked
 * - AI opportunities / OE: persisted store read inside Suspense
 * - Market Intelligence: cache-only via above-fold context
 * - Portfolio / watchlist / news / results: isolated Suspense slices
 * - Above-fold snapshot/pulse: Suspense with skeleton (shell still paints first)
 */
function Slot({
  label,
  heightClass,
  children,
}: {
  label: string;
  heightClass: string;
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<WidgetSkeleton label={label} className={heightClass} />}>
      {children}
    </Suspense>
  );
}

export default function DashboardPage() {
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
            <Slot label="Market Snapshot" heightClass="h-64">
              <MarketSnapshotSlot />
            </Slot>
          ),
          "market-pulse": (
            <Slot label="Market Pulse" heightClass="h-56">
              <MarketPulseSlot />
            </Slot>
          ),
          "market-heatmap": (
            <LazyMarketHeatmap initial={null} defaultUniverse="nse" />
          ),
          "market-breadth": (
            <Slot label="Market Breadth" heightClass="h-72">
              <MarketBreadthSlot />
            </Slot>
          ),
          "market-movers": (
            <Slot label="Market Movers" heightClass="h-48">
              <MarketMoversSlot />
            </Slot>
          ),
          "ai-opportunities": (
            <Slot label="AI Opportunities" heightClass="h-72">
              <AiOpportunitiesSlot />
            </Slot>
          ),
          "ai-alerts": <LazyAiAlertsCard />,
          "portfolio-summary": (
            <Slot label="Portfolio" heightClass="h-56">
              <PortfolioSummarySlot />
            </Slot>
          ),
          watchlist: (
            <Slot label="Watchlist" heightClass="h-48">
              <WatchlistSlot />
            </Slot>
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
            <Slot label="Results Calendar" heightClass="h-48">
              <ResultsCalendarSlot />
            </Slot>
          ),
          "market-news": (
            <Slot label="News" heightClass="h-48">
              <MarketNewsSlot />
            </Slot>
          ),
          "earnings-intelligence": (
            <Slot label="Earnings" heightClass="h-40">
              <EarningsIntelligenceSlot />
            </Slot>
          ),
          "validation-center": <LazyValidationCenterCard />,
        }}
      />
    </PageContainer>
  );
}
