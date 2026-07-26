# Backtesting Session Lifecycle

Sprint 11B.1

---

## Session model (`BacktestSession`)

Stores:

- Session ID, created/updated timestamps
- Strategy id/label + universe
- Start/end dates + full `BacktestConfiguration`
- Status, duration, summary, trades
- Optional error message

---

## Status machine

```
queued ──► running ──► completed
   │          │
   │          ├──► cancelled
   │          └──► failed
   ├──► cancelled
   └──► failed
```

Terminal states (`completed`, `cancelled`, `failed`) do not transition further.

Helpers: `createBacktestSession`, `markSessionRunning`, `markSessionCompleted`, `markSessionFailed`, `markSessionCancelled`, `canTransition`.

---

## Summary

`BacktestSessionSummary` includes trade counts + `TradeStatistics` (from analytics) + notes.

---

## Storage contracts

`BacktestSessionStore`:

| Method | Purpose |
|---|---|
| `saveSession` | Upsert |
| `loadSession` | Fetch by id |
| `deleteSession` | Remove |
| `listSessions` | Newest first |
| `compareSessions` | Summary deltas |

`InMemoryBacktestSessionStore` ships for tests/local orchestration. Persistent storage is deferred.
