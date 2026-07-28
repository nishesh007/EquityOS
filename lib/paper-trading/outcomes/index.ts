/**
 * Server-only Trade Outcome Engine barrel.
 * Import from `@/lib/paper-trading/outcomes` in API / server code.
 */

export {
  buildTradeOutcomeReport,
  runTradeOutcomeEngine,
  toTradeOutcomeRecord,
} from "@/lib/paper-trading/outcomes/engine";
export {
  applyPriceExcursion,
  computeTradeExcursions,
  mapPaperExitReason,
  emptyExitReasonDistribution,
  TRADE_OUTCOME_EXIT_REASONS,
  isTargetExit,
  isStopLossExit,
  resolveHorizon,
  holdingDaysFromMs,
} from "@/lib/paper-trading/outcomes/lifecycle";
export type {
  TradeOutcomeExitReason,
  TradeOutcomeRecord,
  StrategyOutcomeSummary,
  ExcursionStatistics,
  TradeOutcomeReport,
} from "@/lib/paper-trading/outcomes/types";
