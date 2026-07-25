/**
 * Executive Summary Engine (Sprint 10D.4) — template / rules based.
 */

import { getEventCategory, getEventTypeLabel } from "@/constants/eventTypes";
import type { EventIntelligenceEvent } from "@/types/event";
import type {
  ExecutiveSummary,
  MarketBiasAnalysis,
  SectorImpactAnalysis,
} from "@/types/eventIntelligence";

export function computeExecutiveSummary(
  event: EventIntelligenceEvent,
  sectorMatrix: SectorImpactAnalysis,
  marketBias: MarketBiasAnalysis,
  impactScore: number,
  riskLabel: string
): ExecutiveSummary {
  const typeLabel = getEventTypeLabel(event.eventType);
  const category = getEventCategory(event.eventType);
  const authority =
    event.macroDetail?.authority ??
    event.company ??
    event.exchange;
  const when = event.time
    ? `${event.date} ${event.time} IST`
    : `${event.date} (session / TBA)`;

  const overview = `${typeLabel} from ${authority} scheduled for ${when}. Importance ${event.importance}; impact score ${impactScore}/100 with ${marketBias.bias} market bias.`;

  const whyItMatters =
    event.expectedImpact ??
    event.macroDetail?.marketImpact.narrative ??
    (category === "results"
      ? `${event.ticker ?? event.company ?? "Issuer"} results can reprice the stock and peer set through revenue, margin and guidance surprises.`
      : category === "corporate_actions"
        ? `Corporate action terms affect shareholder value, liquidity and near-term positioning in ${event.ticker ?? "the name"}.`
        : `${typeLabel} is a market-moving catalyst for rates, FX and equity sector rotation.`);

  const keyThingsToWatch: string[] = [];
  if (event.macroDetail?.indicator) {
    const ind = event.macroDetail.indicator;
    keyThingsToWatch.push(
      `Consensus ${ind.consensus ?? "—"} ${ind.unit} vs previous ${ind.previous ?? "—"} ${ind.unit}`
    );
    if (ind.forecast != null) {
      keyThingsToWatch.push(`Street forecast ${ind.forecast} ${ind.unit}`);
    }
  }
  if (event.earningsDetail) {
    const e = event.earningsDetail.estimates;
    keyThingsToWatch.push(
      `Expected revenue ₹${e.expectedRevenueCr?.toLocaleString("en-IN") ?? "—"} Cr · EPS ${e.expectedEps ?? "—"}`
    );
    if (e.managementGuidance) keyThingsToWatch.push("Management guidance tone");
  }
  if (event.corporateActionDetail?.kind === "dividend") {
    keyThingsToWatch.push(
      `Dividend ₹${event.corporateActionDetail.amountPerShare} · yield ${event.corporateActionDetail.yieldPct ?? "—"}%`
    );
  }
  if (event.macroDetail?.marketImpact.affectedIndices.length) {
    keyThingsToWatch.push(
      `Index sensitivity: ${event.macroDetail.marketImpact.affectedIndices.join(", ")}`
    );
  }
  if (keyThingsToWatch.length === 0) {
    keyThingsToWatch.push(
      "Confirm release timing",
      "Map portfolio exposure",
      `Monitor ${marketBias.bias} bias invalidation`
    );
  }

  const primaryBeneficiaries =
    sectorMatrix.primaryBeneficiaries.length > 0
      ? sectorMatrix.primaryBeneficiaries
      : event.affectedSectors.filter((s) => s.toLowerCase() !== "all").slice(0, 5);

  const primaryRisks =
    sectorMatrix.primaryRisks.length > 0
      ? sectorMatrix.primaryRisks
      : event.macroDetail?.sectorImpact.negative.slice(0, 5) ?? [];

  const narrative = [
    overview,
    whyItMatters,
    `Risk rating ${riskLabel}. Watch: ${keyThingsToWatch.slice(0, 2).join("; ")}.`,
  ].join(" ");

  return {
    overview,
    whyItMatters,
    keyThingsToWatch,
    primaryBeneficiaries,
    primaryRisks:
      primaryRisks.length > 0
        ? primaryRisks
        : [`${riskLabel} event risk if surprise vs consensus`],
    narrative,
  };
}

export const summaryEngine = {
  compute: computeExecutiveSummary,
};
