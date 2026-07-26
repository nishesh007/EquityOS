# Backtesting Execution Flow

Sprint 11B.1

---

## Pipeline

```
Historical Data (HistoricalDatasetBundle)
        ↓
Recommendation Snapshot(s)
        ↓
Entry Evaluation (entry rules)
        ↓
Trade Simulation (open position)
        ↓
Exit Evaluation (target / stop / time / expiry / exit)
        ↓
Metrics (lib/analytics via computeBacktestStatistics)
        ↓
Session Results (ExecutionResult)
```

Implemented by `runBacktestExecution()` in `lib/backtesting/execution/pipeline.ts`.

---

## Inputs

| Input | Source |
|---|---|
| `BacktestSession` | Session engine (`queued`) |
| `HistoricalDatasetBundle` | Caller-supplied (providers deferred) |

## Outputs (`ExecutionResult`)

| Field | Contents |
|---|---|
| `session` | Completed / failed session with summary |
| `trades` | Simulated `BacktestTrade[]` |
| `frames` | `ReplayFrame[]` stubs for 11B.2 replay |
| `statistics` | `TradeStatistics` from analytics |
| `warnings` | Dataset / force-close notes |

---

## Simulation notes (11B.1)

- Flat position sizing via `configuration.positionSize` or capital / maxOpen.
- One open position path per recommendation symbol sweep (respects `maxOpenPositions`).
- Unclosed positions are force-closed at the last bar (`session_end`) with a warning.
- Slippage / commission fields exist on configuration but are not applied yet.

---

## Framework usage

```ts
import { BacktestingFramework } from "@/lib/backtesting";

const framework = new BacktestingFramework();
const result = await framework.createAndRun(configuration, datasetBundle);
```
