# EquityOS

A premium dark-themed equity research and portfolio management terminal for Indian markets. Built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- **Market Overview** — Live indices, breadth, heatmap, and movers
- **Portfolio & Watchlist** — Holdings, P&L, and tracked symbols
- **Company Research** — Fundamentals, technicals, valuation, AI analysis
- **Event Intelligence** — Earnings, corporate actions, macro calendar
- **Opportunity Engine** — Strategy recommendations with institutional audit trails
- **Paper Trading Lab** — Virtual execution against live recommendations
- **AI Workspace** — Research chat, compare, and screener assistants

## Tech Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS · Lucide React
- Zod · PostgreSQL client (`pg`) · Vitest

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/           # Next.js App Router pages + API routes
components/    # Feature UI + components/ui primitives
hooks/         # Shared client hooks
lib/           # Engines, adapters, cache, formatters
services/      # Page-facing data façades
src/           # Domain core, design platform, strategies
types/         # Shared TypeScript models
docs/          # Architecture + engineering docs
styles/        # Global tokens (globals.css)
```

See [docs/ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md) and [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md).

## Scripts

- `npm run dev` — Start development server (Turbopack)
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint
- `npm run test` — Run Vitest
