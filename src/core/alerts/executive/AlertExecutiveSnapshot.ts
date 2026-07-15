/**
 * Alert Executive Snapshot — overview + panels composed from Center (9C.R8).
 */

import type { CenterAlert } from "../center/AlertCenterModels";
import {
  EXECUTIVE_EMPTY,
  EXECUTIVE_PANEL_LABELS,
  type ExecutiveOverview,
  type ExecutivePanel,
  type ExecutivePanelId,
} from "./AlertExecutiveModels";
import type { AlertExecutiveMetricBundle } from "./AlertExecutiveMetrics";
import {
  presentConfidenceCard,
  presentHealthCard,
  presentSummaryCard,
} from "./executive-alert-presentation";

const PANEL_MATCHERS: Record<
  ExecutivePanelId,
  (item: CenterAlert) => boolean
> = {
  portfolio_risk: (i) =>
    i.alert.inPortfolio &&
    (i.alert.priority === "Critical" ||
      i.alert.severity === "Critical" ||
      i.alert.category === "Risk" ||
      i.alert.category === "Portfolio"),
  watchlist: (i) => i.alert.inWatchlist || i.alert.category === "Watchlist",
  opportunity: (i) => i.alert.category === "Opportunity",
  research: (i) =>
    i.alert.sourceEngine === "AI Research" ||
    i.alert.sourceEngine === "Reports",
  market: (i) => i.alert.sourceEngine === "Market",
  sector: (i) =>
    Boolean(i.alert.metadata.extras?.sector) ||
    /sector/i.test(i.alert.metadata.eventType ?? ""),
  technical: (i) => i.alert.category === "Technical",
  fundamental: (i) => i.alert.category === "Fundamental",
  news: (i) =>
    i.alert.category === "News" || i.alert.sourceEngine === "News",
  corporate_action: (i) =>
    i.alert.category === "Corporate Action" ||
    i.alert.sourceEngine === "Corporate Actions",
  validation: (i) =>
    i.alert.category === "Validation" || i.alert.sourceEngine === "Validation",
  trust: (i) =>
    i.alert.category === "Trust" || i.alert.sourceEngine === "Trust",
};

export class AlertExecutiveSnapshot {
  buildOverview(
    metrics: AlertExecutiveMetricBundle,
    platformHealth: number
  ): ExecutiveOverview {
    const empty = metrics.totalAlerts === 0;
    const cards = [
      presentSummaryCard("total", "Total Alerts", metrics.totalAlerts),
      presentSummaryCard("critical", "Critical", metrics.critical),
      presentSummaryCard("high", "High Priority", metrics.highPriority),
      presentSummaryCard("portfolio", "Portfolio Alerts", metrics.portfolioAlerts),
      presentSummaryCard("watchlist", "Watchlist Alerts", metrics.watchlistAlerts),
      presentSummaryCard("unread", "Unread", metrics.unread),
      presentSummaryCard("pinned", "Pinned", metrics.pinned),
      presentSummaryCard("resolved_today", "Resolved Today", metrics.resolvedToday),
      presentSummaryCard("archived", "Archived", metrics.archived),
      presentConfidenceCard(
        "avg_confidence",
        "Average Confidence",
        metrics.averageConfidence
      ),
      presentHealthCard("platform_health", "Platform Health", platformHealth),
    ];

    return {
      totalAlerts: metrics.totalAlerts,
      critical: metrics.critical,
      highPriority: metrics.highPriority,
      portfolioAlerts: metrics.portfolioAlerts,
      watchlistAlerts: metrics.watchlistAlerts,
      unread: metrics.unread,
      pinned: metrics.pinned,
      resolvedToday: metrics.resolvedToday,
      archived: metrics.archived,
      averageConfidence: metrics.averageConfidence,
      platformHealth,
      cards,
      empty,
      emptyMessage: empty
        ? EXECUTIVE_EMPTY.awaitingAlertGeneration
        : EXECUTIVE_EMPTY.noExecutiveSummary,
    };
  }

  buildPanels(items: readonly CenterAlert[]): ExecutivePanel[] {
    const visible = items.filter((i) => i.inboxStatus !== "Deleted");
    const ids = Object.keys(PANEL_MATCHERS) as ExecutivePanelId[];

    return ids.map((id) => {
      const matched = visible.filter(PANEL_MATCHERS[id]);
      const empty = matched.length === 0;
      return {
        id,
        label: EXECUTIVE_PANEL_LABELS[id],
        count: matched.length,
        countLabel: String(matched.length),
        alerts: matched.slice(0, 25),
        empty,
        emptyMessage: EXECUTIVE_EMPTY.noAlerts,
      };
    });
  }
}
