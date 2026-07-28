/**
 * Server-only Calibration Engine barrel.
 * Import from `@/lib/recommendations/calibration` in API routes / server code only —
 * do not re-export from the client-safe recommendations index.
 */
export {
  buildCalibrationReport,
  runRecommendationCalibration,
  estimateExcursions,
  computeBucketMetrics,
} from "@/lib/recommendations/calibration/engine";
export type {
  CalibrationReport,
  CalibrationBucket,
  CalibrationBucketMetrics,
  CalibrationDimension,
  ThresholdSuggestion,
  ThresholdKey,
} from "@/lib/recommendations/calibration/types";
