# Historical Backtesting — Performance Guide

Sprint 11B.5

## Goals

Keep Historical Backtesting responsive without changing analytics or validation formulas.

## Techniques in use

| Technique | Where |
|---|---|
| Route-level skeletons | `app/backtesting/**/loading.tsx` |
| `startTransition` for filter/template updates | Validation + Reports |
| Lazy chart chunks | Report Center `next/dynamic` (`ssr: false`) |
| Windowed trade list | `VirtualizedRows` when trade count ≥ 40 |
| Paginated analytics table | Shared `AnalyticsTable` for smaller logs |
| Shared layout + module nav | Avoid duplicate chrome |

## Background tasks

`lib/backtesting/tasks` provides a future-ready registry (progress, cancel via `AbortSignal`). Export Center registers jobs here so UI can show progress without blocking the main thread long-term.

## Bundle tips

- Prefer importing chart components dynamically on Reports only
- Do not duplicate chart implementations under `components/backtesting`
- Keep calculation modules free of React imports

## What not to do

- Do not memoize aggressively without measurement
- Do not add heavy virtualization libraries unless row counts exceed thousands
- Do not change metric engines for “performance”
