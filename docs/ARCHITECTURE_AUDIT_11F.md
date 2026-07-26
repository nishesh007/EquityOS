# Sprint 11F — Architecture Audit Report

**Status:** COMPLETE  
**Scope:** Maintainability, consistency, performance hygiene, documentation  
**Out of scope:** New features, UI redesign, recommendation/AI/paper/portfolio/event business logic, API contract changes

---

## Summary

Sprint 11F audited the EquityOS codebase end-to-end and applied **safe consolidations** only: dead-code removal, shared error UI, hook/export cleanup, targeted memoization/lazy-loading, formatter centralization for identical helpers, and architecture documentation.

No recommendation calculations, AI conviction, paper-trading logic, dashboard calculations, or API handlers were modified.

---

## Improvements completed

### Dead code removed
- Unused UI: `InfoTooltip`, `UpcomingResultsCalendar`
- Unused charts: `TradingViewChart`, `LazyTradingViewChart` (superseded by `LazyChartWorkspace`)
- Unused intelligence panels: `OpportunityPanel`, `RedFlagPanel`
- Unused MetricBlocks exports: `ContributionList`, `TraceList`
- Unused lazy dashboard exports: Market Movers / Results / News / Earnings lazy wrappers (server/hydrated path already owns those widgets)
- Unused hooks: `useMemoizedValue`, `useCachedData`

### Component / design-system hygiene
- Removed unused props: `Card.glass`, `EmptyStatePanel.comingSoon`
- Added shared `RouteErrorFallback` for consistent route errors
- Documented dual UI systems (`components/ui` vs `src/design`) without forcing a risky merge

### Hooks
- Rewrote `hooks/index.ts` to export live hooks only, including `useMarketQuotes`
- Left feature-colocated hooks in place (paper table window, recommendation drawer)

### Performance
- `React.memo` on `EventCard` (list-heavy events views)
- `React.memo` on paper best/worst table rows (matches active/closed row pattern)
- `next/dynamic` lazy load for `EventDetailDrawer` in global provider + Event Intelligence page

### Error handling
- Shared `RouteErrorFallback`
- Added `error.tsx` for: events, markets, news, opportunities, paper-trading, research, results, screener, settings, validation, watchlist
- Root `app/error.tsx` now uses the shared fallback

### Formatting consolidation
- Added `formatIstShortDateTime` in `lib/market/format`
- Market Context / Regime cards now share that helper
- Recommendation drawer header/sidebar reuse `formatInr` from `SectionChrome`

### Documentation (new / updated)
- `docs/ARCHITECTURE_OVERVIEW.md`
- `docs/FOLDER_STRUCTURE.md`
- `docs/MODULE_DEPENDENCY_MAP.md`
- `docs/DEVELOPER_CONVENTIONS.md`
- `docs/SHARED_COMPONENT_CATALOG.md`
- `docs/CORE_SERVICE_CATALOG.md`
- `docs/ARCHITECTURE_AUDIT_11F.md` (this report)
- Updated stale references in `docs/ENGINEERING.md`, `docs/DESIGN_BIBLE.md`, `README.md`

---

## Duplicates removed / reduced

| Item | Action |
|---|---|
| Dead TradingView chart path | Deleted |
| Dead dashboard calendar component | Deleted |
| Dead unused hooks | Deleted |
| Identical IST “updated” formatters (2 cards) | Centralized |
| Identical drawer `formatPrice` helpers | Delegated to `formatInr` |
| Unused MetricBlocks helpers | Deleted |

**Intentionally not merged** (different APIs / visuals / semantics):
- `components/ui` vs `src/design` Skeleton / MetricCard / Sparkline
- Two `RecommendationTimeline` implementations + drawer timeline section
- Paper vs research `formatPercent` / P&L formatters
- Research-intelligence `formatInr` (0 decimals, rejects ≤0) vs drawer `formatInr` (2 decimals)

---

## Type improvements

- Production codebase already avoids `: any` / `as any` in app feature code
- Remaining debt: divergent risk enums (`RiskLevel` / `RiskLevelLabel` / `RiskRating` / strategy ratings) and overloaded `EventIntelligence` naming across layers — documented for a dedicated typing sprint (would touch domain contracts)

---

## Service consolidation

- No renames (would churn imports without behavior benefit)
- Catalog documented ownership boundaries
- Explicit decision: **no** `services/index.ts` barrel (circular-import risk)

---

## Logging / dependencies

- Feature UI remains clean of debug `console.log`
- Remaining `console.*` are intentional (platform logger, integrity logger, schedulers, CLI scripts, error boundaries)
- Dependencies: lean set (Next 15, React 19, Zod, pg, lucide, clsx/tailwind-merge). No unused package removals required this sprint

---

## Remaining technical debt

1. **Dual UI systems** — long-term converge primitives carefully with visual snapshots
2. **Market naming sprawl** — `lib/market*` folders + overlapping service names
3. **`types/index.ts` god-file** — split by domain in a typing sprint
4. **Risk enum divergence** — unify with adapters, not a silent rename
5. **Stale handover docs** — `ENGINEERING_HANDOVER.md` still describes an older mock-era product; prefer `docs/ARCHITECTURE_OVERVIEW.md` + `docs/ENGINEERING.md`
6. **Incomplete toast pattern** — no shared toast library; errors rely on boundaries + inline panels
7. **Some route `loading.tsx` gaps** — optional follow-up for skeleton parity

---

## Recommended future improvements

1. Visual-regression suite before merging `src/design` primitives into `components/ui`
2. Dedicated **Type Unification** sprint for risk/event models
3. Soft-rename plan for market service modules (`researchDashboardData` ↔ breadth ownership)
4. Expand `ErrorBoundary` around chart workspace + heavy drawers (parity with AI)
5. Dependency budget checks in CI (bundle analyzer on PR)
6. Sprint 11B — Historical Backtesting Engine (next)

---

## QA checklist

| Check | Result |
|---|---|
| No recommendation logic changes | ✓ |
| No paper trading logic changes | ✓ |
| No API contract changes | ✓ |
| No intentional visual redesign | ✓ |
| Dead code removed | ✓ |
| Docs updated | ✓ |
| Production build | ✓ Passed (`next build`) |

---

## Sprint status

**Sprint 11F COMPLETE**  
**Ready for Sprint 11B – Historical Backtesting Engine**
