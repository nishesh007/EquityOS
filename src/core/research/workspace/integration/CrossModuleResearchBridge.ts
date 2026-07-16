/**
 * Cross-module research bridge (Sprint 10A.R5).
 * Ingests read-only event bags from existing engines — no recalculation.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { recordTimelineEvent } from "./ResearchTimelineEngine";
import {
  CROSS_MODULE_LINKS,
  type CrossModuleEventBag,
  type CrossModuleEventLine,
  type CrossModuleLink,
  type ResearchTimelineEntry,
  type TimelineEventKind,
} from "./ResearchIntegrationModels";

function moduleRoute(module: CrossModuleLink, ticker?: string | null): string {
  switch (module) {
    case "earnings":
      return "/results";
    case "alerts":
      return "/alerts";
    case "screener":
      return "/ai/screener";
    case "portfolio":
      return "/portfolio";
    case "watchlist":
      return "/watchlist";
    case "opportunity":
      return "/opportunities";
    case "validation":
      return "/validation";
    case "trust":
      return "/validation";
    case "research":
      return ticker ? `/company/${ticker}` : "/research";
    default:
      return "/research";
  }
}

function ingestLines(
  workspaceId: string,
  module: CrossModuleLink,
  lines?: CrossModuleEventLine[] | null
): ResearchTimelineEntry[] {
  if (!Array.isArray(lines)) return [];
  const created: ResearchTimelineEntry[] = [];

  for (const line of lines) {
    const ticker = line.ticker
      ? safeWorkspaceText(line.ticker, "").toUpperCase()
      : null;
    const kind = line.kind;
    created.push(
      recordTimelineEvent({
        workspaceId,
        ticker,
        kind,
        module,
        label: safeWorkspaceText(line.label, `${module} event`),
        detail: safeWorkspaceText(line.detail, line.label),
        route: line.route ?? moduleRoute(module, ticker),
      })
    );
  }
  return created;
}

export function ingestCrossModuleEvents(
  bag: CrossModuleEventBag
): ResearchTimelineEntry[] {
  const workspaceId = safeWorkspaceText(bag.workspaceId, "").toLowerCase();
  if (!workspaceId) return [];

  const created: ResearchTimelineEntry[] = [];
  for (const module of CROSS_MODULE_LINKS) {
    created.push(...ingestLines(workspaceId, module, bag[module]));
  }
  return created;
}

export interface CrossModuleLinkStatus {
  module: CrossModuleLink;
  linked: boolean;
  eventCount: number;
  route: string;
}

export function getCrossModuleLinks(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
}): CrossModuleLinkStatus[] {
  const ticker = options?.ticker
    ? safeWorkspaceText(options.ticker, "").toUpperCase()
    : null;

  return CROSS_MODULE_LINKS.map((module) => ({
    module,
    linked: true,
    eventCount: 0,
    route: moduleRoute(module, ticker),
  }));
}

export function buildCrossModuleEventBag(input: {
  workspaceId: string;
  ticker?: string | null;
  earningsLines?: string[] | null;
  alertLines?: string[] | null;
  screenerLines?: string[] | null;
  portfolioLines?: string[] | null;
  watchlistLines?: string[] | null;
  opportunityLines?: string[] | null;
  validationLines?: string[] | null;
  trustLines?: string[] | null;
}): CrossModuleEventBag {
  const ticker = input.ticker
    ? safeWorkspaceText(input.ticker, "").toUpperCase()
    : null;
  const mapLines = (
    module: CrossModuleLink,
    kind: TimelineEventKind,
    lines?: string[] | null
  ): CrossModuleEventLine[] | undefined => {
    if (!Array.isArray(lines) || lines.length === 0) return undefined;
    return lines.map((line) => ({
      module,
      kind,
      ticker,
      label: safeWorkspaceText(line, `${module} signal`),
      detail: safeWorkspaceText(line, ""),
      route: moduleRoute(module, ticker),
    }));
  };

  return {
    workspaceId: safeWorkspaceText(input.workspaceId, "").toLowerCase(),
    earnings: mapLines("earnings", "earnings_released", input.earningsLines),
    alerts: mapLines("alerts", "alert_triggered", input.alertLines),
    screener: mapLines("screener", "screen_matched", input.screenerLines),
    portfolio: mapLines("portfolio", "research_created", input.portfolioLines),
    watchlist: mapLines("watchlist", "research_created", input.watchlistLines),
    opportunity: mapLines(
      "opportunity",
      "opportunity_detected",
      input.opportunityLines
    ),
    validation: mapLines(
      "validation",
      "validation_updated",
      input.validationLines
    ),
    trust: mapLines("trust", "trust_updated", input.trustLines),
    research: mapLines("research", "research_created", [
      ticker ? `Research workspace active · ${ticker}` : "Research workspace active",
    ]),
  };
}

export function resetCrossModuleBridge(): void {
  /* timeline store reset via resetResearchTimeline */
}

export class CrossModuleResearchBridge {
  ingestCrossModuleEvents = ingestCrossModuleEvents;
  buildCrossModuleEventBag = buildCrossModuleEventBag;
  getCrossModuleLinks = getCrossModuleLinks;
}
