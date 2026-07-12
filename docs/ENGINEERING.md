# EquityOS Engineering Documentation

Sprint 7A — Live Market Data Engine

---

## Architecture Overview

EquityOS is a **Next.js 15 App Router** application with **React 19** and **TypeScript**. Sprint 7A replaces the mock-only data layer with a production-grade provider architecture while keeping the UI visually identical.

```
┌─────────────────────────────────────────────────────────────┐
│                        App Router (app/)                     │
│  Dashboard · Portfolio · Company Page                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   UI Components (components/)                │
│  Display-only — never calls providers or adapters            │
└──────────────────────────┬──────────────────────────────────┘
                           │ props
┌──────────────────────────▼──────────────────────────────────┐
│                   Services (services/)                       │
│  companyData · marketData · researchData · intelligence      │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              Market Engines (lib/market/)                    │
│  quote-engine · ohlc-engine                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│         Provider Failover (lib/providers/failover.ts)        │
│  Primary → Secondary → BSE (tertiary) → Mock                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              API Adapters (lib/adapters/)                    │
│  NSE · BSE · Finnhub · Polygon · AlphaVantage · FMP · OpenAI │
└─────────────────────────────────────────────────────────────┘
```

---

## Provider Architecture

Every provider implements the same `MarketDataProvider` interface:

| Method | Purpose |
|---|---|
| `isAvailable()` | Returns true when env config + API key are present |
| `fetchQuote(symbol)` | Stock LTP, OHLC, volume, delivery %, VWAP |
| `fetchIndex(symbol)` | NIFTY, SENSEX, BANK NIFTY, INDIA VIX |
| `fetchOhlc(symbol, timeframe)` | Historical candles for local chart fallback |

### Provider Tiers

| Tier | Default | Role |
|---|---|---|
| **Primary** | NSE (`MARKET_PROVIDER_PRIMARY=nse`) | Live NSE equity quotes |
| **Secondary** | Finnhub (`MARKET_PROVIDER_SECONDARY=finnhub`) | Global quote API with `.NS` suffix |
| **Tertiary** | BSE (auto when `BSE_ENABLED=true`) | BSE scrip fallback for NSE failures |
| **Mock** | Always available | Deterministic seed data — never breaks UI |

### Adapter Lifecycle

1. **Construction** — Adapter reads env config via `loadProviderConfig()`
2. **Status** — `stub` (no key) → `ready` (configured) → `connected` (future: post health-check)
3. **Fetch** — HTTP call via `adapterFetch()` with timeout + headers
4. **Failover** — On throw, next provider in chain is tried silently
5. **Terminal** — Mock provider always succeeds

**Rule: No React component may call any provider or adapter directly.**

---

## Request Flow

### Live Quote (Dashboard / Watchlist / Company Header)

```
Page → service.fetch*()
  → lib/market/getLiveQuote(symbol)
    → lib/cache/getCached (TTL: 15s, deduplicated)
      → lib/providers/failover.fetchQuoteWithFailover()
        → [NSE | Finnhub | BSE | Mock]
          → lib/adapters/*.fetch()
            → HTTP API (or mock seed)
      → LiveQuote merged into UI types
```

### OHLC Candles (Local Chart Fallback)

```
ResearchTerminal → company.priceHistory
  → services/companyData.fetchCompanyProfile()
    → lib/market/getFullPriceHistory(symbol)
      → lib/cache/getCached (TTL: 1hr)
        → [Polygon | Mock synthetic OHLC]
```

### TradingView Isolation

- Controlled by `NEXT_PUBLIC_ENABLE_TRADINGVIEW` (default: `false`)
- Loaded via `LazyTradingViewChart` with `next/dynamic` + `ssr: false`
- On CDN failure or symbol resolution failure → `CustomCandlestickChart` from `priceHistory`
- No runtime dialogs, no blank charts

---

## Cache Strategy

