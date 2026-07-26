/**
 * Sprint 11C.4 — Monte Carlo Simulation & Stress Testing types.
 * Research / validation only — no live trading.
 */

export type MonteCarloMode =
  | "conservative"
  | "balanced"
  | "aggressive"
  | "custom";

export type StressScenarioId =
  | "crisis_2008"
  | "covid_2020"
  | "high_inflation"
  | "high_volatility"
  | "low_liquidity"
  | "gap_down"
  | "gap_up"
  | "sideways"
  | "bear_market"
  | "bull_market"
  | "flash_crash"
  | "custom";

export type RiskGrade = "A" | "B" | "C" | "D" | "F";

export type SimulationStatus =
  | "Pending"
  | "Running"
  | "Completed"
  | "Failed"
  | "Cancelled";

export type MonteCarloSessionStatus =
  | "Idle"
  | "Running"
  | "Completed"
  | "Failed"
  | "Cancelled";

export interface MonteCarloConfig {
  simulationCount: number;
  tradeRandomization: boolean;
  bootstrapSampling: boolean;
  returnRandomization: boolean;
  slippagePct: number;
  commissionPct: number;
  gapProbability: number;
  volatilityMultiplier: number;
  maxDrawdownLimit: number;
  confidenceLevel: number;
  randomSeed: number;
  mode: MonteCarloMode;
  selectedScenarios: StressScenarioId[];
  customReturnShock: number;
  customVolShock: number;
}

export interface StressScenarioDefinition {
  id: StressScenarioId;
  label: string;
  description: string;
  returnShock: number;
  volatilityShock: number;
  gapBoost: number;
  liquidityPenalty: number;
}

export interface MonteCarloRiskMetrics {
  expectedReturn: number;
  medianReturn: number;
  worstReturn: number;
  bestReturn: number;
  maxDrawdown: number;
  averageDrawdown: number;
  recoveryTime: number;
  volatility: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  ulcerIndex: number;
  var: number;
  cvar: number;
  probabilityOfRuin: number;
  probabilityOfTarget: number;
  profitFactor: number;
  winRate: number;
}

export interface DistributionBucket {
  label: string;
  value: number;
  count: number;
}

export interface ProbabilityDistributions {
  returns: DistributionBucket[];
  drawdowns: DistributionBucket[];
  winRates: DistributionBucket[];
  sharpes: DistributionBucket[];
  profitFactors: DistributionBucket[];
  holdingTimes: DistributionBucket[];
  risks: DistributionBucket[];
}

export interface ConfidenceInterval {
  level: number;
  returnLow: number;
  returnHigh: number;
  drawdownLow: number;
  drawdownHigh: number;
  profitFactorLow: number;
  profitFactorHigh: number;
  sharpeLow: number;
  sharpeHigh: number;
  probabilityOfLoss: number;
}

export interface SimulationResult {
  id: string;
  simulationIndex: number;
  scenarioId: StressScenarioId;
  scenarioLabel: string;
  metrics: MonteCarloRiskMetrics;
  equityCurve: number[];
  drawdownCurve: number[];
  monthlyReturns: number[];
  riskGrade: RiskGrade;
  status: SimulationStatus;
  probability: number;
  strengths: string[];
  weaknesses: string[];
  riskCommentary: string;
  suggestions: string[];
}

export interface ScenarioComparisonRow {
  scenarioId: StressScenarioId;
  label: string;
  expectedReturn: number;
  risk: number;
  drawdown: number;
  recovery: number;
  volatility: number;
  sharpe: number;
  probabilityOfRuin: number;
  isBest: boolean;
  isWorst: boolean;
}

export interface MonteCarloDashboard {
  totalSimulations: number;
  status: MonteCarloSessionStatus;
  averageReturn: number;
  medianReturn: number;
  worstDrawdown: number;
  probabilityOfRuin: number;
  confidence95Return: number;
  confidence95Drawdown: number;
  riskGrade: RiskGrade;
  overallStabilityScore: number;
  insights: string[];
}

export interface MonteCarloSession {
  id: string;
  createdAt: string;
  completedAt: string | null;
  status: MonteCarloSessionStatus;
  strategyId: string;
  strategyName: string;
  optimizationSessionId: string | null;
  walkForwardSessionId: string | null;
  config: MonteCarloConfig;
  results: SimulationResult[];
  distributions: ProbabilityDistributions | null;
  confidenceIntervals: ConfidenceInterval[];
  scenarioComparison: ScenarioComparisonRow[];
  dashboard: MonteCarloDashboard | null;
  progressPercent: number;
  message: string | null;
  error: string | null;
}

