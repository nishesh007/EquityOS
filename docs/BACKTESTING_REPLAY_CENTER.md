# Historical Replay Center

Sprint 11B.2

---

## Purpose

Recreate historical market conditions **exactly as they existed** during a selected backtest session — candle-by-candle — with **zero look-ahead bias**.

This is not a traditional “full chart” backtest viewer. Future candles, indicators, events, and trade markers stay hidden until the replay cursor reaches their historical timestamp.

---

## Architecture

```
app/backtesting/page.tsx
        │
        ▼
services/backtesting.ts          demo session catalogue
        │
        ▼
components/backtesting/*         Replay Center UI
        │
        ▼
lib/backtesting/replay/*         Deterministic slice engine (11B.2)
        │
        └── lib/backtesting/*    Session / dataset / trades (11B.1)
```

### Anti look-ahead gate

`sliceReplayVisibleState(bundle, cursor)` is the only path from full history → UI:

| Revealed | Hidden until later |
|---|---|
| Bars `[0..cursor]` | Bars after cursor |
| Markers with `barIndex <= cursor` | Future markers |
| Events / corp actions with `at/exDate <= asOf` | Future events |
| Recommendations with `asOf <= asOf` | Future signals |

---

## UI modules

| Section | Component |
|---|---|
| Session Explorer | `SessionExplorer` |
| Replay Controls | `ReplayControls` |
| Market Replay | `ReplayCandleChart` |
| Recommendation Snapshot | `RecommendationSnapshotPanel` |
| Recommendation / Trade / Event timelines | `ReplayTimelines` |
| Replay Statistics | `ReplayStatisticsPanel` |
| Orchestrator | `HistoricalReplayCenter` |

Route: `/backtesting` · Nav: **Historical Replay**

---

## Determinism

Demo fixtures in `lib/backtesting/replay/demo-sessions.ts` use fixed ISO timestamps and prices. `fingerprintReplayBundle` verifies identical rebuilds.

---

## Out of scope (11B.3+)

Performance comparison, backtest reports, optimization, strategy ranking, PDF export.
