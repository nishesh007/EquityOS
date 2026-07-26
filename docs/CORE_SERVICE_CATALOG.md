# Core Service Catalog

Sprint 11F — import as `@/services/<file>` (no barrel).

---

## Market & research

| Service | File | Responsibility |
|---|---|---|
| Market data | `marketData.ts` | Indices, portfolio snapshot, watchlist, news, results aggregates |
| Market intelligence | `marketIntelligence.ts` | Context / regime / pipeline snapshot (+ cache) |
| Market heatmap | `marketHeatmapData.ts` | Sector heatmap payload |
| Research dashboard | `researchDashboardData.ts` | Breadth + pulse for research/markets |
| Empty breadth | `emptyMarketBreadth.ts` | Empty `MarketBreadth` constant (re-exported where needed) |
| Company research | `researchData.ts` | Per-symbol research terminal bundle |
| Research workspace | `researchWorkspace.ts` | Bridge to `src/core/research` |
| Company data | `companyData.ts` | Company profiles / related fetches |
| Screener | `screenerData.ts` | Screener run / results façade |
| Verified news | `verifiedMarketNews.ts` | RSS/XML verified news |

---

## Intelligence & validation

| Service | File | Responsibility |
|---|---|---|
| Opportunity engine | `opportunityEngine.ts` | Opportunities / recommendations bridge |
| Equity intelligence | `equityIntelligenceData.ts` | Equity intelligence snapshot |
| Event intelligence | `eventIntelligence.ts` | Event catalog façade for UI/API |
| Earnings calendar | `earningsCalendar.ts` | Earnings calendar surfaces |
| Portfolio analysis | `portfolioAnalysisData.ts` | Portfolio doctor / analysis |
| Institutional validation | `institutionalValidationData.ts` | Platform health / validation snapshot |
| Watchlist platform | `watchlistPlatform.ts` | Smart watchlist / intelligence |

---

## Trading lab

| Service | File | Responsibility |
|---|---|---|
| Paper trading | `paperTrading.ts` | Paper Trading Lab state + sync façade |

---

## Analytics (Sprint 11F.1)

Shared analytics is **not** a page façade — use engines/components directly:

| Module | Path |
|---|---|
| Types + metrics + time range + export | `@/lib/analytics` |
| KPI / cards / tables / charts / filters | `@/components/analytics` |

Docs: `docs/ANALYTICS_ARCHITECTURE.md`.

---

## Conventions

1. Services are **async-friendly façades** — map engine results to presenter/DTO shapes for pages.
2. **No React** inside services.
3. Prefer existing engines under `lib/` or `src/core` over duplicating fetch logic.
4. Naming mix (`*Data` vs verb nouns) is historical; when adding new services, prefer **domainNoun.ts** (`paperTrading`, `eventIntelligence`) over `*Data` suffixes.
5. Do not rename existing façades casually — wide import churn for little gain.
