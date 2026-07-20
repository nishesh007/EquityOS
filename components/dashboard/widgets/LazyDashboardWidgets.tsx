"use client";

import dynamic from "next/dynamic";
import { WidgetSkeleton } from "@/components/dashboard/widgets/WidgetSkeleton";

/**
 * Below-fold / non-critical dashboard widgets.
 * Client-only leaves use ssr: false; shared presentation keeps SSR.
 */

export const LazyMarketHeatmap = dynamic(
  () =>
    import("@/components/dashboard/market-heatmap").then(
      (mod) => mod.MarketHeatmap
    ),
  {
    ssr: false,
    loading: () => (
      <WidgetSkeleton label="Sector Heatmap" className="h-96" />
    ),
  }
);

/** Market Internals + Sector Breadth + movers lists + 52-Week Extremes */
export const LazyMarketBreadthWidget = dynamic(
  () =>
    import("@/components/dashboard/MarketBreadth").then(
      (mod) => mod.MarketBreadth
    ),
  {
    ssr: false,
    loading: () => (
      <WidgetSkeleton label="Market Breadth" className="h-72" />
    ),
  }
);

export const LazyMarketMoversWidget = dynamic(
  () =>
    import("./DeferredDashboardWidgets").then((mod) => mod.MarketMoversWidget),
  {
    loading: () => (
      <WidgetSkeleton label="Market Movers" className="h-48" />
    ),
  }
);

export const LazyResultsCalendarWidget = dynamic(
  () =>
    import("./DeferredDashboardWidgets").then(
      (mod) => mod.ResultsCalendarWidget
    ),
  {
    loading: () => (
      <WidgetSkeleton label="Results Calendar" className="h-48" />
    ),
  }
);

export const LazyMarketNewsWidget = dynamic(
  () =>
    import("./DeferredDashboardWidgets").then((mod) => mod.MarketNewsWidget),
  {
    loading: () => <WidgetSkeleton label="News" className="h-48" />,
  }
);

export const LazyEarningsIntelligenceWidget = dynamic(
  () =>
    import("./DeferredDashboardWidgets").then(
      (mod) => mod.EarningsIntelligenceWidget
    ),
  {
    loading: () => <WidgetSkeleton label="Earnings" className="h-40" />,
  }
);

export const LazyComingSoonWidget = dynamic(
  () =>
    import("@/components/dashboard/workspace/ComingSoonWidget").then(
      (mod) => mod.ComingSoonWidget
    ),
  {
    ssr: false,
    loading: () => <WidgetSkeleton className="h-40" />,
  }
);

export const LazyAiAlertsCard = dynamic(
  () =>
    import("./DeferredDashboardWidgets").then((mod) => mod.AiAlertsCard),
  {
    loading: () => <WidgetSkeleton label="AI Alerts" className="h-20" />,
  }
);

export const LazyResearchSummaryCard = dynamic(
  () =>
    import("./DeferredDashboardWidgets").then(
      (mod) => mod.ResearchSummaryCard
    ),
  {
    loading: () => (
      <WidgetSkeleton label="Research Summary" className="h-20" />
    ),
  }
);

export const LazyValidationCenterCard = dynamic(
  () =>
    import("./DeferredDashboardWidgets").then(
      (mod) => mod.ValidationCenterCard
    ),
  {
    loading: () => (
      <WidgetSkeleton label="Research Confidence" className="h-20" />
    ),
  }
);
