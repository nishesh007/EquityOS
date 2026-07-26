# Shared Component Catalog

Sprint 11F — `components/ui` is the primary feature-facing primitive set.

---

## Layout & chrome

| Component | Path | Notes |
|---|---|---|
| `Card` / `CardHeader` / `CardFooter` | `components/ui/Card.tsx` | Standard raised card; optional accent strip |
| `PageHeader` | `components/layout/PageHeader.tsx` | Page title row |
| `AppShell` / `Sidebar` / `TopNav` | `components/layout/*` | Application chrome |
| `PageLoading` | `components/layout/PageLoading.tsx` | Full-page loading shell |
| `FeaturePlaceholder` | `components/layout/FeaturePlaceholder.tsx` | Coming-soon / stub pages |

---

## Data display

| Component | Path | Notes |
|---|---|---|
| `Badge` | `components/ui/Badge.tsx` | Status / category chips |
| `SignalBadge` | `components/ui/SignalBadge.tsx` | Signal strength |
| `ChangeIndicator` | `components/ui/ChangeIndicator.tsx` | Gain/loss delta |
| `ConfidenceBar` | `components/ui/ConfidenceBar.tsx` | Confidence meter |
| `MetricCard` | `components/ui/MetricCard.tsx` | KPI tile (app UI) |
| `ScoreGauge` | `components/ui/ScoreGauge.tsx` | Circular score |
| `Sparkline` | `components/ui/Sparkline.tsx` | Mini SVG series |
| `DataTable` | `components/ui/DataTable.tsx` | Simple table helper |
| `StockLink` | `components/ui/StockLink.tsx` | Symbol → company route |
| `TabBar` | `components/ui/TabBar.tsx` | Horizontal tabs |
| `IconButton` | `components/ui/IconButton.tsx` | Icon-only control |
| `DataTransparency` | `components/ui/DataTransparency.tsx` | Source / freshness strip |

---

## Feedback

| Component | Path | Notes |
|---|---|---|
| `EmptyStatePanel` | `components/ui/EmptyStatePanel.tsx` | Canonical empty state |
| `Skeleton` (+ variants) | `components/ui/Skeleton.tsx` | Loading placeholders |
| `ErrorBoundary` | `components/ui/ErrorBoundary.tsx` | Section isolation |
| `RouteErrorFallback` | `components/ui/RouteErrorFallback.tsx` | Shared `error.tsx` UI |

---

## Design platform (secondary)

Prefer these only inside institutional / design-system surfaces:

| Component | Path |
|---|---|
| `GlassCard`, `DataCard`, `InstitutionalCard` | `src/design/components/*` |
| `MetricCard` (design) | `src/design/components/MetricCard.tsx` |
| `Skeleton` (design) | `src/design/components/Skeleton.tsx` |
| `StatusBadge`, `MetricBadge` | `src/design/components/*` |
| `ResearchDataGrid` | `src/design` tables |
| `WidgetSkeleton` / `WidgetEmptyState` | `src/design/widgets/*` |

**Do not** create a third MetricCard/Skeleton/Sparkline. Extend the set that already owns the surface.

---

## Feature islands (not primitives)

Heavy feature modules live under `components/<feature>/` with their own barrels where useful (`events`, `recommendations`, `paper-trading`, dashboard subfolders).

Shared analytics infrastructure (Sprint 11F.1) lives under `components/analytics/` — KPIs, cards, tables, charts, filters. Import when building Backtesting / Paper / Portfolio analytics surfaces; not wired into routes yet.
