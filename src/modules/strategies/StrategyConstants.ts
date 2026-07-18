/**
 * Strategy Framework constants — Sprint 11B.3A.
 * Config-driven thresholds only — no inline magic numbers in engines.
 */

export const STRATEGY_SIGNAL_TYPES = [
  "BUY",
  "SELL",
  "WATCHLIST",
  "IGNORE",
] as const;

export const STRATEGY_CATEGORIES = [
  "Scalp",
  "Intraday",
  "Swing",
  "Position",
] as const;

export const STRATEGY_LIFECYCLE_STATES = [
  "Created",
  "Initialized",
  "Validated",
  "Analyzed",
  "SignalGenerated",
  "Completed",
  "Disposed",
] as const;

export type StrategyLifecycleStateName =
  (typeof STRATEGY_LIFECYCLE_STATES)[number];

/** Allowed forward transitions for the strategy lifecycle state machine. */
export const STRATEGY_LIFECYCLE_TRANSITIONS: Record<
  StrategyLifecycleStateName,
  readonly StrategyLifecycleStateName[]
> = {
  Created: ["Initialized", "Disposed"],
  Initialized: ["Validated", "Disposed"],
  Validated: ["Analyzed", "Disposed"],
  Analyzed: ["SignalGenerated", "Disposed"],
  SignalGenerated: ["Completed", "Disposed"],
  Completed: ["Disposed"],
  Disposed: [],
};

export const DEFAULT_STRATEGY_FRAMEWORK_CONFIG = {
  minimumRegimeConfidence: 55,
  minimumSignalConfidence: 50,
  minimumRiskReward: 1.2,
  minimumQuality: 40,
  scoreFloor: 0,
  scoreCeiling: 100,
  defaultHoldingPeriods: {
    Scalp: "Minutes",
    Intraday: "Same session",
    Swing: "Days to weeks",
    Position: "Weeks to months",
  },
  ignoreConfidence: 0,
  ignoreRiskReward: 0,
  ignoreQuality: 0,
  priceEpsilon: 0.0001,
  qualityWeights: {
    regime: 0.25,
    analysis: 0.35,
    confidence: 0.25,
    riskReward: 0.15,
  },
  riskRewardQualityScale: 20,
} as const;

export type StrategyFrameworkConfig = {
  readonly minimumRegimeConfidence: number;
  readonly minimumSignalConfidence: number;
  readonly minimumRiskReward: number;
  readonly minimumQuality: number;
  readonly scoreFloor: number;
  readonly scoreCeiling: number;
  readonly defaultHoldingPeriods: {
    readonly Scalp: string;
    readonly Intraday: string;
    readonly Swing: string;
    readonly Position: string;
  };
  readonly ignoreConfidence: number;
  readonly ignoreRiskReward: number;
  readonly ignoreQuality: number;
  readonly priceEpsilon: number;
  readonly qualityWeights: {
    readonly regime: number;
    readonly analysis: number;
    readonly confidence: number;
    readonly riskReward: number;
  };
  readonly riskRewardQualityScale: number;
};