export interface MonteCarloExportState {
  busy: boolean;
  lastFormat: "csv" | "excel" | "json" | "pdf" | null;
  lastMessage: string | null;
}

export interface MonteCarloFilterState {
  scenario: "all" | StressScenarioId;
  query: string;
}

export const DEFAULT_MONTE_CARLO_CONFIG: MonteCarloConfig = {
  simulationCount: 250,
  tradeRandomization: true,
  bootstrapSampling: true,
  returnRandomization: true,
  slippagePct: 0.05,
  commissionPct: 0.02,
  gapProbability: 0.08,
  volatilityMultiplier: 1,
  maxDrawdownLimit: 25,
  confidenceLevel: 95,
  randomSeed: 42,
  mode: "balanced",
  selectedScenarios: ["bear_market", "high_volatility", "covid_2020"],
  customReturnShock: -0.15,
  customVolShock: 1.5,
};

export const DEFAULT_MONTE_CARLO_FILTERS: MonteCarloFilterState = {
  scenario: "all",
  query: "",
};

export const STRESS_SCENARIOS: readonly StressScenarioDefinition[] = [
  {
    id: "crisis_2008",
    label: "2008 Financial Crisis",
    description: "Severe equity drawdown with elevated correlation and gaps.",
    returnShock: -0.45,
    volatilityShock: 2.4,
    gapBoost: 0.2,
    liquidityPenalty: 0.35,
  },
  {
    id: "covid_2020",
    label: "2020 COVID Crash",
    description: "Fast crash and rebound with extreme short-term volatility.",
    returnShock: -0.32,
    volatilityShock: 2.8,
    gapBoost: 0.25,
    liquidityPenalty: 0.2,
  },
  {
    id: "high_inflation",
    label: "High Inflation",
    description: "Persistent inflation drag with sticky rates.",
    returnShock: -0.12,
    volatilityShock: 1.3,
    gapBoost: 0.05,
    liquidityPenalty: 0.1,
  },
  {
    id: "high_volatility",
    label: "High Volatility",
    description: "Elevated realized vol without directional bias.",
    returnShock: -0.05,
    volatilityShock: 2.0,
    gapBoost: 0.12,
    liquidityPenalty: 0.15,
  },
  {
    id: "low_liquidity",
    label: "Low Liquidity",
    description: "Wider spreads, slippage, and fill degradation.",
    returnShock: -0.08,
    volatilityShock: 1.4,
    gapBoost: 0.08,
    liquidityPenalty: 0.45,
  },
  {
    id: "gap_down",
    label: "Gap Down Market",
    description: "Frequent downside gaps and overnight risk.",
    returnShock: -0.18,
    volatilityShock: 1.6,
    gapBoost: 0.35,
    liquidityPenalty: 0.15,
  },
  {
    id: "gap_up",
    label: "Gap Up Market",
    description: "Upside gaps with chase risk and FOMO fills.",
    returnShock: 0.12,
    volatilityShock: 1.5,
    gapBoost: 0.3,
    liquidityPenalty: 0.1,
  },
  {
    id: "sideways",
    label: "Sideways Market",
    description: "Range-bound chop with mean-reverting noise.",
    returnShock: 0.01,
    volatilityShock: 0.9,
    gapBoost: 0.04,
    liquidityPenalty: 0.05,
  },
  {
    id: "bear_market",
    label: "Bear Market",
    description: "Prolonged negative drift and risk-off flows.",
    returnShock: -0.28,
    volatilityShock: 1.8,
    gapBoost: 0.15,
    liquidityPenalty: 0.2,
  },
  {
    id: "bull_market",
    label: "Bull Market",
    description: "Positive drift with constructive risk appetite.",
    returnShock: 0.22,
    volatilityShock: 1.1,
    gapBoost: 0.06,
    liquidityPenalty: 0.05,
  },
  {
    id: "flash_crash",
    label: "Flash Crash",
    description: "Sudden liquidity vacuum and sharp V-shaped recovery.",
    returnShock: -0.2,
    volatilityShock: 3.2,
    gapBoost: 0.4,
    liquidityPenalty: 0.5,
  },
  {
    id: "custom",
    label: "Custom Scenario",
    description: "User-defined return and volatility shocks.",
    returnShock: -0.15,
    volatilityShock: 1.5,
    gapBoost: 0.1,
    liquidityPenalty: 0.1,
  },
] as const;
