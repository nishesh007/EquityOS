# Folder Structure Guide

Sprint 11F

---

## Top Level

```
app/            Next.js App Router — pages, layouts, API routes
components/     Feature UI + shared primitives (components/ui, layout)
hooks/          Shared client hooks
services/       Page-facing data façades (no React)
lib/            Engines, adapters, cache, formatters, market/paper/recs
src/            Domain core, design platform, strategy modules, presentation
types/          Shared TypeScript models (events, market, portfolio, …)
constants/      Static labels/colors (events)
data/           Static datasets (breadth / heatmap seeds)
docs/           Engineering + architecture documentation
scripts/        CLI generation / validation utilities
styles/         globals.css design tokens
.data/          Runtime persistence (gitignored / local)
```

---

## `components/` conventions

| Folder | Purpose |
|---|---|
| `ui/` | Shared primitives — prefer these for feature work |
| `layout/` | AppShell, Sidebar, TopNav, PageHeader |
| `dashboard/` | Home / markets widgets |
| `company/` | Company profile + research + intelligence |
| `events/` | Event Intelligence calendar / drawer |
| `recommendations/` | Shared rec panels + detail drawer |
| `paper-trading/` | Paper Trading Lab UI |
| `analytics/` | Shared analytics KPIs / charts / tables / filters (11F.1) |
| `backtesting/` | Historical Replay Center UI (11B.2) |
| `optimization/` | Strategy Optimization Workspace UI (11C.1) |
| `ai/`, `charts/`, `market/`, `portfolio/`, `screener/`, … | Feature islands |

Colocate feature-only hooks next to the feature (e.g. `detail-drawer/use*.ts`, `usePaperTableWindow.ts`). Put cross-feature hooks in `hooks/`.

---

## `lib/` conventions

- `lib/adapters` + `lib/providers` — market data plumbing (not imported by UI)
- `lib/market*` — quote/OHLC/breadth/heatmap/intelligence/orchestrator engines
- `lib/format` + `lib/utils` — shared display formatting
- `lib/analytics` — shared metric engine, time range, export contracts (11F.1)
- `lib/backtesting` — framework (11B.1), replay (11B.2), validation (11B.3), institutional reports (11B.4), background tasks / hardening (11B.5)
- `components/backtesting` — Replay Center, Strategy Validation, Report Center, shared hardening UI
- `lib/optimization` — Strategy Optimization store, engine, walk-forward, Monte Carlo, UI persistence, logging (11C.1–11C.5)
- `components/optimization` — Strategy Optimization Lab UI + hardening chrome (11C.1–11C.5)
- `lib/paper-trading` — paper lab domain (keep format helpers local; different semantics)
- `lib/recommendations` / `lib/opportunity-engine` — recommendation pipeline (do not change in audit sprints)

---

## `src/` conventions

- `src/core` — institutional domain registries and presenters
- `src/design` — second design system; deep-import specific modules (avoid full `@/src/design` barrel in layout-critical paths)
- `src/modules` — strategies + market context/regime/pipeline
- Prefer package-relative imports inside `src/*`; use `@/src/...` from app/components

---

## Naming

- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Services: `camelCase.ts` façades (`marketData.ts`, `paperTrading.ts`)
- Prefer `@/` absolute imports from app/components/hooks/services
- Feature barrels (`index.ts`) are optional; keep them thin and avoid circular re-exports

---

## What not to add casually

- New top-level `contexts/` — providers stay colocated with their feature
- New services barrel (`services/index.ts`) — import `@/services/<module>` directly
- Duplicate UI primitives that already exist in `components/ui`
