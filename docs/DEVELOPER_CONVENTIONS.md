# Developer Conventions

Sprint 11F

---

## General

1. **No business-logic changes in architecture/audit sprints** — presentation, structure, docs, and dead-code only.
2. **Prefer `@/` imports** from `app/`, `components/`, `hooks/`, `services/`, `lib/`.
3. **Server Components by default**; add `"use client"` only when needed.
4. **Services own data assembly**; components own display.
5. **Do not use `any`** — prefer precise unions and shared types under `types/` or colocated `types.ts`.

---

## Components

- Extract shared chrome into `components/ui` only when used by ≥2 features.
- Keep empty / loading / error states consistent:
  - Empty → `EmptyStatePanel`
  - Route error → `RouteErrorFallback` via `error.tsx`
  - Section isolate → `ErrorBoundary`
- Match existing spacing/typography tokens from `styles/globals.css` / design bible.
- List rows that re-render often should use `memo` (see events + paper trading tables).

---

## Hooks

| Hook | Use for |
|---|---|
| `useMarketQuotes` | Live quote maps + market status polling |
| `useWatchlist` | Local watchlist remove UX |
| `useEventFilters` / `useEventSearch` | Event Intelligence filters |

Export shared hooks from `hooks/index.ts`. Feature-only hooks stay colocated.

---

## Formatting

| Domain | Module |
|---|---|
| Research / company numbers | `lib/format/research-numbers` (+ `lib/utils` wrappers) |
| IST market timestamps | `lib/market/format` |
| Paper trading P&L / clocks | `lib/paper-trading/format` (do not merge with research) |
| Recommendation drawer INR | `formatInr` in drawer `SectionChrome` |

---

## Services

- One façade file per product surface.
- Import as `@/services/<name>` — **no** package barrel.
- Cache only at service/engine boundaries with explicit TTLs.

---

## Types

- Shared cross-feature types → `types/`
- Engine-private shapes → colocated next to the engine
- Avoid duplicate risk enums with different casings when adding **new** types; migrate existing ones carefully in a dedicated sprint

---

## Performance

- Lazy-load heavy drawers/charts with `next/dynamic` (`ssr: false` when client-only).
- Prefer virtualization windows for long paper tables (`usePaperTableWindow`).
- Do not blanket-`memo` ResearchDataGrid tables already optimized upstream.

---

## Logging

- Prefer `lib/platform/logger` / integrity loggers for structured logs.
- Keep `console.error` in route error boundaries for diagnostics.
- CLI scripts may use `console.log` freely.
- Do not leave temporary `console.log` / `console.debug` in feature code.