| Data Category | TTL | Cache Key Pattern |
|---|---|---|
| Market Quotes | 15s | `quote:{SYMBOL}` |
| Index Quotes | 15s | `index:{SYMBOL}` |
| Company Fundamentals | 5min | `fundamentals:{SYMBOL}` |
| Quarterly Results | 10min | `fundamentals-quarterly:{SYMBOL}` |
| Corporate Actions | 30min | `fundamentals-actions:{SYMBOL}` |
| Company Profile (UI) | 5min | `company-profile:{SYMBOL}` |
| Historical Candles | 1hr | `ohlc:{SYMBOL}:{TF}` |
| Research Bundle | 2min | `company-research:{SYMBOL}` |
| Dashboard Aggregates | 60s | `market-breadth`, `market-pulse`, etc. |

### Request Deduplication

`lib/cache/getCached()` tracks in-flight promises by key. Concurrent requests for the same symbol share a single API call.

---

## Fallback Strategy

```
Provider A fails (throw / timeout / HTTP error)
  → Provider B
    → Provider B fails
      → Mock Provider (deterministic seed from lib/providers/mock-data.ts)
```

The UI always receives one of:
- **Live Data** — from configured API
- **Cached Data** — from TTL cache (may be live or mock)
- **Mock Data** — seed fallback
- **Graceful unavailable** — empty volume `"—"` on watchlist edge cases only

No React runtime errors. Route-level `loading.tsx` / `error.tsx` handle page boundaries.

---

## Environment Variables

Copy `.env.example` to `.env.local`:

| Variable | Purpose | Default |
|---|---|---|
| `MARKET_PROVIDER_PRIMARY` | Primary quote provider | `nse` |
| `MARKET_PROVIDER_SECONDARY` | Secondary fallback | `finnhub` |
| `NSE_ENABLED` | Enable NSE adapter | `false` |
| `NSE_API_BASE_URL` | NSE API base URL | `https://www.nseindia.com/api` |
| `BSE_ENABLED` | Enable BSE adapter | `false` |
| `BSE_API_BASE_URL` | BSE API base URL | `https://api.bseindia.com` |
| `FINNHUB_API_KEY` | Finnhub API key | — |
| `POLYGON_API_KEY` | Polygon OHLC key | — |
| `ALPHA_VANTAGE_API_KEY` | Alpha Vantage key | — |
| `FMP_API_KEY` | Financial Modeling Prep key | — |
| `FUNDAMENTALS_PROVIDER_PRIMARY` | Primary fundamentals provider | `fmp` |
| `FUNDAMENTALS_PROVIDER_SECONDARY` | Fundamentals fallback | `alphavantage` |
| `OPENAI_API_KEY` | OpenAI key (Sprint 8+) | — |
| `NEXT_PUBLIC_ENABLE_TRADINGVIEW` | TradingView widget | `false` |

When no API key is configured, the mock provider activates automatically.

---

## Folder Structure (Sprint 7A Additions)

```
lib/
├── adapters/
│   ├── http.ts              # Shared fetch with timeout
│   ├── nse.ts               # NSE quote adapter (live when enabled)
│   ├── bse.ts               # BSE quote adapter (live when enabled)
│   ├── finnhub.ts           # Finnhub quote adapter
│   ├── polygon.ts           # Polygon OHLC adapter
│   └── index.ts             # Adapter registry
├── cache/
│   └── index.ts             # TTL cache + deduplication
├── market/
│   ├── quote-engine.ts      # Single entry for live quotes
│   ├── ohlc-engine.ts       # Single entry for candles
│   └── index.ts
└── providers/
    ├── types.ts             # MarketDataProvider interface
    ├── config.ts            # Env-driven configuration
    ├── mock-data.ts         # Seed quotes + synthetic OHLC
    ├── mock-provider.ts     # Development fallback
    ├── adapter-providers.ts # NSE/BSE/Finnhub/Polygon wrappers
    ├── failover.ts          # Primary → Secondary → Mock chain
    └── index.ts
```

