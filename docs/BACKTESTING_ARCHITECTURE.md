# Historical Backtesting Architecture

Sprint 11B.1 — Framework & Replay Dataset contracts

---

## Purpose

Provide a reusable **Historical Backtesting** module that future sprints extend with:

- Replay UI (11B.2+)
- Charts / analytics dashboards
- Strategy comparison surfaces
- Persistent providers

**11B.1 is framework only** — no UI, no charts, no route wiring, no recommendation/paper-trading changes.

---

## Module layout

```
lib/backtesting/
  types.ts                 Shared models
  framework.ts             High-level orchestration façade
  dataset/                 Historical dataset contracts + registry
  rules/                   Strategy-independent rule engine
  session/                 Session lifecycle
  execution/               Pipeline + trade simulation
  storage/                 Session store contracts (+ in-memory)
  metrics/                 Integration with lib/analytics (11F.1)
  index.ts
```

---

## Layering

```
BacktestingFramework
        │
        ├─ Session Engine (queued → running → completed|failed|cancelled)
        ├─ Dataset Provider Registry (interfaces only)
        ├─ Rule Engine (entry/exit/target/stop/time/expiry)
        ├─ Execution Pipeline
        ├─ Metrics (delegates to lib/analytics)
        └─ Session Store (save/load/delete/list/compare)
```

### Hard boundaries

| Must not import / modify | Reason |
|---|---|
| Recommendation Engine | Read-only snapshot DTOs only |
| Paper Trading Engine | Separate live/paper lab domain |
| `components/analytics` UI | Framework has no UI |
| `lib/analytics` formulas | Reuse — do not fork |

---

## Related docs

- [BACKTESTING_EXECUTION_FLOW.md](./BACKTESTING_EXECUTION_FLOW.md)
- [BACKTESTING_RULE_ENGINE.md](./BACKTESTING_RULE_ENGINE.md)
- [BACKTESTING_SESSION_LIFECYCLE.md](./BACKTESTING_SESSION_LIFECYCLE.md)
- [BACKTESTING_DATASET_CONTRACTS.md](./BACKTESTING_DATASET_CONTRACTS.md)
- [ANALYTICS_METRICS.md](./ANALYTICS_METRICS.md)
