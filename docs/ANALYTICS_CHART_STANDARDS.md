# Analytics Chart Standards

Sprint 11F.1

---

## Principles

1. **No third-party chart libraries** in this infrastructure (keeps bundle lean; matches EquityOS SVG charts).
2. Use theme tokens from `src/design/charts/chartTokens`:
   - `CHART_SERIES_COLORS`
   - `CHART_COLORS` (positive / negative / grid / accent)
3. Always wrap with `ChartFrame` for title, legend, loading, and empty states.
4. Prefer multi-series overlays via `ChartSeries.secondary` (dashed / lighter stroke).

---

## Data contracts

```ts
ChartPoint  { x: string | number; y: number; label?; meta? }
ChartSeries { id; label; points; color?; secondary? }
ChartSlice  { id; label; value; color? }   // pie / donut
HeatmapCell { id; label; value; display? }
TimelineChartEvent { id; label; at; tone? }
```

`x` may be a numeric index, epoch ms, or ISO string (parsed when possible).

---

## Kind guidance

| Kind | When to use |
|---|---|
| Line | Multi-metric trends |
| Area | Single emphasis series |
| Bar | Discrete categories / signed returns |
| Pie / Donut | Composition shares |
| Heatmap | Matrix intensity (sectors, regimes) |
| Timeline | Discrete events |
| Equity Curve | Cumulative performance (+ optional benchmark) |

---

## Accessibility

- SVG charts expose `role="img"` and `aria-label`.
- Empty / loading states must never render a blank box (`ChartFrame` enforces this).

---

## Future

If a chart library is introduced later, keep these wrappers as the public API and swap internals — do not leak library types into feature code.
