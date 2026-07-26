# EquityOS — Architecture Overview

Sprint 11F — Architecture Audit & Optimization

---

## Purpose

EquityOS is a Next.js 15 App Router terminal for Indian equity research, opportunity intelligence, event awareness, and paper trading validation.

This document describes the **intended layering**, module boundaries, and conventions after Sprint 11F. It does not change runtime behavior.

---

## High-Level Layering

```
┌─────────────────────────────────────────────────────────────┐
│ App Router (app/)                                           │
│ Pages · loading.tsx · error.tsx · API routes                │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ UI (components/)                                            │
│ Feature surfaces + components/ui primitives                 │
│ Display-only — never calls providers/adapters directly      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ Services (services/)                                        │
│ Thin façades used by pages / RSC                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌────────────────────┐
│ lib/ engines  │  │ lib/providers │  │ src/core · modules │
│ market, cache │  │ failover      │  │ domain registries  │
│ paper, recs   │  │ adapters      │  │ strategies         │
└───────────────┘  └───────────────┘  └────────────────────┘
```

**Rule:** React components must not import `lib/adapters/*` or `lib/providers/*` directly. Go through `services/` or approved presentation hooks.

---

## Parallel Systems (intentional)

| System | Path | Role |
|---|---|---|
| App UI primitives | `components/ui/` | Feature-facing cards, badges, tables, empty/error |
| Design platform | `src/design/` | Institutional glass, widgets, command palette, theme |
| Domain core | `src/core/` | Events, watchlists, recommendations, data integrity |
| Strategy modules | `src/modules/` | Market context/regime, trading pipeline, strategies |

Do **not** merge the two UI systems in a single pass — APIs and visuals differ. Prefer `components/ui` for new feature work unless the surface already uses `src/design`.

---

## State Management

- No global Redux/Zustand store.
- Colocated React contexts: Theme, AI workspace, event drawer, recommendation drawer, dashboard quotes.
- Server Components fetch via `services/*`.
- Client polling via `useMarketQuotes` (+ `DashboardQuoteProvider` on dashboard).
- File-backed runtime state under `.data/` (paper trading, opportunity scheduler).

---

## Routing

Primary pages: `/`, `/markets`, `/portfolio`, `/watchlist`, `/company/[symbol]`, `/events`, `/opportunities`, `/paper-trading`, `/research`, `/screener`, `/results`, `/news`, `/ai/*`, `/settings`, `/validation`.

Each feature route should provide `loading.tsx` (where applicable) and `error.tsx` using `RouteErrorFallback`.

---

## Related Docs

| Doc | Contents |
|---|---|
| [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) | Directory guide |
| [MODULE_DEPENDENCY_MAP.md](./MODULE_DEPENDENCY_MAP.md) | Dependency boundaries |
| [DEVELOPER_CONVENTIONS.md](./DEVELOPER_CONVENTIONS.md) | Coding conventions |
| [SHARED_COMPONENT_CATALOG.md](./SHARED_COMPONENT_CATALOG.md) | UI primitives catalog |
| [CORE_SERVICE_CATALOG.md](./CORE_SERVICE_CATALOG.md) | Services catalog |
| [ARCHITECTURE_AUDIT_11F.md](./ARCHITECTURE_AUDIT_11F.md) | Sprint 11F audit report |
| [ENGINEERING.md](./ENGINEERING.md) | Live market data architecture |
| [EVENT_INTELLIGENCE.md](./EVENT_INTELLIGENCE.md) | Events platform |
| [DESIGN_BIBLE.md](./DESIGN_BIBLE.md) | Visual / UX rules |
