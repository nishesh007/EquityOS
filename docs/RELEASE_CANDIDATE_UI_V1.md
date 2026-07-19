# EquityOS UI v1.0 — Release Candidate

**Sprint:** 10C.1  
**Status:** COMPLETE · FROZEN · PRODUCTION READY  
**Release candidate:** EquityOS UI v1.0  
**Scope:** Presentation layer only (no Strategy / Recommendation / Trading engines)

---

## Freeze declaration

Sprint **10C.1** is frozen. No new UI features land on this track before Sprint 10D.

| Flag | Value |
|---|---|
| `SPRINT_10C_FROZEN` | `true` |
| `SPRINT_10C1_FROZEN` | `true` |
| `UI_PLATFORM_STATUS.release` | `10C.1` |
| `UI_RELEASE_CANDIDATE.name` | `EquityOS UI v1.0` |
| `UI_RELEASE_CANDIDATE.status` | `PRODUCTION_READY` |

Source of truth: `src/design/status/platformStatus.ts`

---

## What shipped in 10C.1

1. Market Breadth / Market Internals  
2. Sector & Market Heatmap  
3. Customizable dashboard workspace  
4. Multi-chart research workspace  
5. Institutional Research Data Grid  
6. Global Search & Command Palette (Ctrl/Cmd+K)  
7. Notification Center · AI Command Center · Productivity Hub  
8. Design system tokens, themes, motion, accessibility baseline  

---

## Design system (canonical)

| Domain | Location |
|---|---|
| Aggregate API | `src/design/DesignSystem.ts` → `getDesignSystem()` |
| Colors / themes | `src/design/theme/*`, `src/design/themes/*` |
| Spacing | `spacingTokens.ts` — 4→64px scale |
| Radius | `radiusTokens.ts` — small→pill |
| Typography | `typographyTokens.ts`, `typeScale.ts` |
| Elevation | `shadowTokens.ts`, `elevationTokens.ts` |
| Motion | `animationTokens.ts`, `motionPresets.ts` |
| Focus | `:focus-visible` in `styles/globals.css` + `FOCUS_RING_CLASS` |
| Breakpoints | mobile → ultrawide |

Internal guide: [`DESIGN_SYSTEM_10C1.md`](./DESIGN_SYSTEM_10C1.md)  
Philosophy: [`DESIGN_BIBLE.md`](./DESIGN_BIBLE.md)

---

## Component library (primary)

| Surface | Primary primitives |
|---|---|
| Layout | `PageContainer`, `DashboardGrid`, `SectionHeader`, `AccentContainer` |
| Cards / KPI | `Card`, `InstitutionalCard`, `MetricCard`, `Widget` |
| Tables | `ResearchDataGrid`, `InstitutionalTable`, `TableToolbar` |
| Charts | `Sparkline`, `GaugeChart`, `Heatmap`, chart workspace |
| Command | `CommandPalette`, `TerminalExperience`, `GlobalSearch` |
| Productivity | `NotificationCenter`, `AICommandCenter`, `ProductivityPanel` |
| Help | `HelpCenter`, `OnboardingTour`, `RichTooltip` |
| States | `Skeleton`, `WidgetSkeleton`, `WidgetEmptyState`, `EmptyStatePanel` |

Import from `@/src/design` or `@/components/ui/*` as documented in the design system guide.

---

## Accessibility checklist (RC)

- [x] Global `:focus-visible` accent ring  
- [x] Command palette keyboard nav (↑↓ Tab Enter Esc)  
- [x] Notification drawer Escape + dialog semantics  
- [x] Icon-only controls use `aria-label` (`IconButton`)  
- [x] Tables expose `scope`, `aria-sort`, listbox/combobox roles where applicable  
- [x] Reduced motion honored (`prefers-reduced-motion` / `data-motion`)  
- [x] Primary text contrast AA across built-in themes (automated)  

---

## Performance notes (RC)

- CSS-variable theme switching (no full tree restyle)  
- Table pagination + research grid windowing  
- Notification history lazy scroll window  
- Command palette result windowing  
- Charts / heatmap / research chart workspace lazy-loaded at page level  
- Shared sparkline/gauge geometry helpers  

---

## QA sign-off

| Check | Result |
|---|---|
| Design tokens centralized | PASS |
| Platform freeze flags | PASS |
| Responsive breakpoints | PASS |
| Accessibility contrast suite | PASS |
| Design unit tests | PASS |
| Production build | Required on freeze commit |

---

## Next

**Sprint 10D** may begin only after this RC is accepted.  
Do not reopen 10C.1 for feature work — open a 10D ticket instead.

*EquityOS Design Systems · Sprint 10C.1 Final*
