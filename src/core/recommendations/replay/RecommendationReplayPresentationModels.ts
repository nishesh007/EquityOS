/**
 * Presentation models for Recommendation Replay, Journal, Audit, and History.
 */

import type {
  RecommendationAuditRecord,
  RecommendationDecisionJournal,
  RecommendationReplayBundle,
} from "./RecommendationReplayModels";

export const RECOMMENDATION_REPLAY_EMPTY = {
  noReplayAvailable: "No Replay Available",
  noJournal: "No Journal",
  noAudit: "No Audit",
  awaitingRecommendationHistory: "Awaiting Recommendation History",
} as const;

export type RecommendationReplayEmptyMessage =
  (typeof RECOMMENDATION_REPLAY_EMPTY)[keyof typeof RECOMMENDATION_REPLAY_EMPTY];

export type RecommendationReplaySurface =
  | "dashboard"
  | "research"
  | "company"
  | "recommendation_center"
  | "history"
  | "replay"
  | "portfolio"
  | "watchlists";

export interface RecommendationReplayCardPresentation {
  recommendationId: string;
  symbol: string;
  company: string;
  originalConviction: number;
  currentHealth: number | null;
  outcome: string;
  verdict: string;
  empty: boolean;
  emptyMessage: RecommendationReplayEmptyMessage | null;
}

export interface RecommendationReplayDetailPresentation {
  card: RecommendationReplayCardPresentation;
  journal: RecommendationDecisionJournal | null;
  audit: RecommendationAuditRecord | null;
  lessons: string[];
  turningPoints: string[];
  empty: boolean;
  emptyMessage: RecommendationReplayEmptyMessage | null;
}

export interface RecommendationReplaySurfaceBundle {
  surface: RecommendationReplaySurface;
  cards: RecommendationReplayCardPresentation[];
  empty: boolean;
  emptyMessage: RecommendationReplayEmptyMessage;
}

export function presentRecommendationReplayCard(
  replay: RecommendationReplayBundle | undefined
): RecommendationReplayCardPresentation {
  if (!replay) {
    return {
      recommendationId: "",
      symbol: "",
      company: "",
      originalConviction: 0,
      currentHealth: null,
      outcome: RECOMMENDATION_REPLAY_EMPTY.noReplayAvailable,
      verdict: RECOMMENDATION_REPLAY_EMPTY.noAudit,
      empty: true,
      emptyMessage: RECOMMENDATION_REPLAY_EMPTY.noReplayAvailable,
    };
  }

  return {
    recommendationId: replay.recommendationId,
    symbol: replay.snapshot.company.symbol,
    company: replay.snapshot.company.name,
    originalConviction: replay.journal.originalConviction,
    currentHealth: replay.comparison.currentHealth,
    outcome: replay.outcome,
    verdict: replay.audit.executiveReview.recommendationVerdict,
    empty: false,
    emptyMessage: null,
  };
}

export function presentRecommendationReplayDetail(
  replay: RecommendationReplayBundle | undefined
): RecommendationReplayDetailPresentation {
  if (!replay) {
    return {
      card: presentRecommendationReplayCard(undefined),
      journal: null,
      audit: null,
      lessons: [],
      turningPoints: [],
      empty: true,
      emptyMessage: RECOMMENDATION_REPLAY_EMPTY.awaitingRecommendationHistory,
    };
  }

  return {
    card: presentRecommendationReplayCard(replay),
    journal: replay.journal,
    audit: replay.audit,
    lessons: [...replay.lessons],
    turningPoints: [...replay.audit.executiveReview.majorTurningPoints],
    empty: false,
    emptyMessage: null,
  };
}

export function presentDecisionJournal(
  journal: RecommendationDecisionJournal | undefined
): {
  journal: RecommendationDecisionJournal | null;
  empty: boolean;
  emptyMessage: RecommendationReplayEmptyMessage | null;
} {
  if (!journal) {
    return {
      journal: null,
      empty: true,
      emptyMessage: RECOMMENDATION_REPLAY_EMPTY.noJournal,
    };
  }
  return { journal, empty: false, emptyMessage: null };
}

export function presentRecommendationAudit(
  audit: RecommendationAuditRecord | undefined
): {
  audit: RecommendationAuditRecord | null;
  empty: boolean;
  emptyMessage: RecommendationReplayEmptyMessage | null;
} {
  if (!audit) {
    return {
      audit: null,
      empty: true,
      emptyMessage: RECOMMENDATION_REPLAY_EMPTY.noAudit,
    };
  }
  return { audit, empty: false, emptyMessage: null };
}

export function presentRecommendationReplayForSurface(
  surface: RecommendationReplaySurface,
  replays: RecommendationReplayBundle[]
): RecommendationReplaySurfaceBundle {
  const cards = replays.map((replay) => presentRecommendationReplayCard(replay));
  return {
    surface,
    cards,
    empty: cards.length === 0,
    emptyMessage: RECOMMENDATION_REPLAY_EMPTY.awaitingRecommendationHistory,
  };
}
