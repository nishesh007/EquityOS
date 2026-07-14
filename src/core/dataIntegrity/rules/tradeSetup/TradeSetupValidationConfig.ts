/**
 * Institutional Trade Setup Validation — configuration.
 * All thresholds are configurable; no hardcoded magic numbers in rules.
 */

export type TradeSide = "LONG" | "SHORT";

export type TradeType = "INTRADAY" | "SWING" | "POSITIONAL" | "INVESTMENT";

export type TradeLifecycleStatus =
  | "CREATED"
  | "ACTIVE"
  | "TARGET_HIT"
  | "STOP_HIT"
  | "EXPIRED"
  | "CANCELLED"
  | "REVALIDATED"
  | "ARCHIVED";

export type TradeSetupMode = "strict" | "relaxed";

export interface TradeSetupValidationConfig {
  mode: TradeSetupMode;
  /** Minimum acceptable risk-reward ratio. */
  minRiskReward: number;
  /** Maximum acceptable RR — above this is treated as unrealistic. */
  maxRiskReward: number;
  /** Maximum risk % of entry (absolute risk / entry * 100). */
  maxRiskPercent: number;
  /** Maximum capital allocation as % of portfolio. */
  maxPositionSizePercent: number;
  /** Maximum portfolio exposure % for a single setup. */
  maxPortfolioExposurePercent: number;
  /** Maximum sector exposure % of portfolio. */
  maxSectorExposurePercent: number;
  /** Maximum risk per trade as % of portfolio capital. */
  maxRiskPerTradePercent: number;
  /** Minimum diversification score / remaining free exposure %. */
  minDiversificationPercent: number;
  /** Minimum trade setup quality score (0–100). */
  minQualityScore: number;
  /** Entry must be within this % of current market price. */
  entryNearMarketPercent: number;
  /** Maximum ATR multiple for stop distance (noise filter). */
  maxStopAtrMultiple: number;
  /** Minimum ATR multiple for stop — avoid stops inside noise. */
  minStopAtrMultiple: number;
  /** Maximum historical volatility (annualized %) before flagging. */
  maxHistoricalVolatility: number;
  /** Maximum ATR as % of price before excessive volatility. */
  maxAtrPercent: number;
  /** Maximum beta before elevated volatility flag. */
  maxBeta: number;
  /** Maximum gap risk % of entry. */
  maxGapRiskPercent: number;
  /** Maximum daily range % of price. */
  maxDailyRangePercent: number;
  /** Minimum ADX to treat trend as strong. */
  strongAdxThreshold: number;
  /** When false, reject setups against strong opposing trends. */
  allowCounterTrend: boolean;
  /** Target distance as % of entry — upper bound for "achievable". */
  maxTargetDistancePercent: number;
  /** Target distance as % of entry — lower bound for "reasonable". */
  minTargetDistancePercent: number;
  /** Minimum liquidity (volume / value) when provided. */
  minLiquidity: number;
  qualityWeights: {
    technicalAlignment: number;
    riskReward: number;
    trendAlignment: number;
    supportResistance: number;
    volatility: number;
    dataQuality: number;
  };
  supportedSides: TradeSide[];
  supportedTradeTypes: TradeType[];
  supportedLifecycleStatuses: TradeLifecycleStatus[];
}

export const DEFAULT_TRADE_SETUP_VALIDATION_CONFIG: TradeSetupValidationConfig =
  {
    mode: "strict",
    minRiskReward: 1.5,
    maxRiskReward: 10,
    maxRiskPercent: 8,
    maxPositionSizePercent: 10,
    maxPortfolioExposurePercent: 25,
    maxSectorExposurePercent: 35,
    maxRiskPerTradePercent: 2,
    minDiversificationPercent: 40,
    minQualityScore: 55,
    entryNearMarketPercent: 3,
    maxStopAtrMultiple: 4,
    minStopAtrMultiple: 0.5,
    maxHistoricalVolatility: 80,
    maxAtrPercent: 8,
    maxBeta: 2.5,
    maxGapRiskPercent: 5,
    maxDailyRangePercent: 12,
    strongAdxThreshold: 25,
    allowCounterTrend: false,
    maxTargetDistancePercent: 40,
    minTargetDistancePercent: 0.5,
    minLiquidity: 100_000,
    qualityWeights: {
      technicalAlignment: 0.25,
      riskReward: 0.25,
      trendAlignment: 0.2,
      supportResistance: 0.15,
      volatility: 0.1,
      dataQuality: 0.05,
    },
    supportedSides: ["LONG", "SHORT"],
    supportedTradeTypes: ["INTRADAY", "SWING", "POSITIONAL", "INVESTMENT"],
    supportedLifecycleStatuses: [
      "CREATED",
      "ACTIVE",
      "TARGET_HIT",
      "STOP_HIT",
      "EXPIRED",
      "CANCELLED",
      "REVALIDATED",
      "ARCHIVED",
    ],
  };

export type TradeSetupValidationConfigInput =
  Partial<TradeSetupValidationConfig> & {
    qualityWeights?: Partial<TradeSetupValidationConfig["qualityWeights"]>;
  };

export function resolveTradeSetupConfig(
  input?: TradeSetupValidationConfigInput
): TradeSetupValidationConfig {
  return {
    ...DEFAULT_TRADE_SETUP_VALIDATION_CONFIG,
    ...input,
    qualityWeights: {
      ...DEFAULT_TRADE_SETUP_VALIDATION_CONFIG.qualityWeights,
      ...(input?.qualityWeights ?? {}),
    },
  };
}