---

## Scoring Flow

**Rule: No score is calculated in UI components.**

```
CompanyProfile (with live price overlay)
      │
      ▼
EquityIntelligenceEngine.calculateEquityScores()
      │
      ▼
mappers.toEquityScore()  →  EquityScore
      │
      ▼
EquityScoreEngine.tsx (display only)
```

Momentum scores now consume live `changePercent` when available.

---

## Performance

| Technique | Implementation |
|---|---|
| Lazy loading | `LazyTradingViewChart` via `next/dynamic` |
| Memoization | `hooks/useMemoizedValue.ts` |
| Server caching | `lib/cache/getCached()` with tiered TTL |
| Request dedup | In-flight promise map in cache layer |
| Client caching | `hooks/useCachedData.ts` (prepared for polling) |
| SSR | Server Components for all pages |

---

## Error Handling

| Layer | Mechanism |
|---|---|
| Route | `app/*/error.tsx` with retry button |
| Section | `components/ui/ErrorBoundary.tsx` |
| 404 | `app/company/[symbol]/not-found.tsx` |
| Provider | Silent failover — no throws reach UI |
| Adapter | Throws caught by failover chain |

---

## Developer Onboarding

### Setup

```bash
git clone <repo>
cd EquityOS
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`

### Key Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
npx tsc --noEmit # Type check
```

### Enabling Live Data

1. Copy `.env.example` → `.env.local`
2. Set `FINNHUB_API_KEY` (easiest starting point for Indian `.NS` symbols)
3. Or set `NSE_ENABLED=true` for direct NSE quotes
4. Set `POLYGON_API_KEY` for live OHLC candles
5. Restart dev server

---

## Supported Symbols

**Core seed (full static fundamentals):** `RELIANCE`, `TCS`, `HDFCBANK`, `INFY`, `ICICIBANK`, `BHARTIARTL`, `SBIN`, `LT`, `WIPRO`, `ADANIENT`, `MARUTI`

**Extended registry (dashboard / movers):** `COFORGE`, `TRENT`, `TATASTEEL`, `BAJFINANCE`, `BEL`, `DIXON`, `PERSISTENT`, and 15+ more in `lib/fundamentals/nse-registry.ts`

**Any valid NSE ticker** (1–20 alphanumeric characters) resolves via dynamic seed fallback when not in the static seed set.

Provider ticker mappings (`lib/fundamentals/symbols.ts`):

| Provider | NSE Example | Mapped Ticker |
|---|---|---|
| FMP | COFORGE | `COFORGE.NS` |
| Alpha Vantage | COFORGE | `COFORGE.BSE` |
| Finnhub | COFORGE | `COFORGE.NS` |

Indices: `NIFTY`, `SENSEX`, `BANKNIFTY`, `INDIAVIX`

---

---

## Sprint 7B — Fundamentals Engine

Sprint 7B adds a production-ready fundamentals data layer parallel to the Sprint 7A market data engine. **UI components are unchanged** — only the service layer was upgraded.

### Fundamentals Flow

```
Page → services/companyData.fetchCompanyProfile()
  → lib/fundamentals/fetchFundamentalsBundle()
    → lib/cache/getCached (TTL: 5min)
      → lib/fundamentals/failover.fetchFundamentalsWithFailover()
        → [FMP | Alpha Vantage | Mock]
          → lib/adapters/*.fetch()
            → lib/fundamentals/*-normalizer.ts
          → growth-engine · shareholding-engine · quarterly-engine
          → corporate-actions · timeline-engine
      → bundleToCompanyProfile() + live quote overlay
```

### Fundamentals Provider Tiers

| Tier | Default | Role |
|---|---|---|
| **Primary** | FMP (`FUNDAMENTALS_PROVIDER_PRIMARY=fmp`) | Income/balance/cashflow, ratios, key metrics |
| **Secondary** | Alpha Vantage | OVERVIEW + INCOME_STATEMENT fallback |
| **Mock** | Always available | 11-symbol seed from `lib/fundamentals/mock-data.ts` |

Every provider implements `FundamentalsProvider.fetchFundamentals(symbol)`.

### Financial Normalization

Raw provider responses are normalized in:

- `lib/fundamentals/fmp-normalizer.ts` — FMP statements, market cap, quarterly/annual tables
- `lib/fundamentals/av-normalizer.ts` — Alpha Vantage OVERVIEW and income reports
- `lib/fundamentals/normalize.ts` — INR crore formatting, ratio display, valuation status

Supported statements (annual + quarterly):

- Income Statement
- Balance Sheet
- Cash Flow Statement

Supported ratios: Market Cap, EV, P/E, Forward P/E, PEG, P/B, P/S, EV/EBITDA, Dividend Yield, ROE, ROCE, ROA, Debt/Equity, Current Ratio, Interest Coverage, Operating/Net/Gross Margin, EPS, Book Value, Free Cash Flow.

### Growth Calculations

`lib/fundamentals/growth-engine.ts` computes:

- Revenue Growth (YoY)
- Profit Growth (YoY)
- EPS Growth
- Operating Cash Flow Growth
- Free Cash Flow Growth
- 3-Year CAGR
- 5-Year CAGR

CAGR formula: `((end / start) ^ (1 / years) - 1) × 100`

### Shareholding Engine

`lib/fundamentals/shareholding-engine.ts`:

- Normalizes Promoter / FII / DII / Public percentages
- Computes QoQ changes vs previous quarter snapshot
- Merges live data with mock seed for Indian registry fields not yet in API responses

### Corporate Actions Flow

`lib/fundamentals/corporate-actions.ts` generates normalized actions:

Dividend · Bonus · Split · Rights · Buyback · Merger · Demerger

Cached separately at 30-minute TTL (`fundamentals-actions:{SYMBOL}`).

### Company Timeline

`lib/fundamentals/timeline-engine.ts` merges chronologically:

- Quarterly Results (with earnings surprise annotation)
- Corporate Actions
- Major Announcements (from news seed)

Timeline feeds `EquityIntelligence.timeline` without UI changes.

### Folder Structure (Sprint 7B Additions)

```
lib/fundamentals/
├── types.ts                 # FundamentalsProvider interface + bundle types
├── config.ts                # FUNDAMENTALS_PROVIDER_* env config
├── normalize.ts             # INR formatting + valuation helpers
├── growth-engine.ts         # YoY growth + CAGR
├── shareholding-engine.ts   # QoQ shareholding changes
├── quarterly-engine.ts      # QoQ/YoY + earnings surprises
├── corporate-actions.ts     # Action normalization
├── timeline-engine.ts       # Chronological event merge
├── ratios-engine.ts         # Ratio merge + computation
├── fmp-normalizer.ts        # FMP response normalization
├── av-normalizer.ts         # Alpha Vantage normalization
├── mock-data.ts             # 11-symbol static seeds
├── mock-provider.ts         # Terminal fallback
├── adapter-providers.ts     # Provider factory
├── failover.ts              # Primary → Secondary → Mock
├── engine.ts                # fetchFundamentalsBundle entry point
├── providers/
│   ├── fmp-provider.ts
│   └── alphavantage-provider.ts
└── index.ts
```

---

## Future Roadmap

### Sprint 7C (Suggested)

- WebSocket real-time quote streaming
- Rate limiting / request queue for free-tier APIs
- Redis or edge cache for serverless persistence
- NSE/BSE shareholding API integration

### Sprint 8 (Suggested)

- OpenAI adapter for live AI thesis generation
- Portfolio persistence (database)
- Authentication layer

---

*Last updated: Sprint 7B — Fundamentals Engine*
