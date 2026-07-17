/**
 * Sprint 9F.1.R8 – Institutional Integration & Sprint Freeze public API.
 */

export {
  getRecommendationPlatformHealth,
  validateRecommendationPlatform,
  getRecommendationIntegrationStatus,
  isSprint9F1Frozen,
  bindRecommendationIntegrationSnapshotLister,
  SPRINT_9F1_STATUS,
  RECOMMENDATION_PLATFORM_TERMINOLOGY,
  RECOMMENDATION_FORBIDDEN_TERMINOLOGY,
} from "./RecommendationPlatformIntegration";
export type {
  RecommendationPlatformHealth,
  RecommendationPlatformValidation,
  RecommendationPlatformCheck,
  RecommendationIntegrationStatus,
  RecommendationSurfaceIntegration,
} from "./RecommendationPlatformIntegration";
