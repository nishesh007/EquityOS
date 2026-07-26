# Analytics Metric Definitions

Sprint 11F.1 — implemented in `lib/analytics/metric-engine.ts`

All utilities are **generic**. Features map their domain rows into `TradeStatisticsInput`.

---

## Core formulas

| Metric | Definition | Notes |
|---|---|---|
| **Win Rate** | `wins / total * 100` | 0 when total ≤ 0 |
| **Loss Rate** | `losses / total * 100` | 0 when total ≤ 0 |
| **Profit Factor** | `grossProfit / \|grossLoss\|` | `null` when grossLoss = 0 and profit > 0 (undefined) |
| **Average Return** | mean of return % | `null` if empty |
| **Average Gain** | mean of positive returns | `null` if none |
| **Average Loss** | mean of negative returns | `null` if none |
| **Maximum Drawdown** | peak-to-trough % of peak on equity curve | positive magnitude |
| **Average Holding Time** | mean of `holdingMs` | milliseconds |
| **Target Hit %** | targets hit / rows with target flag | `null` if no flags |
| **Stop Loss %** | stops hit / rows with stop flag | `null` if no flags |

---

## `TradeStatisticsInput`

```ts
{
  returnPercent: number;   // signed %
  pnl?: number;            // optional currency PnL
  holdingMs?: number;
  hitTarget?: boolean;
  hitStopLoss?: boolean;
}
```

`computeTradeStatistics(trades)` returns a full `TradeStatistics` aggregate.

---

## Time range presets

From `lib/analytics/time-range.ts`:

| Preset | Label |
|---|---|
| `today` | Today |
| `this_week` | This Week (Mon start) |
| `this_month` | This Month |
| `3_months` | 3 Months |
| `6_months` | 6 Months |
| `1_year` | 1 Year |
| `all_time` | All Time (epoch → now) |

Helpers: `resolveTimeRangePreset`, `isWithinDateRange`, `filterByDateRange`.

---

## Domain isolation

Paper Trading / Recommendation engines keep their own analytics modules. Prefer **calling** shared metric helpers from those modules in a later consolidation sprint — do not silently change existing paper KPI numbers in 11F.1.
