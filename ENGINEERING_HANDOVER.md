# EquityOS — Engineering Handover (Sprint 5 Complete)

**Date:** 12 July 2026  
**Branch:** `main`  
**Status:** Stable — build, dev, TypeScript, lint, and browser verification all pass.

---

## Current Architecture

EquityOS is a **Next.js 15 App Router** application using **React 19**, **TypeScript**, and **Tailwind CSS**. It presents a premium Indian equity research terminal with three live routes and a shared application shell.

### Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15.5 (App Router, RSC) |
| UI | React 19, Tailwind CSS 3.4, Lucide icons |
| Language | TypeScript 5.7 (strict) |
| Linting | ESLint 9 flat config (`eslint .`) |
| Fonts | Inter (UI), JetBrains Mono (data) via `next/font` |

### Rendering Model

- **Server Components** fetch mock data from `services/*` at request/build time.
- **Client Components** (`"use client"`) handle interactivity: sidebar collapse, watchlist removal, tab switching, chart timeframes, action buttons.
- **No external API** — all market, research, and intelligence data is deterministic mock data generated in-process.

### Key Architectural Decisions

1. **Isolated dev cache** (`next.config.ts`): `distDir` is `.next-dev` in development and `.next` in production. Prevents ENOENT / `_document.js` / webpack manifest corruption when `next dev` and `next build` run concurrently.

2. **Route helpers** (`lib/routes.ts`): `getCompanyRoute()` is extracted so client components avoid importing heavy `companyData` service modules.

3. **Deterministic mock data** (`lib/random.ts`): Seeded PRNG (`createRng`, `hashSeed`) ensures server and client renders produce identical values — no hydration mismatches from `Math.random()` or `Date.now()`.

4. **TradingView opt-in** (`TradingViewChart.tsx`): Local SVG candlestick chart is the default. TradingView widget loads only when `NEXT_PUBLIC_ENABLE_TRADINGVIEW=true`, avoiding third-party network console errors in development.

5. **Hydration fix** (`app/layout.tsx`): `data-scroll-behavior="smooth"` on `<html>` suppresses Next.js 15 scroll-behavior hydration warning.

---

## Folder Structure

```
EquityOS/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout, fonts, AppShell
│   ├── page.tsx                  # Dashboard (/)
│   ├── portfolio/page.tsx        # Portfolio (/portfolio)
│   └── company/[symbol]/
│       ├── page.tsx              # Company research + intelligence
│       └── not-found.tsx         # 404 for unknown symbols
├── components/
│   ├── layout/                   # AppShell, Sidebar, TopNav
│   ├── dashboard/                # Dashboard widgets (12 components)
│   ├── company/
│   │   ├── intelligence/         # Sprint 5 Equity Intelligence Engine (9 components)
│   │   ├── research/             # Sprint 4 Research Terminal (8 components)
│   │   ├── tabs/                 # Company tab panels (8 tabs)
│   │   └── *.tsx                 # Header, breadcrumb, charts, actions
│   └── ui/                       # Shared primitives (Card, Badge, Sparkline, etc.)
├── hooks/
│   └── useWatchlist.ts           # Client-side watchlist state
├── lib/
│   ├── routes.ts                 # Route helpers
│   ├── random.ts                 # Seeded PRNG for mock data
│   └── utils.ts                  # Formatting helpers (cn, formatPrice, etc.)
├── services/                     # Mock data layer (no network calls)
│   ├── marketData.ts             # Indices, portfolio, watchlist, news
│   ├── researchDashboardData.ts  # Market pulse, breadth, AI ideas
│   ├── companyData.ts            # Company profiles and price history
│   ├── researchData.ts           # Research terminal data per symbol
│   └── equityIntelligenceData.ts # Equity Intelligence Engine per symbol
├── styles/globals.css            # Tailwind base, dark theme tokens
├── types/index.ts                # Shared TypeScript interfaces
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── eslint.config.mjs
└── package.json
```

---

## Completed Modules

### Sprint 1–2: Foundation
- Next.js project scaffold, dark trading-terminal theme
- App shell with sidebar navigation and top search bar
- Shared UI primitives (Card, Badge, Sparkline, TabBar, DataTable, etc.)
- Tailwind design tokens (surface, gain/loss, accent)

### Sprint 3: Trading Terminal Dashboard
- Market overview cards (Nifty, Sensex, Bank Nifty, VIX)
- Market pulse, breadth, sector heatmap
- Top gainers/losers, 52-week highs/lows, most active
- AI intraday and swing trade ideas
- Portfolio summary and watchlist widgets
- AI market summary, latest news, upcoming results calendar

### Sprint 4: Company Research Terminal
- Dynamic `/company/[symbol]` route with metadata
- Company header, key stats, financial summary cards
- Research terminal: advanced chart, technical indicators, swing trade setup, AI analysis, news, quarterly results
- Company tabs: Overview, Financials, Quarterly, Shareholding, Peers, Valuation, News, Notes
- Action buttons (watchlist, note, AI analyse, compare)

