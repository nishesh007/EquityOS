# Backtesting Rule Engine Design

Sprint 11B.1

---

## Principles

1. **Strategy independent** — rules take prices + params, not strategy IDs.
2. **Composable** — sessions carry an ordered `BacktestRule[]`.
3. **Deterministic** — pure functions over `RuleEvaluationInput`.

---

## Rule kinds

| Kind | Factory | Trigger |
|---|---|---|
| `entry` | `createEntryRule` | Price within entry ± bandBps |
| `exit` | `createExitRule` | Price ≥ `exitPrice` |
| `target` | `createTargetRule` | High/price ≥ target level |
| `stop_loss` | `createStopLossRule` | Low/price ≤ stop |
| `time_exit` | `createTimeExitRule` | Holding ≥ `maxHoldingMs` |
| `expiry` | `createExpiryRule` | `asOf` ≥ `expiresAt` |

---

## Evaluation API

```ts
evaluateRule(input) → RuleEvaluationResult
evaluateRules(rules, context) → RuleEvaluationResult[]
firstTriggered(results) → RuleEvaluationResult | null
```

`RuleEvaluationResult` includes `triggered`, `reason`, optional `price` / `targetIndex`.

---

## Context shapes

- **Market** — symbol, asOf, price, OHLC
- **Position** — entryPrice, entryAt, shares, stop/targets, expiry, maxHolding
- **Recommendation** — action, entry, stop, targets, asOf (snapshot only)

Rules may read values from `rule.params` **or** fall back to position/recommendation fields.
