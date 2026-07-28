import type { InsightsResearchTerminal } from "@/lib/ai/insights-research";
import type { InstitutionalStrategySlot } from "@/lib/recommendations/institutional-strategy-dashboard";
import type { SharedRecommendation } from "@/lib/recommendations/shared-recommendation";

/** Bump when published row shape or materialization contract changes. */
export const PUBLISHED_RECOMMENDATION_VERSION = "1.0.0";

export interface PublishedIntegrityEnvelope {
  sessionId: string;
  scanId: string;
  generatedAt: string;
  recommendationVersion: string;
}

/** Canonical published dataset — materialized once per OE scan. */
export interface PublishedRecommendationsBundle extends PublishedIntegrityEnvelope {
  recommendations: SharedRecommendation[];
  strategyDashboard: InstitutionalStrategySlot[];
  researchTerminal: InsightsResearchTerminal;
}

export type PublishedConsumerId =
  | "api"
  | "dashboard"
  | "paper_trading"
  | "research"
  | "historical_replay"
  | "orchestrator";

export interface PublishedConsumerStatus {
  consumer: PublishedConsumerId;
  status: "ok" | "rejected" | "empty";
  reason?: string;
}

export class PublishedIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublishedIntegrityError";
  }
}