### Sprint 5: Equity Intelligence Engine
- EquityOS Score (six-factor model with gauge and breakdown)
- AI Investment Thesis (bull/bear case, risks, catalysts, moat, fair value)
- Financial Health grid with sparklines
- Institutional Peer Comparison table
- Quarterly Intelligence timeline
- AI Investor Summary (HOLD/BUY/SELL view)
- Investment Checklist (8 quality checks)
- Company Timeline (corporate events)

### Sprint 5.1: Stability Pass
- Isolated `.next-dev` cache directory
- ESLint flat config migration
- Hydration warning fixes
- TradingView fallback chart
- Deterministic mock data
- Zero build/TS/lint/console errors

### Sprint 5 Final: Cleanup
- Removed dead `PriceChart.tsx` (superseded by `TradingViewChart`)
- Extracted duplicate PRNG into `lib/random.ts`
- Removed unused exports, types, CSS utilities, and Tailwind keyframes
- Fixed `ActionButtons` timeout cleanup on unmount
- Lifted sidebar collapse state to `AppShell` for layout sync

---

## Live Routes

| Route | Status | Description |
|-------|--------|-------------|
| `/` | ✅ Live | Equity Research Terminal (dashboard) |
| `/company/[symbol]` | ✅ Live | Company research + intelligence (e.g. `/company/RELIANCE`) |
| `/portfolio` | ✅ Live | Portfolio summary + watchlist |
| `/_not-found` | ✅ Live | 404 page |

### Sidebar Links (UI Only — Not Implemented)

Markets, Watchlist, News, Results, AI Insights, Screener, Settings — these render in the sidebar but have no corresponding pages.

---

## Known Limitations

1. **All data is mock** — No real market API, database, or authentication. Services return hardcoded/deterministic data.

2. **Limited company coverage** — `companyData.ts` defines profiles for a fixed set of NSE symbols. Unknown symbols return 404.

3. **Unimplemented sidebar routes** — Seven navigation items are placeholders.

4. **TradingView disabled by default** — Set `NEXT_PUBLIC_ENABLE_TRADINGVIEW=true` in `.env.local` to load the external widget.

5. **Watchlist is client-only** — `useWatchlist` manages in-memory state; removals persist only for the session. No add-to-watchlist flow wired from action buttons.

6. **Action buttons are UI stubs** — Add Note, AI Analyse, Compare show active state feedback but perform no backend action.

7. **npm audit advisory** — 2 moderate transitive PostCSS findings inside Next.js; no non-breaking fix available.

8. **No tests** — No unit, integration, or E2E test suite.

9. **No CI/CD** — No GitHub Actions or deployment pipeline configured.

---

## Recommended Next Sprint (Sprint 6)

Priority order based on current state:

1. **Real data integration** — Connect to a market data provider (e.g. NSE/BSE API, Yahoo Finance, or a paid terminal feed). Replace mock services with adapter pattern.

2. **Authentication & user state** — User accounts, persisted watchlists, portfolio holdings, and notes.

3. **Implement placeholder routes** — Markets overview, dedicated Watchlist page, News feed, Results calendar, AI Insights hub, Stock Screener, Settings.

4. **Company page depth** — Wire action buttons (add to watchlist, notes, compare). Expand tab content with real financial statements.

5. **Search functionality** — TopNav search bar currently has no handler; implement symbol/company search with autocomplete.

6. **Testing foundation** — Add Vitest/Jest for services and Playwright for critical route smoke tests.

7. **Deployment** — Vercel or containerized deployment with environment configuration.

---

## Technical Debt

| Item | Severity | Notes |
|------|----------|-------|
| Mock data services | High | Entire data layer needs replacement with real APIs |
| No persistence layer | High | Watchlist, notes, portfolio are ephemeral |
| Large `companyData.ts` (~650 lines) | Medium | Should split into seed data + service when real API arrives |
| Sidebar nav items without routes | Medium | Creates dead-end navigation |
| No error boundaries | Low | RSC errors fall through to Next.js defaults |
| No loading/suspense UI | Low | Pages block until all `Promise.all` resolves |
| PostCSS audit advisory | Low | Transitive dependency; monitor Next.js updates |
| `useWatchlist` missing `addItem` | Low | Removed as dead code; re-add when action buttons are wired |

---

## Verification Checklist (Final)

| Check | Result |
|-------|--------|
| `npm install` | ✅ Pass |
| `npx tsc --noEmit` | ✅ Zero errors |
| `npm run lint` | ✅ Zero errors/warnings |
| `npm run build` | ✅ Pass, zero warnings |
| `npm run dev` | ✅ Starts on port 3000 |
| `/` Dashboard | ✅ Renders correctly |
| `/company/RELIANCE` | ✅ Renders correctly |
| `/portfolio` | ✅ Renders correctly |
| Browser console | ✅ Zero application errors |
| Dev + build coexistence | ✅ Isolated `distDir` verified |

---

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # ESLint check
npx tsc --noEmit     # TypeScript check
```

### Optional Environment

```bash
# .env.local
NEXT_PUBLIC_ENABLE_TRADINGVIEW=true   # Enable TradingView widget on company pages
```
