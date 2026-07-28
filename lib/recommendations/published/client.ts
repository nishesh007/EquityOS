/**
 * Browser-safe Published Recommendations surface.
 * No pg, node:*, fs, dns, net, or tls — safe for Client Components.
 */

import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import {
  isPublishedIntegrityValid,
  validatePublishedIntegrity,
  assertPublishedConsumerIntegrity,
  expectedScanIdForState,
} from "@/lib/recommendations/published/integrity";
import type { PublishedRecommendationsBundle } from "@/lib/recommendations/published/types";

export {
  PUBLISHED_RECOMMENDATION_VERSION,
  PublishedIntegrityError,
} from "@/lib/recommendations/published/types";
export type {
  PublishedRecommendationsBundle,
  PublishedConsumerId,
  PublishedConsumerStatus,
  PublishedIntegrityEnvelope,
} from "@/lib/recommendations/published/types";

export {
  validatePublishedIntegrity,
  isPublishedIntegrityValid,
  assertPublishedConsumerIntegrity,
  expectedScanIdForState,
};

export { buildPublishedScanId } from "@/lib/recommendations/published/scan-id";

/** Sync read of published bundle already attached to hydrated OE state. */
export function readPublishedFromState(
  state: OpportunityEngineState
): PublishedRecommendationsBundle | null {
  const bundle = state.published ?? null;
  if (!bundle) return null;
  if (!isPublishedIntegrityValid(bundle, state)) return null;
  return bundle;
}
