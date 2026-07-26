# Strategy Optimization Architecture

Sprint 11C.1–11C.5 (production-ready)

## Route

`/research/optimization`

## Tabs

1. **Configuration** — strategy, parameters, constraints, search/ranking, profiles  
2. **Results** — progress, leaderboard, comparison, history, exports  
3. **Walk-Forward Validation** — chronological OOS folds + robustness  
4. **Monte Carlo & Stress Testing** — randomized paths + institutional scenarios  

## Layer map

| Layer | Path |
|---|---|
| Pages | `app/research/optimization/` |
| UI | `components/optimization/` (+ `walk-forward/`, `monte-carlo/`, `hardening/`) |
| Domain | `lib/optimization/` (+ `engine/`, `walk-forward/`, `monte-carlo/`) |

## Flows

```
Config → Validate → Expand params → Optimize → Rank → Leaderboard
                 ↘ Walk-Forward (train freeze → test unseen)
                 ↘ Monte Carlo (bootstrap / stress → distributions)
                 ↘ Exports (CSV / Excel / JSON / PDF)
```

## Persistence (localStorage)

| Key | Contents |
|---|---|
| `equityos.research.optimization.profiles.v1` | Saved profiles |
| `equityos.research.optimization.sessions.v1` | Optimization sessions |
| `equityos.research.optimization.wfv.sessions.v1` | Walk-forward sessions |
| `equityos.research.optimization.mc.sessions.v1` | Monte Carlo sessions |
| `equityos.research.optimization.ui.v1` | Active tab, filters, lab configs |

## Logging

`lib/optimization/logger.ts` — ring buffer of structured events.  
Production: silent. Development: errors/warnings only.

## Performance notes

- Batch async evaluation (no worker threads required)
- Cancel on unmount
- Table pagination + MC row cap
- Trimmed session persistence payloads

## Known limitations

See `docs/RELEASE_NOTES_11C.md`.
