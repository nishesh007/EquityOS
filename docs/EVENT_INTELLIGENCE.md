# Event Intelligence Platform

Sprint **10D.6** production release candidate documentation.  
Covers architecture delivered across Sprints **10D.1–10D.5**.

---

## 1. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  App Router                                                      │
│  /events (SSR) · Dashboard · Portfolio · Watchlist · Recs        │
└────────────────────────────┬─────────────────────────────────────┘
                             │ props / shared drawer
┌────────────────────────────▼─────────────────────────────────────┐
│  UI (components/events + dashboard integrations)                 │
│  Calendar views · Filters · Drawer · My Events · Badges          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  Service façade — services/eventIntelligence.ts                  │
│  fetchEventIntelligenceCatalog() → seed catalog + counts         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  Domain core — src/core/events                                   │
│  Repositories → Seed composer → Intelligence engines → Integration│
└──────────────────────────────────────────────────────────────────┘
```

**Runtime invariants**

| Concern | Behavior |
|---------|----------|
| SSR | `/events` loads catalog on the server and streams into the client shell |
| Streaming | Route `loading.tsx` + Suspense fallback around the client tree |
| Hydration | Filters open only after mount on `lg+` to avoid SSR/client mismatch |
| Data source | Deterministic **seed** (`source: "seed"`) until live feeds land |

---

## 2. Repositories

| Repository | Path | Responsibility |
|------------|------|----------------|
| Earnings | `repositories/earningsRepository.ts` | Results, estimates, conference calls, history |
| Corporate actions | `repositories/corporateActionRepository.ts` | Dividend, bonus, split, buyback, rights, AGM |
| Macro events | `repositories/macroEventRepository.ts` | RBI, Fed, ECB, GDP, CPI, PMI, trade, liquidity |
| Economic indicators | `repositories/economicIndicatorRepository.ts` | Indicator readings for macro detail |
| Historical macro | `repositories/historicalMacroRepository.ts` | Prior print / market reaction series |
| Facade | `repositories/eventRepository.ts` | Stable re-exports for macro list APIs |

**Composer:** `EventSeedData.buildEventSeedCatalog(today)` merges all lists, runs `enrichEventWithIntelligence`, and sorts by `date` then `time`.

**Shared helpers:** `repositories/repoUtils.ts` — status resolution, timestamps, quarter history seeds.

---

## 3. Services

| Layer | Entry | Notes |
|-------|-------|-------|
| HTTP/UI façade | `services/eventIntelligence.ts` | Async catalog for the `/events` page |
| Filters | `EventFilters.ts` + `hooks/useEventFilters.ts` | Pure filter/search/view + React state |
| Search | `hooks/useEventSearch.ts` | 150ms debounce |
| Drawer VM | `EventDrawerPresenter.ts` | Badge derivation + full drawer view model |
| Scoring | `intelligence/*` | Deterministic engines (no LLM) |
| Integration | `integration/*` | Portfolio, watchlist, recommendations, dashboard, My Events, alert drafts |

---

## 4. Event flow

```
1. SSR: fetchEventIntelligenceCatalog()
2. buildEventSeedCatalog(asOf)
3. listEarnings + listCorporateActions + listMacro
4. enrichEventWithIntelligence → impactScore, confidence, aiSummary, checklist
5. Sort (date, time)
6. Client: useEventSearch → useEventFilters → view (day/week/month/timeline/agenda)
7. Open drawer → toEventDrawerView → analyzeEventIntelligence (full payload)
8. Cross-surface: GlobalEventDrawerProvider.openEvent / openEventById
```

Deep link: `/events?event=<id>` opens the matching event in the shared drawer.

---

## 5. Scoring engine (Sprint 10D.4)

Orchestrator: `intelligence/eventIntelligenceEngine.ts`

| Engine | Output |
|--------|--------|
| `impactScoreEngine` | 0–100 impact + factor breakdown |
| `confidenceEngine` | 0–100 confidence + factors |
| `riskEngine` | Rating + rationale |
| `marketBiasEngine` | Bullish / bearish / neutral / mixed |
| `sectorImpactEngine` | NSE sector matrix |
| `summaryEngine` | Executive summary narrative |
| `preparationChecklistEngine` | Actionable prep items |
| `historicalInsightEngine` | Historical context (when available) |

Catalog enrichment stores **lightweight reserved fields** on each event. The drawer recomputes the full `EventIntelligence` object on open for explainability panels.

---

## 6. Integration points (Sprint 10D.5)

| Surface | Component / API |
|---------|-----------------|
| Dashboard | `EventIntelligenceDashboardWidget` |
| Portfolio | `PortfolioEventImpactPanel` + holdings awareness badges |
| Watchlist | Catalyst strip / expanded-row badges |
| Recommendations | `RecommendationEventWarningBadge` |
| Shared drawer | `GlobalEventDrawerProvider` in `AppShell` |
| My Events | `MyEventsPanel` + `EventStarButton` + `myEventsStore` (`localStorage`) |
| Alerts (draft only) | `prepareAlertDrafts` — no push/email/SMS delivery |

Linking helpers live in `integration/eventLinkingService.ts` (countdown, awareness kinds, symbol match, `eventHref`).

---

## 7. UI surfaces

| Path | Role |
|------|------|
| `app/events/page.tsx` | SSR entry + repository error boundary messaging |
| `components/events/EventIntelligence.tsx` | Page orchestration |
| `views/*` | Day / Week / Month / Agenda |
| `EventTimeline.tsx` | Timeline buckets (today / tomorrow / future / past) |
| `EventDetailDrawer.tsx` | Detail + intelligence panel (focus trap, Escape, restore focus) |
| `EventEmptyState` / `EventErrorState` / `EventSkeleton` | Empty, error, loading |

Typography tokens: `components/events/eventReadability.ts`.

---

## 8. Future extension points

Do **not** treat these as in-scope for 10D.6; they are intentional seams:

1. **Live feeds** — swap seed repositories behind the same list APIs; keep `EventIntelligenceCatalog.source` honest (`"seed"` → `"live"`).
2. **Server My Events** — replace `myEventsStore` localStorage with authenticated persistence.
3. **Alert delivery** — wire `prepareAlertDrafts` to notification channels.
4. **LLM summaries** — optional overlay on `summaryEngine` / `aiSummary` without changing score contracts.
5. **Prediction / backtesting** — new modules outside the current scoring pipeline.
6. **Virtualized lists** — if catalog size grows past seed scale, virtualize timeline/agenda only.

---

## 9. Production QA checklist (10D.6)

- [x] Unit tests: filters, intelligence, linking, catalog validation
- [x] Unique IDs, date/time validity, sort order, status alignment
- [x] Empty / error / loading states never blank the page
- [x] Drawer keyboard: Escape, focus move/restore, Tab cycle inside panel
- [x] Search debounce; filter memoization; related-event memoization in drawer
- [x] Responsive filter rail (closed on small screens by default)
- [x] Documentation (this file)

**Validation commands**

```bash
npm run test -- src/core/events
npx tsc --noEmit
npm run lint
npm run build
```

**10D.6 RC status (2026-07-25)**

| Gate | Result |
|------|--------|
| Event unit tests | 30/30 passed |
| Event ESLint (scoped) | Clean |
| Production `next build` | Passed (`/events` static, 16.2 kB route) |
| Adjacent build blockers fixed | Edge instrumentation ignore for Node bootstrap; breadth optional fields; OHLC `attempted` narrowing; `module` rename in trade-integrity |

### Dashboard widget visibility (bug fix)

The widget was **mounted** in `app/page.tsx` as `DashboardWidget id="economic-calendar"` → `EventIntelligenceDashboardWidget`, but workspace templates and migration **v5** kept `visible: false`.

Fix: templates default to visible; workspace store **v7** migration reveals Event Intelligence for existing layouts.
