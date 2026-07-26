# Analytics Architecture

Sprint 11F.1 — Shared Analytics Infrastructure

---

## Purpose

Provide a reusable analytics foundation for:

- Historical Backtesting (11B+)
- Paper Trading analytics
- Portfolio Analytics / Portfolio Doctor
- AI Validation
- Recommendation Intelligence
- Future Strategy Lab

**This sprint is infrastructure only.** Components and engines are not wired into routes or existing feature calculations.

---

## Layering

```
Feature pages (future)
        │
        ▼
components/analytics/*     KPI · cards · tables · charts · filters
        │
        ▼
lib/analytics/*            types · metric-engine · time-range · export
        │
        ├── lib/utils + lib/format   (display formatting)
        └── src/design/charts        (tokens + Heatmap primitive)
```

### Rules

1. Do **not** import `lib/paper-trading` analytics into `lib/analytics` — keep metric utilities generic via `TradeStatisticsInput`.
2. Do **not** create a third `MetricCard` — use `AnalyticsKpi` / `AnalyticsMetricCard`.
3. Charts stay **hand-rolled SVG** (no recharts/d3) and use `CHART_SERIES_COLORS` / `CHART_COLORS`.
4. Export service prepares contracts only; materialization is deferred.

---

## Module map

| Path | Responsibility |
|---|---|
| `lib/analytics/types.ts` | Shared interfaces |
| `lib/analytics/metric-engine.ts` | Win rate, drawdown, profit factor, … |
| `lib/analytics/time-range.ts` | Presets + DateRange helpers |
| `lib/analytics/export/` | Export architecture façade |
| `components/analytics/kpis/` | Primary / % / currency / trend KPIs |
| `components/analytics/cards/` | Statistics / comparison / insight / summary |
| `components/analytics/tables/` | Sort / filter / search / paginate table |
| `components/analytics/charts/` | Line / area / bar / pie / donut / heatmap / timeline / equity |
| `components/analytics/filters/` | Composable filter bar |

---

## Related docs

- [ANALYTICS_COMPONENTS.md](./ANALYTICS_COMPONENTS.md)
- [ANALYTICS_METRICS.md](./ANALYTICS_METRICS.md)
- [ANALYTICS_CHART_STANDARDS.md](./ANALYTICS_CHART_STANDARDS.md)
- [ANALYTICS_EXPORT_STANDARDS.md](./ANALYTICS_EXPORT_STANDARDS.md)
