# Historical Backtesting — Production Checklist

Sprint 11B.5

Use before tagging a Historical Backtesting release.

## Functional

- [ ] Replay Center loads sessions and advances candles without look-ahead
- [ ] Strategy Validation filters update comparisons (no formula changes)
- [ ] Report Center templates switch sections; exports PDF/CSV/Excel/JSON
- [ ] Module nav: Replay · Validation · Reports consistent on all three routes

## Quality surfaces

- [ ] Loading skeletons appear on route transitions
- [ ] Empty states: no sessions / no validation / no reports / filter empty
- [ ] Recovery panels: corrupt session, export failure (retry works)
- [ ] Export progress + cancel via background task registry

## Accessibility

- [ ] Keyboard: module nav, session rows (Enter/Space), replay toolbar, filters
- [ ] Focus rings visible; `aria-current` / `aria-pressed` / table captions present
- [ ] Screen reader: progress `role="progressbar"`, recovery `role="alert"`
- [ ] High contrast: `contrast-more` borders on nav / controls

## Performance

- [ ] Report charts lazy-loaded (`next/dynamic`)
- [ ] Large trade logs virtualized (≥40 rows)
- [ ] Filter updates wrapped in `startTransition`

## Build / regression

- [ ] `npm run test -- lib/backtesting` passes
- [ ] `npm run build` passes
- [ ] Recommendation Engine / Paper Trading / Dashboard / Portfolio untouched
- [ ] Replay engine logic, validation calculations, report calculations unchanged
