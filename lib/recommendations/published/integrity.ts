import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import {
  PUBLISHED_RECOMMENDATION_VERSION,
  PublishedIntegrityError,
  type PublishedConsumerId,
  type PublishedConsumerStatus,
  type PublishedIntegrityEnvelope,
  type PublishedRecommendationsBundle,
} from "@/lib/recommendations/published/types";
import { buildPublishedScanId } from "@/lib/recommendations/published/scan-id";

export function expectedScanIdForState(
  state: OpportunityEngineState
): string | null {
  if (!state.tradingDate || state.scanCount <= 0) return null;
  return buildPublishedScanId(state.tradingDate, state.scanCount);
}

export function validatePublishedIntegrity(
  bundle: PublishedIntegrityEnvelope,
  state?: OpportunityEngineState | null
): void {
  if (!bundle.sessionId?.trim()) {
    throw new PublishedIntegrityError("Published dataset missing sessionId.");
  }
  if (!bundle.scanId?.trim()) {
    throw new PublishedIntegrityError("Published dataset missing scanId.");
  }
  if (!bundle.generatedAt?.trim()) {
    throw new PublishedIntegrityError("Published dataset missing generatedAt.");
  }
  if (bundle.recommendationVersion !== PUBLISHED_RECOMMENDATION_VERSION) {
    throw new PublishedIntegrityError(
      `Published recommendationVersion mismatch: expected ${PUBLISHED_RECOMMENDATION_VERSION}, got ${bundle.recommendationVersion}.`
    );
  }

  if (!state) return;

  if (state.tradingDate && bundle.sessionId !== state.tradingDate) {
    throw new PublishedIntegrityError(
      `Published sessionId mismatch: expected ${state.tradingDate}, got ${bundle.sessionId}.`
    );
  }

  const expectedScanId = expectedScanIdForState(state);
  if (expectedScanId && bundle.scanId !== expectedScanId) {
    throw new PublishedIntegrityError(
      `Published scanId mismatch: expected ${expectedScanId}, got ${bundle.scanId}.`
    );
  }
}

export function isPublishedIntegrityValid(
  bundle: PublishedIntegrityEnvelope | null | undefined,
  state?: OpportunityEngineState | null
): boolean {
  if (!bundle) return false;
  try {
    validatePublishedIntegrity(bundle, state);
    return true;
  } catch {
    return false;
  }
}

export function assertPublishedConsumerIntegrity(
  consumer: PublishedConsumerId,
  bundle: PublishedRecommendationsBundle | null | undefined,
  state?: OpportunityEngineState | null
): PublishedConsumerStatus {
  if (!bundle) {
    return {
      consumer,
      status: "empty",
      reason: "No published dataset available.",
    };
  }
  try {
    validatePublishedIntegrity(bundle, state);
    return { consumer, status: "ok" };
  } catch (error) {
    return {
      consumer,
      status: "rejected",
      reason:
        error instanceof PublishedIntegrityError
          ? error.message
          : "Published integrity validation failed.",
    };
  }
}
