# EquityOS Design System — Sprint 10C.1

Internal reference for color, typography, spacing, components, motion, and accessibility.
Presentation layer only — does not document Strategy Engine or data services.

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

## Component usage

| Component | Import | Use for |
|---|---|---|
| `Card` / `CardHeader` / `CardFooter` | `@/components/ui/Card` | Dashboard panels |
| `SectionHeader` | `@/src/design` | Major section titles + accents |
| `AccentContainer` | `@/src/design` | Tinted shells + strip |
| `MetricCard` / `StatusBadge` | `@/src/design` | KPIs & status pills |
| `Widget` | `@/src/design` | Loading / empty / error / success chrome |
| `DataTable` | `@/components/ui/DataTable` | Shared tables |
| `EmptyStatePanel` | `@/components/ui/EmptyStatePanel` | Empty regions |
| `IconButton` | `@/components/ui/IconButton` | Icon-only actions |
| `ConfidenceBar` | `@/components/ui/ConfidenceBar` | Confidence visualization |
| `PersonalizedDashboard` | `@/components/dashboard/workspace` | Layout personalization |

Prefer design-system primitives over one-off Tailwind clusters.

---

## Icon usage

- Family: **Lucide React** only
- Section headers: `h-5 w-5` in accent chip
- Card headers / table: `h-4 w-4` or `h-3.5 w-3.5`
- Always pair icon-only buttons with `aria-label` (`IconButton`)
- Decorative icons: `aria-hidden`

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

## Accessibility checklist

- [ ] Visible `:focus-visible` ring on all interactive controls (`.focus-ring` / `FOCUS_RING_CLASS`)
- [ ] Icon-only buttons have `aria-label`
- [ ] Tooltips use `role="tooltip"`, Escape to dismiss, `aria-expanded`
- [ ] Tables: `scope="col"`, optional `<caption>`, sticky headers
- [ ] Empty / loading / error states never leave blank regions
- [ ] Contrast: primary text on dark surfaces; gain/loss used only for direction
- [ ] Keyboard: Tab order matches visual order; collapse/pin/drag handles are focusable
- [ ] Reduced motion respected globally

---

## Widget states

Every async widget should support via `Widget` or equivalent:

1. **Loading** — `WidgetSkeleton` / `Skeleton` shimmer  
2. **Empty** — `EmptyStatePanel` / `WidgetEmptyState`  
3. **Success** — content  
4. **Error** — bordered alert with retry affordance  

---

## Related docs

- `docs/DESIGN_BIBLE.md` — permanent UI philosophy  
- `docs/ENGINEERING.md` — engineering conventions  

*Sprint 10C.1 Prompt 4 — Production Freeze*
