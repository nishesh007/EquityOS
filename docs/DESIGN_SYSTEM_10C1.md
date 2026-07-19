# EquityOS Design System — Sprint 10C.1

**Status: FROZEN · EquityOS UI v1.0 Release Candidate**  
Internal reference for color, typography, spacing, components, motion, and accessibility.  
Presentation layer only — does not document Strategy Engine or data services.

See also: [`RELEASE_CANDIDATE_UI_V1.md`](./RELEASE_CANDIDATE_UI_V1.md) · [`DESIGN_BIBLE.md`](./DESIGN_BIBLE.md)

---

## Architecture

```
styles/globals.css          → CSS variables + base focus / reduced-motion
src/design/theme/           → Core tokens (color, space, radius, type, motion, z)
src/design/themes/          → Premium theme pack + elevation aliases
src/design/DesignSystem.ts  → getDesignSystem() / getThemeTokens()
src/design/components/      → InstitutionalCard, SectionHeader, MetricCard, …
src/design/tables/          → ResearchDataGrid, InstitutionalTable, filters
src/design/command/         → Command palette + shortcuts
src/design/productivity/    → Notifications, AI hub, activity, FAB
src/design/status/          → Freeze + RC status APIs
```

Consumers should import from `@/src/design` rather than inventing local token values.

---

## Color palette

### Surfaces (dark theme)
| Token | Role |
|---|---|
| `surface` | Page background |
| `surface-raised` | Cards / panels |
| `surface-overlay` | Nested surfaces |
| `surface-hover` | Interactive hover |
| `surface-border` / `surface-border-subtle` | Borders & dividers |

### Semantic
| Token | Role |
|---|---|
| `gain` / `loss` | Financial direction only |
| `accent` | Links, focus, AI verified |
| `warning` / `info` | Status semantics |

### Section accents (10C.1)
| Section | Accent |
|---|---|
| Market Pulse | Emerald |
| AI Opportunities | Electric Blue / Sky |
| Portfolio | Amber |
| Watchlist | Cyan |
| Research Workspace | Violet |
| Market Intelligence | Indigo |
| Economic Calendar | Orange |
| Investment Intelligence | Purple |

Source: `lib/ui/section-accents.ts`

---

## Typography scale

| Role | Guidance |
|---|---|
| Page title | `text-xl font-semibold tracking-tight` |
| Section title | `text-lg font-semibold` + section accent color |
| Card title | `text-base font-semibold` |
| Subtitle | `text-sm` / `text-xs text-text-muted` |
| Data label | `.data-label` |
| Data value | `.data-value` (mono tabular) |
| Named variants | `displayXl` … `mono` via `TYPE_SCALE` / `Text` |

Fonts: Inter (sans), JetBrains Mono (numeric).

---

## Spacing scale

Canonical tokens in `src/design/theme/spacingTokens.ts`:  
`xs 4 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 32 · 4xl 40 · 5xl 48 · 6xl 64`

| Context | Token / class |
|---|---|
| Page padding | `p-4 md:p-6 xl:p-8` (`PageContainer`) |
| Section gap | `gap-8 md:gap-10` |
| Card padding | Card `sm|md|lg` → `p-4|p-5|p-6` |
| Grid gaps | `compact|standard|spacious` via `DashboardGrid` |

---

## Radius & elevation

| Radius | px |
|---|---|
| small | 6 |
| medium | 10 |
| large | 14 |
| xl | 20 |
| pill | 9999 |

Elevation aliases (`elevationTokens.ts`) map to `--eos-shadow-card|dropdown|popup|overlay|floating|glass`.

---

## Motion guidelines

Presets: `src/design/motion/motionPresets.ts` + `animationTokens.ts`

| Preset | Intent |
|---|---|
| `cardHover` | Soft lift + shadow |
| `press` | Subtle scale on click |
| `expandCollapse` | Section collapse |
| `shimmer` | Skeleton loading |
| `fade` / `scale` / `slide` | Entrances |
| `progress` | Confidence / progress bars |

Rules:
1. Prefer presets over ad-hoc durations.
2. Honor `prefers-reduced-motion` and `data-motion="reduced"` (globals.css).
3. Keep motion subtle — guide attention, never distract.

---

## Component usage

| Component | Import | Use for |
|---|---|---|
| `Card` / `CardHeader` / `CardFooter` | `@/components/ui/Card` | Dashboard panels |
| `SectionHeader` | `@/src/design` | Major section titles + accents |
| `AccentContainer` | `@/src/design` | Tinted shells + strip |
| `MetricCard` / `StatusBadge` | `@/src/design` | KPIs & status pills |
| `Widget` | `@/src/design` | Loading / empty / error / success chrome |
| `ResearchDataGrid` / `InstitutionalTable` | `@/src/design` | Institutional research tables |
| `CommandPalette` | `@/src/design` | Global search (Ctrl/Cmd+K) |
| `NotificationCenter` | `@/src/design` | Productivity Hub drawer |
| `EmptyStatePanel` | `@/components/ui/EmptyStatePanel` | Empty regions |
| `IconButton` | `@/components/ui/IconButton` | Icon-only actions |
| `ConfidenceBar` | `@/components/ui/ConfidenceBar` | Confidence visualization |

Prefer design-system primitives over one-off Tailwind clusters.

---

## Icon usage

- Family: **Lucide React** only  
- Section headers: `h-5 w-5` in accent chip  
- Card headers / table: `h-4 w-4` or `h-3.5 w-3.5`  
- Always pair icon-only buttons with `aria-label` (`IconButton`)  
- Decorative icons: `aria-hidden`

---

## Accessibility checklist

- [x] Visible `:focus-visible` ring on interactive controls (`.focus-ring` / `FOCUS_RING_CLASS`)
- [x] Icon-only buttons have `aria-label`
- [x] Tooltips use `role="tooltip"`, Escape to dismiss where applicable
- [x] Tables: `scope="col"`, sticky headers, sort affordances
- [x] Empty / loading / error states never leave blank regions
- [x] Contrast: primary text on dark surfaces verified AA across themes
- [x] Keyboard: Tab order matches visual order; palette / hub fully keyboard operable
- [x] Reduced motion respected globally

---

## Widget states

Every async widget should support via `Widget` or equivalent:

1. **Loading** — `WidgetSkeleton` / `Skeleton` shimmer  
2. **Empty** — `EmptyStatePanel` / `WidgetEmptyState`  
3. **Success** — content  
4. **Error** — bordered alert with retry affordance  

---

## Freeze API

```ts
import {
  isSprint10C1Frozen,
  getDesignSystemStatus,
  getReleaseCandidateStatus,
} from "@/src/design";

isSprint10C1Frozen(); // true
getReleaseCandidateStatus().name; // "EquityOS UI v1.0"
```

---

*Sprint 10C.1 Final — Design System Freeze*
