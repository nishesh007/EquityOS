/**
 * Portfolio Alert Engine — portfolio risk & holding intelligence (Sprint 9C.R2).
 * Reuses portfolio snapshots / opportunity intersection; emits into R1 Alert Engine.
 */

import { generateAlert, registerAlertEngine } from "../AlertFacade";
import type { InstitutionalAlert } from "../AlertModels";
import {
  decidePortfolioAlerts,
  decisionToSourceEvent,
} from "./AlertDecisionEngine";
import {
  emptyIntelligenceBatch,
  INTELLIGENCE_ALERT_EMPTY,
  toAlertPresentationCard,
  type IntelligenceAlertBatch,
  type OpportunitySnapshot,
  type PortfolioSnapshot,
} from "./AlertPresentationModels";
import { deduplicateAlerts } from "./AlertDeduplicationEngine";

export interface PortfolioAlertInput {
  portfolio: PortfolioSnapshot;
  prior?: PortfolioSnapshot | null;
  holdingOpportunities?: Map<string, OpportunitySnapshot> | Record<string, OpportunitySnapshot>;
  now?: Date;
}

let lastPortfolio: PortfolioSnapshot | null = null;

export function getLastPortfolioAlertSnapshot(): PortfolioSnapshot | null {
  return lastPortfolio
    ? {
        ...lastPortfolio,
        holdings: lastPortfolio.holdings.map((h) => ({ ...h })),
      }
    : null;
}

export function resetPortfolioAlertPriorState(): void {
  lastPortfolio = null;
}

export function seedPortfolioAlertPrior(snapshot: PortfolioSnapshot): void {
  lastPortfolio = {
    ...snapshot,
    holdings: snapshot.holdings.map((h) => ({ ...h })),
  };
}

function toOppMap(
  input?: Map<string, OpportunitySnapshot> | Record<string, OpportunitySnapshot>
): Map<string, OpportunitySnapshot> {
  if (!input) return new Map();
  if (input instanceof Map) return input;
  return new Map(
    Object.entries(input).map(([k, v]) => [k.toUpperCase(), v])
  );
}

export class PortfolioAlertEngine {
  generate(input: PortfolioAlertInput): IntelligenceAlertBatch {
    registerAlertEngine();
    const now = input.now ?? new Date();
    const prior = input.prior ?? lastPortfolio;
    const oppMap = toOppMap(input.holdingOpportunities);

    if (!input.portfolio.holdings.length && prior == null) {
      // Still allow book-level risk/validation alerts
    }

    const decisions = decidePortfolioAlerts(input.portfolio, prior, oppMap);
    if (decisions.length === 0) {
      lastPortfolio = {
        ...input.portfolio,
        holdings: input.portfolio.holdings.map((h) => ({ ...h })),
      };
      return emptyIntelligenceBatch(INTELLIGENCE_ALERT_EMPTY.noPortfolio);
    }

    const collected: InstitutionalAlert[] = [];
    let created = 0;
    let deduplicated = 0;
    let grouped = 0;

    for (const decision of decisions) {
      const result = generateAlert(decisionToSourceEvent(decision), now);
      if (result.alert) collected.push(result.alert);
      if (result.created) created += 1;
      if (result.deduplicated) deduplicated += 1;
      if (result.grouped) grouped += 1;
    }

    lastPortfolio = {
      ...input.portfolio,
      holdings: input.portfolio.holdings.map((h) => ({ ...h })),
    };

    const deduped = deduplicateAlerts(collected);
    if (deduped.alerts.length === 0) {
      return emptyIntelligenceBatch(INTELLIGENCE_ALERT_EMPTY.noPortfolio);
    }

    return {
      alerts: deduped.alerts,
      cards: deduped.alerts.map((a) =>
        toAlertPresentationCard(
          a,
          typeof a.metadata.extras.kindLabel === "string"
            ? a.metadata.extras.kindLabel
            : undefined
        )
      ),
      total: deduped.alerts.length,
      created,
      deduplicated: deduplicated + deduped.merged,
      grouped,
      empty: false,
      emptyMessage: INTELLIGENCE_ALERT_EMPTY.noPortfolio,
    };
  }
}

let singleton: PortfolioAlertEngine | null = null;

export function getPortfolioAlertEngine(): PortfolioAlertEngine {
  if (!singleton) singleton = new PortfolioAlertEngine();
  return singleton;
}

export function resetPortfolioAlertEngine(): void {
  singleton = null;
  resetPortfolioAlertPriorState();
}

/** Public API — generatePortfolioAlerts() */
export function generatePortfolioAlerts(
  input: PortfolioAlertInput
): IntelligenceAlertBatch {
  try {
    return getPortfolioAlertEngine().generate(input);
  } catch {
    return emptyIntelligenceBatch(INTELLIGENCE_ALERT_EMPTY.awaitingAnalysis);
  }
}
