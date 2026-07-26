# Shared Analytics Components

Sprint 11F.1

Import from `@/components/analytics` (or deep paths).

---

## KPIs (`components/analytics/kpis`)

| Component | Use |
|---|---|
| `AnalyticsKpi` | Base shell — icon, delta, trend, loading, empty |
| `PrimaryKpi` | Large emphasis KPI |
| `SecondaryKpi` | Compact KPI |
| `PercentageKpi` | Formats numeric percent |
| `CurrencyKpi` | Formats INR via `formatCurrency` |
| `ComparisonKpi` | Value + comparison secondary line |
| `TrendKpi` | KPI with optional sparkline slot |

---

## Cards (`components/analytics/cards`)

| Component | Use |
|---|---|
| `StatisticsCard` | Grid of metrics inside `Card` |
| `AnalyticsMetricCard` | Single metric tile (not `components/ui/MetricCard`) |
| `ComparisonCard` | Side-by-side values + delta |
| `InsightCard` | Narrative insight with tone |
| `SummaryCard` | Title + metrics + insights |

---

## Tables (`components/analytics/tables`)

`AnalyticsTable<T>` supports:

- Sorting (columns with `sortable` + `accessor`)
- Column text filters (`filterable`)
- Global search (uses `accessor` values)
- Pagination (`pageSize`, default 25)
- Sticky header (default on)
- Loading skeleton + empty state
- Optional `onRowClick`

For simple presentational tables without interaction, prefer existing `components/ui/DataTable`.

---

## Charts (`components/analytics/charts`)

| Component | Kind |
|---|---|
| `LineChart` | Multi-series line |
| `AreaChart` | Primary series area |
| `BarChart` | Signed bars |
| `PieChart` | Filled slices |
| `DonutChart` | Stroke ring + center label |
| `HeatmapChart` | Wraps design-system Heatmap |
| `TimelineChart` | Event rail |
| `EquityCurveChart` | Area + overlays (benchmark dashed) |
| `ChartFrame` | Shared chrome (title, legend, loading, empty) |

---

## Filters (`components/analytics/filters`)

Composable pieces:

- `DateRangeFilter` (time-range presets)
- `StrategyFilter` / `CompanyFilter` / `SectorFilter`
- `RecommendationFilter` / `StatusFilter` / `MarketRegimeFilter`
- `AnalyticsFilterBar` — mount only the option arrays you pass

State helpers: `createEmptyAnalyticsFilters`, `countActiveAnalyticsFilters`.
