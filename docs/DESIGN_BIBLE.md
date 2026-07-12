# EquityOS Design Bible

Permanent UI standard for EquityOS. All new components must follow these rules. Sprint 6 codifies existing patterns — no redesign.

---

## Premium UI Philosophy

EquityOS is a **dark-first institutional trading terminal**. The interface prioritizes:

- Data density without clutter
- Calm, confident typography
- Subtle depth via glass surfaces and soft shadows
- Motion that guides attention, never distracts
- Financial data always in monospace tabular numerals

---

## Dark Theme Rules

- **Always dark mode.** Root layout sets `className="dark"` on `<html>`.
- **Never introduce light theme variants** unless explicitly scoped.
- Background uses layered radial gradients (`globals.css`) — do not remove.
- Surface hierarchy:
  - `surface` (#0c0c10) — page background
  - `surface-raised` (#111116) — elevated panels
  - `surface-overlay` (#16161d) — nested content areas
  - `surface-hover` (#1a1a22) — interactive hover states

---

## Color Usage

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | #f4f4f5 | Headings, primary values |
| `text-secondary` | #a1a1aa | Secondary labels |
| `text-muted` | #71717a | Subtitles, descriptions |
| `text-faint` | #52525b | Tertiary metadata |
| `accent` | #3b82f6 | Links, active states, intelligence badges |
| `gain` | #22c55e | Positive change, bullish signals |
| `loss` | #ef4444 | Negative change, bearish signals |
| `surface-border` | #22222e | Card borders |
| `surface-border-subtle` | #1a1a24 | Inner dividers |

**Rules:**
- Gain/loss colors only for financial direction — never for decoration.
- Accent for interactive focus and intelligence engine branding.
- Do not add new color tokens without design review.

---

## Typography Scale

| Element | Classes | Font |
|---|---|---|
| Page title | `text-xl font-semibold tracking-tight text-text-primary` | Inter (sans) |
| Page subtitle | `text-sm text-text-muted` | Inter |
| Card title | `text-sm font-semibold text-text-primary tracking-tight` | Inter |
| Card subtitle | `text-xs text-text-muted` | Inter |
| Data label | `.data-label` → `text-xs font-medium uppercase tracking-wider text-text-muted` | Inter |
| Data value | `.data-value` → `font-mono text-text-primary tabular-nums` | JetBrains Mono |
| Score display | `font-mono text-3xl font-bold tabular-nums` | JetBrains Mono |
| Micro label | `text-[10px] font-medium uppercase tracking-wider` | Inter |

Fonts loaded via `next/font` in `app/layout.tsx`:
- `--font-inter` (sans)
- `--font-jetbrains` (mono)

---

## Spacing System

Base unit: **4px** (Tailwind default).

| Context | Spacing |
|---|---|
| Page padding | `p-6` |
| Section gap | `mb-6` / `space-y-6` |
| Card padding (default) | `p-5` (Card `padding="md"`) |
| Card padding (large) | `p-6` (Card `padding="lg"`) |
| Card padding (compact) | `p-4` (Card `padding="sm"`) |
| Card header margin | `mb-4` |
| Grid gap | `gap-6` |
| Inline element gap | `gap-2` to `gap-3` |
| Title to subtitle | `mt-0.5` |

**Rule:** Never use arbitrary spacing values. Stick to Tailwind scale (0.5, 1, 1.5, 2, 3, 4, 5, 6).

---

## Card Rules

All cards use the `.glass-card` utility:

```
bg-surface-raised/80 backdrop-blur-xl border border-surface-border-subtle shadow-card rounded-xl
```

- **Border radius:** `rounded-xl` (12px) for cards; `rounded-lg` (8px) for inner panels.
- **Padding:** Use `<Card padding="sm|md|lg">` — never raw divs for primary containers.
- **Hover:** Optional `hover:bg-surface-hover/60` via Card `hover` prop.
- **Inner panels:** `rounded-lg border border-surface-border-subtle bg-surface-overlay/30`
- **Card headers:** Use `<CardHeader title subtitle action />`.

---

## Button Rules

Action buttons on company pages use existing `ActionButtons` patterns:

- Border: `border border-surface-border`
- Background: `bg-surface-overlay`
- Hover: `hover:bg-surface-hover`
- Text: `text-xs font-medium text-text-primary`
- Padding: `px-3 py-1.5`
- Radius: `rounded-lg`
- No filled primary buttons unless already established in context.

---

## Border Radius

| Element | Radius |
|---|---|
| Cards | `rounded-xl` |
| Inner panels, inputs | `rounded-lg` |
| Badges, pills | `rounded-lg` or `rounded-full` |
| Scrollbar thumb | `rounded-full` |

---

## Shadow Usage

| Token | Value | Usage |
|---|---|---|
| `shadow-card` | `0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)` | All glass cards |
| `shadow-glow` | `0 0 20px rgba(59, 130, 246, 0.15)` | Accent highlights only |
| Score gauge | `drop-shadow(0 0 6px {color}55)` | Inline on SVG stroke |

Do not add box shadows to arbitrary elements.

---

## Grid Rules

| Layout | Classes |
|---|---|
| Dashboard two-column | `grid grid-cols-1 gap-6 xl:grid-cols-2` |
| Market overview | `grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4` |
| Company research | `grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(420px,0.85fr)]` |
| Score factors | `grid grid-cols-1 gap-3 md:grid-cols-2` |
| Equity score layout | `grid grid-cols-1 gap-6 xl:grid-cols-[220px_minmax(0,1fr)]` |

Use `minmax(0, 1fr)` to prevent grid blowout with long content.

---

## Animation Rules

| Animation | Class | Usage |
|---|---|---|
| Fade in up | `animate-fade-in-up` | Page sections on load |
| Stagger delay | `[animation-delay:60ms]` increments | Dashboard sections |
| Pulse | `animate-pulse` | Loading skeletons only |
| Terminal scan | `animate-terminal-scan` | Intelligence engine accent |
| Score gauge | `transition: stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)` | SVG arc fill |
| Sidebar | `transition-[margin-left] duration-300` | Layout shift |
| Card hover | `transition-all duration-300 hover:-translate-y-0.5` | Score factor cards |

**Reduced motion:** `prefers-reduced-motion: reduce` zeroes all animations in `globals.css`. Never override this.

---

## Loading States

- **Never show blank screens.** Every route has a `loading.tsx` with skeleton components.
- Skeletons use `animate-pulse rounded-md bg-surface-overlay/60`.
- Skeleton cards mirror real card structure with `glass-card p-5`.
- TradingView chart uses `LazyTradingViewChart` with inline chart skeleton.
- Loading text (e.g. chart resolving) uses `text-xs text-text-muted`.

---

## Error States

- Route-level `error.tsx` on `/`, `/portfolio`, `/company/[symbol]`.
- Client `ErrorBoundary` component for isolating section failures.
- Error cards use `border-loss/20` with `AlertTriangle` icon.
- Error copy: concise, actionable ("Try again" button).
- Never expose stack traces to users.

---

## Empty States

When lists are empty (e.g. watchlist):

- Centered layout within the card.
- Muted text: `text-sm text-text-muted`.
- Optional icon at `h-8 w-8 text-text-faint`.
- No aggressive CTAs — informational tone.

---

## Component Inventory

| Component | Path | Role |
|---|---|---|
| Card | `components/ui/Card.tsx` | Primary container |
| ScoreGauge | `components/ui/ScoreGauge.tsx` | 0–100 radial gauge |
| Skeleton | `components/ui/Skeleton.tsx` | Loading placeholders |
| ErrorBoundary | `components/ui/ErrorBoundary.tsx` | Section error isolation |
| Badge | `components/ui/Badge.tsx` | Status labels |
| MetricCard | `components/ui/MetricCard.tsx` | KPI display |

---

*This document is the permanent UI standard. Changes require architect approval.*
