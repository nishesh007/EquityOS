import type {
  PassFailRuleResult,
  WalkForwardConfig,
  WalkForwardMetrics,
  CycleStatus,
} from "./types";

export function evaluatePassFail(
  metrics: WalkForwardMetrics,
  config: WalkForwardConfig
): { status: CycleStatus; rules: PassFailRuleResult[] } {
  if (metrics.totalTrades < config.minTrades) {
    const rules: PassFailRuleResult[] = [
      {
        id: "min_trades",
        label: "Minimum Trade Count",
        passed: false,
        actual: metrics.totalTrades,
        threshold: config.minTrades,
        comparator: ">=",
      },
    ];
    return { status: "Insufficient Data", rules };
  }

  const rules: PassFailRuleResult[] = [
    {
      id: "min_win_rate",
      label: "Minimum Win Rate",
      passed: metrics.winRate >= config.minWinRate,
      actual: metrics.winRate,
      threshold: config.minWinRate,
      comparator: ">=",
    },
    {
      id: "min_profit_factor",
      label: "Minimum Profit Factor",
      passed: metrics.profitFactor >= config.minProfitFactor,
      actual: metrics.profitFactor,
      threshold: config.minProfitFactor,
      comparator: ">=",
    },
    {
      id: "max_drawdown",
      label: "Maximum Drawdown",
      passed: metrics.maxDrawdown <= config.maxDrawdown,
      actual: metrics.maxDrawdown,
      threshold: config.maxDrawdown,
      comparator: "<=",
    },
    {
      id: "min_trades",
      label: "Minimum Trade Count",
      passed: metrics.totalTrades >= config.minTrades,
      actual: metrics.totalTrades,
      threshold: config.minTrades,
      comparator: ">=",
    },
    {
      id: "min_sharpe",
      label: "Minimum Sharpe Ratio",
      passed: metrics.sharpe >= config.minSharpe,
      actual: metrics.sharpe,
      threshold: config.minSharpe,
      comparator: ">=",
    },
  ];

  const failed = rules.filter((r) => !r.passed);
  return {
    status: failed.length === 0 ? "Passed" : "Failed",
    rules,
  };
}
