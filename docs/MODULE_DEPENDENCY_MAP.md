# Module Dependency Map

Sprint 11F

---

## Allowed dependency direction

```
app  →  components  →  hooks / services / types / src/design (presentation)
                 ↘
                   services  →  lib/*  →  adapters / providers
                             ↘
                               src/core · src/modules
```

### Forbidden (architecture violations)

| From | Must not import |
|---|---|
| `components/**` | `lib/adapters/**`, `lib/providers/**` (except types if unavoidable) |
| `hooks/**` | Adapters / providers implementation modules |
| `services/**` | React / `components/**` |
| `lib/adapters/**` | `components/**`, `app/**` |
| `src/core/**` | `components/**`, `app/**` |

---

## Service → engine map

| Service façade | Primary engines / domains |
|---|---|
| `marketData` | `lib/market`, portfolio/watchlist aggregates |
| `marketIntelligence` | `lib/market-intelligence`, modules context/regime |
| `marketHeatmapData` | `lib/market-heatmap` |
| `researchDashboardData` | breadth/pulse (`lib/market-breadth`, …) |
| `researchData` | company research terminal bundle |
| `researchWorkspace` | `src/core/research` |
| `companyData` | company profiles / fundamentals |
| `opportunityEngine` | `lib/opportunity-engine`, recommendations bridge |
| `paperTrading` | `lib/paper-trading` |
| `eventIntelligence` | `src/core/events` |
| `screenerData` | `lib/screener` |
| `watchlistPlatform` | `src/core/watchlists` |
| `portfolioAnalysisData` | portfolio doctor |
| `equityIntelligenceData` | equity intelligence engine |
| `institutionalValidationData` | validation / integrity snapshot |
| `verifiedMarketNews` | news ingestion |

---

## UI systems

```
Feature UI ──► components/ui  (primary)
           ──► src/design     (institutional / glass / widgets)

Do not introduce a third primitive set.
```

---

## React context graph

```
app/layout
  └─ ThemeProvider (src/design/theme)
       └─ AppShell
            ├─ AIWorkspaceProvider
            ├─ GlobalEventDrawerProvider
            └─ RecommendationDetailDrawerProvider

Dashboard subtree
  └─ DashboardQuoteProvider  ← useMarketQuotes may attach here
```

---

## Data flow (quotes)

```
UI hook useMarketQuotes
  → /api/market/quotes
    → market quote engine
      → provider failover
        → adapters (NSE / Finnhub / BSE / mock)
```
