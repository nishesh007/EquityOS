import {
  DashboardWidget,
  PersonalizedDashboard,
} from "@/components/dashboard/workspace";
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
 * Dashboard shell — no top-level data await.
 * Widget trees are DashboardWidget children (Flight children), not a Record prop,
 * so chrome hydrates first and above-fold Suspense streams before lower bands.
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
      <PersonalizedDashboard header={header}>
        {/* —— Market (above-fold) — stream first —— */}
        <DashboardWidget id="market-snapshot">
          <Slot label="Market Snapshot" heightClass="h-64">
            <MarketSnapshotSlot />
          </Slot>
        </DashboardWidget>
        <DashboardWidget id="market-pulse">
          <Slot label="Market Pulse" heightClass="h-56">
            <MarketPulseSlot />
          </Slot>
        </DashboardWidget>
        <DashboardWidget id="market-heatmap">
          <LazyMarketHeatmap initial={null} defaultUniverse="nse" />
        </DashboardWidget>
        <DashboardWidget id="market-breadth">
          <Slot label="Market Breadth" heightClass="h-72">
            <MarketBreadthSlot />
          </Slot>
        </DashboardWidget>
        <DashboardWidget id="market-movers">
          <Slot label="Market Movers" heightClass="h-48">
            <MarketMoversSlot />
          </Slot>
        </DashboardWidget>

        {/* —— AI —— */}
        <DashboardWidget id="ai-opportunities">
          <Slot label="Institutional Opportunities" heightClass="min-h-72">
            <AiOpportunitiesSlot />
          </Slot>
        </DashboardWidget>
        <DashboardWidget id="ai-alerts">
          <LazyAiAlertsCard />
        </DashboardWidget>
        <DashboardWidget id="ai-brief">
          <LazyComingSoonWidget
            title="AI Market Brief"
            subtitle="Briefing surface reserved for layout"
          />
        </DashboardWidget>

        {/* —— Portfolio / Watchlist —— */}
        <DashboardWidget id="portfolio-summary">
          <Slot label="Portfolio" heightClass="h-56">
            <PortfolioSummarySlot />
          </Slot>
        </DashboardWidget>
        <DashboardWidget id="watchlist">
          <Slot label="Watchlist" heightClass="h-48">
            <WatchlistSlot />
          </Slot>
        </DashboardWidget>
        <DashboardWidget id="portfolio-health">
          <LazyComingSoonWidget
            title="Portfolio Health"
            subtitle="Open Portfolio Doctor for live health metrics"
          />
        </DashboardWidget>

        {/* —— Research / News / Calendar —— */}
        <DashboardWidget id="research-summary">
          <LazyResearchSummaryCard />
        </DashboardWidget>
        <DashboardWidget id="economic-calendar">
          <LazyComingSoonWidget title="Economic Calendar" />
        </DashboardWidget>
        <DashboardWidget id="results-calendar">
          <Slot label="Results Calendar" heightClass="h-48">
            <ResultsCalendarSlot />
          </Slot>
        </DashboardWidget>
        <DashboardWidget id="market-news">
          <Slot label="News" heightClass="h-48">
            <MarketNewsSlot />
          </Slot>
        </DashboardWidget>

        {/* —— Bottom band —— */}
        <DashboardWidget id="earnings-intelligence">
          <Slot label="Earnings" heightClass="h-40">
            <EarningsIntelligenceSlot />
          </Slot>
        </DashboardWidget>
        <DashboardWidget id="validation-center">
          <LazyValidationCenterCard />
        </DashboardWidget>
      </PersonalizedDashboard>
    </PageContainer>
  );
}
