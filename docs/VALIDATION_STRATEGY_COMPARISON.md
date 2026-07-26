# Strategy Comparison

Sprint 11B.3

Comparison dimensions: **strategy**, **sector**, **market cap**, **market regime**, **universe**, **symbol**.

## Metrics (per group)

| Metric | Source |
|---|---|
| Total Return | Sum of closed trade return % |
| CAGR | Compounded equity over span (null if span invalid) |
| Win Rate / Profit Factor / Max DD / Avg Return / Avg Holding | `lib/analytics` via `computeTradeStatistics` |
| Avg Risk/Reward | Realized (exit−entry)/|entry−stop| |
| Sharpe / Sortino | From trade returns when n ≥ 3; else null |

UI: `StrategyComparisonPanel` + `AnalyticsTable` from Sprint 11F.1.
