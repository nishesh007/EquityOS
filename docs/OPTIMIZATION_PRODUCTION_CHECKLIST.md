# Strategy Optimization Lab — Production Checklist

Sprint 11C.5

Use before tagging a Strategy Optimization Lab release.

## Functional

- [ ] Configuration: strategy, parameters, constraints, profiles, runtime estimate
- [ ] Engine: Grid / Smart / Quick / Deep; pause / resume / cancel
- [ ] Results: leaderboard, ranking modes, comparison, result drawer, exports
- [ ] Walk-Forward: rolling / anchored / expanding; pass/fail; robustness; drawer
- [ ] Monte Carlo: scenarios, distributions, confidence, comparison, drawer
- [ ] Tabs restore after refresh; sessions restore from local history

## Quality surfaces

- [ ] Route loading skeleton (`app/research/optimization/loading.tsx`)
- [ ] Workspace hydrate skeleton before localStorage restore
- [ ] Empty state on Results when no session
- [ ] Recovery banner for failed / invalid run messages
- [ ] Export success / failure messages on toolbars

## Accessibility

- [ ] Tab nav keyboard reachable; `aria-current` on active tab
- [ ] Drawers: Escape closes, focus restore, `role="dialog"`
- [ ] Tables: captions / sortable headers / search labels
- [ ] Progress bars: `role="progressbar"` with valuemin/max/now
- [ ] `contrast-more` friendly control borders

## Performance

- [ ] Memoized lab panels; `startTransition` on parameter edits
- [ ] AnalyticsTable pagination; virtualized session/queue lists
- [ ] Monte Carlo table capped at 300 rendered rows
- [ ] Session persistence trims large result payloads

## Build / regression

- [ ] `npx vitest run lib/optimization` passes
- [ ] ESLint clean on `components/optimization` + `lib/optimization`
- [ ] No TODOs / placeholder implementations in 11C modules
- [ ] No production console noise from info-level simulation logs

## Cross-module

- [ ] Optimization → Walk-Forward candidates
- [ ] Optimization / WFV → Monte Carlo baseline returns
- [ ] Shared analytics charts + export contracts
- [ ] Sidebar link: Research → Strategy Optimization
