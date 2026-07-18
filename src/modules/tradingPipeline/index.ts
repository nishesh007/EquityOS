/**
 * Trading Pipeline module public exports (Sprint 11B.2D).
 */

export type {
  PipelineConfidenceWeights,
  PipelineHealthGrade,
  PipelineHealthWeights,
  PipelineMetricsSnapshot,
  PipelineStageName,
  PipelineStageRecord,
  PipelineStageStatus,
  PipelineValidationIssue,
  PipelineValidationResult,
  TradingPipelineConfig,
  TradingPipelineListener,
  TradingPipelineResult,
  TradingPipelineRunOptions,
  TradingPipelineServiceOptions,
} from "./TradingPipelineTypes";

export {
  DEFAULT_PIPELINE_CONFIDENCE_WEIGHTS,
  DEFAULT_PIPELINE_HEALTH_WEIGHTS,
  DEFAULT_TRADING_PIPELINE_CONFIG,
  PIPELINE_STAGE_ORDER,
} from "./TradingPipelineTypes";

export {
  TradingPipeline,
  getTradingPipeline,
  resetTradingPipeline,
} from "./TradingPipeline";

export {
  TradingPipelineService,
  getTradingPipelineMetrics,
  getTradingPipelineService,
  refreshTradingPipeline,
  resetTradingPipelineService,
  runTradingPipeline,
  subscribeTradingPipeline,
  validateTradingPipeline,
} from "./TradingPipelineService";

export {
  PipelineMetrics,
  createEmptyPipelineMetrics,
  summarizeStageMetrics,
} from "./PipelineMetrics";

export {
  PipelineValidator,
  validatePipelineResult,
} from "./PipelineValidator";

export {
  buildPipelineCacheKey,
  calculatePipelineConfidence,
  calculatePipelineHealth,
  classifyPipelineHealthGrade,
  collectPipelineWarnings,
  createFallbackInstitutionalContext,
  createFallbackPipelineResult,
  createStageRecord,
  hasMissingBreadth,
  hasMissingSector,
  hasMissingVolatility,
  isContextUsable,
  resolveTradingPipelineConfig,
} from "./TradingPipelineUtils";
