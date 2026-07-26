# Strategy Validation Architecture

Sprint 11B.3 — Institutional comparison layer for Historical Backtesting

---

## Purpose

Evaluate strategy quality, AI recommendation quality, and comparative performance using:

- Backtesting framework (11B.1)
- Replay demo sessions (11B.2) as historical inputs
- Shared analytics metrics (11F.1) — **no duplicated formulas**

Does **not** change Replay Center behavior, Recommendation Engine, or Paper Trading.

---

## Module map

```
lib/backtesting/validation/
  types.ts
  metrics.ts                 wrappers over lib/analytics
  filters.ts
  strategy-comparison.ts
  recommendation-validation.ts
  confidence-calibration.ts
  failure-analysis.ts
  benchmark-comparison.ts
  insights.ts
  enrichment.ts              ValidationTradeRecord from replay bundles
  build-report.ts            StrategyValidationReport orchestration

components/backtesting/validation/
  StrategyValidationWorkspace.tsx
  ValidationFilterBar.tsx
  ValidationPanels.tsx

app/backtesting/validation/page.tsx
services/backtesting.ts      fetchStrategyValidationDashboard()
```

---

## Data flow

```
Demo Replay Bundles
   → ValidationTradeRecord enrichment
   → Filters
   → Section engines
   → StrategyValidationReport
   → Validation Workspace UI (analytics KPIs/tables/charts)
```

---

## Related docs

- [VALIDATION_STRATEGY_COMPARISON.md](./VALIDATION_STRATEGY_COMPARISON.md)
- [VALIDATION_CONFIDENCE_CALIBRATION.md](./VALIDATION_CONFIDENCE_CALIBRATION.md)
- [VALIDATION_FAILURE_CLASSIFICATION.md](./VALIDATION_FAILURE_CLASSIFICATION.md)
- [VALIDATION_BENCHMARK_METHODOLOGY.md](./VALIDATION_BENCHMARK_METHODOLOGY.md)
