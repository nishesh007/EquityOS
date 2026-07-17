/**
 * Recommendation Replay Engine — auditable playback of immutable recommendations.
 * Reuses R1 snapshot, R2 lifecycle, and R3 health. Never rewrites history.
 */

import type { RecommendationSnapshot } from "../RecommendationSnapshot";
import type { LivingRecommendation } from "../lifecycle/RecommendationLifecycleModels";
import type { RecommendationHealthAssessment } from "../health/RecommendationHealthModels";
import {
  buildAiLessons,
  buildRecommendationAudit,
  resolveRecommendationOutcome,
} from "./RecommendationAuditEngine";
import { buildDecisionJournal } from "./RecommendationDecisionJournal";
import type {
  CurrentMarketReplayInput,
  RecommendationReplayBundle,
} from "./RecommendationReplayModels";
import {
  freezeRecord,
  normalizeReplayTimestamp,
} from "./RecommendationReplayModels";

export interface RecommendationReplaySources {
  readonly snapshot: RecommendationSnapshot;
  readonly lifecycle?: LivingRecommendation | null;
  readonly health?: RecommendationHealthAssessment | null;
  readonly market?: CurrentMarketReplayInput;
  readonly replayedAt?: string | Date;
}

export function buildRecommendationReplay(
  sources: RecommendationReplaySources
): RecommendationReplayBundle {
  const { snapshot } = sources;
  const lifecycle = sources.lifecycle ?? null;
  const health = sources.health ?? null;
  const timeline = lifecycle?.timeline ?? [];
  const outcome = resolveRecommendationOutcome(lifecycle, health);
  const journal = buildDecisionJournal(snapshot);
  const audit = buildRecommendationAudit(
    snapshot,
    lifecycle,
    health,
    timeline,
    sources.market,
    sources.replayedAt
  );
  const lessons = buildAiLessons(snapshot, health, timeline, outcome);

  return Object.freeze({
    recommendationId: snapshot.recommendationId,
    snapshot,
    journal,
    timeline: Object.freeze([...timeline]),
    indicators: freezeRecord({
      ...(snapshot.technicalSnapshot as Record<string, unknown>),
    }),
    reasons: Object.freeze([...snapshot.reasons]),
    decision: audit.accountability,
    healthEvolution: health,
    lifecycle,
    lifecycleState: lifecycle?.state ?? null,
    healthFactors: Object.freeze([...(health?.factors ?? [])]),
    healthExplanation: health?.explanation ?? null,
    comparison: audit.comparison,
    audit,
    lessons: Object.freeze(lessons),
    outcome,
    replayedAt: normalizeReplayTimestamp(sources.replayedAt),
  });
}

export class RecommendationReplayEngine {
  private readonly replays = new Map<string, RecommendationReplayBundle>();

  replay(sources: RecommendationReplaySources): RecommendationReplayBundle {
    const bundle = buildRecommendationReplay(sources);
    this.replays.set(bundle.recommendationId, bundle);
    return bundle;
  }

  get(recommendationId: string): RecommendationReplayBundle | undefined {
    return this.replays.get(recommendationId);
  }

  list(): RecommendationReplayBundle[] {
    return [...this.replays.values()].sort(
      (a, b) =>
        Date.parse(b.replayedAt) - Date.parse(a.replayedAt) ||
        b.recommendationId.localeCompare(a.recommendationId)
    );
  }

  clear(): void {
    this.replays.clear();
  }
}
