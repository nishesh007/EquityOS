# EquityOS

A premium dark-themed equity research and portfolio management terminal for Indian markets. Built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- **Market Overview** — Live indices (Nifty 50, Sensex, Bank Nifty, India VIX) with sparklines
- **Portfolio Summary** — Holdings, P&L, and performance metrics
- **Watchlist** — Track stocks with real-time price changes
- **AI Market Summary** — AI-powered market sentiment and sector outlook
- **Market News** — Latest financial news feed
- **Results Calendar** — Upcoming earnings announcements

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Lucide React icons

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/           # Next.js App Router pages
components/    # Reusable React components
  dashboard/   # Dashboard section components
  layout/      # Shell, sidebar, top nav
  ui/          # Base UI primitives
hooks/         # Custom React hooks
lib/           # Utilities
services/      # Data services
styles/        # Global styles
types/         # TypeScript type definitions
```

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint
