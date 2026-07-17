/**
 * Decision Journal — permanent record of what AI knew at generation time.
 * Built only from immutable R1 snapshot fields. Never rewritten.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type { RecommendationDecisionJournal } from "./RecommendationReplayModels";
import {
  extractValidationScore,
  freezeRecord,
} from "./RecommendationReplayModels";

function asRecord(
  value: RecommendationSnapshot["technicalSnapshot"]
): Record<string, unknown> {
  return freezeRecord({ ...(value as Record<string, unknown>) });
}

/**
 * Compose the decision journal from an immutable snapshot.
 * Snapshot contents are referenced, never mutated.
 */
export function buildDecisionJournal(
  snapshot: RecommendationSnapshot
): RecommendationDecisionJournal {
  return Object.freeze({
    recommendationId: snapshot.recommendationId,
    recommendationCreatedAt: snapshot.generatedAt,
    originalConviction: snapshot.originalConviction,
    originalTrust: snapshot.originalTrust,
    originalValidation: extractValidationScore(snapshot),
    originalEntryLow: snapshot.entryRange.low,
    originalEntryHigh: snapshot.entryRange.high,
    originalStop: snapshot.stopLoss,
    originalTargets: Object.freeze(snapshot.targets.map((t) => t.price)),
    originalReasons: Object.freeze([
      ...(snapshot.reasons.length > 0
        ? snapshot.reasons
        : snapshot.convictionDrivers),
    ]),
    originalIndicators: asRecord(snapshot.technicalSnapshot),
    originalMarketState: asRecord(snapshot.marketSnapshot),
    originalSectorState: asRecord(snapshot.sectorSnapshot),
    originalTechnicalState: asRecord(snapshot.technicalSnapshot),
    originalFundamentalState: asRecord(snapshot.fundamentalSnapshot),
    aiVersion: snapshot.aiVersion,
    modelVersion: snapshot.aiVersion,
    timestamp: snapshot.generatedAt,
    generatedByEngine: snapshot.generatedByEngine,
    strategy: snapshot.strategy,
    companySymbol: snapshot.company.symbol,
    companyName: snapshot.company.name,
  });
}

export class RecommendationDecisionJournalEngine {
  build = buildDecisionJournal;
}
