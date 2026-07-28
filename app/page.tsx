import {
  DashboardWidget,
  PersonalizedDashboard,
} from "@/components/dashboard/workspace";
import { ExecutiveIntelligenceLayer } from "@/components/dashboard/executive";
import {
  AiOpportunitiesSlot,
  EarningsIntelligenceSlot,
  MarketBreadthSlot,
  MarketInternalsSlot,
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
import { EventIntelligenceDashboardWidget } from "@/components/dashboard/EventIntelligenceDashboardWidget";
import { MarketEventAlertRibbon } from "@/components/dashboard/MarketEventAlertRibbon";
import { WidgetSkeleton } from "@/components/dashboard/widgets/WidgetSkeleton";
import { PageContainer } from "@/src/design/components/PageContainer";
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
  const executive = (
    <>
      {/* Sprint 10D.5.2 — always-visible Market Event Alert under workspace header */}
      <MarketEventAlertRibbon />
      <Suspense
        fallback={
          <WidgetSkeleton label="Executive Intelligence" className="mb-3 h-28" />
        }
      >
        <ExecutiveIntelligenceLayer />
      </Suspense>
    </>
  );

  return (
    <PageContainer>
      <PersonalizedDashboard executive={executive}>
        {/* —— Market (above-fold) — stream first —— */}
        <DashboardWidget id="market-snapshot">
          <Slot label="Market Snapshot" heightClass="h-64">
            <MarketSnapshotSlot />
          </Slot>
        </DashboardWidget>
        <DashboardWidget id="market-internals">
          <Slot label="Market Internals" heightClass="h-48">
            <MarketInternalsSlot />
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
            subtitle="Live briefing is in the executive header strip above"
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
            subtitle="Data unavailable here — open Portfolio for live health metrics"
          />
        </DashboardWidget>

        {/* —— Research / News / Calendar —— */}
        <DashboardWidget id="research-summary">
          <LazyResearchSummaryCard />
        </DashboardWidget>
        <DashboardWidget id="economic-calendar">
          <EventIntelligenceDashboardWidget />
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
