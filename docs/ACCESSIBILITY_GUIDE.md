# Historical Backtesting — Accessibility Guide

Sprint 11B.5

## Module navigation

- Landmark: `nav[aria-label="Historical Backtesting sections"]`
- Active route: `aria-current="page"`
- Keyboard: Tab between Replay / Validation / Reports links

## Replay Center

- Session table: `scope="col"`, `aria-selected`, row `tabIndex={0}`, Enter/Space selects
- Controls: `role="toolbar"` with labelled groups; icon buttons have `aria-label`
- Speed chips: `aria-pressed`

## Validation & Reports filters

- Filter bar: `role="search"`
- Chip groups: `role="group"` + `aria-labelledby`
- Chips: `aria-pressed`
- Reset: explicit `aria-label`

## Loading & progress

- Skeletons: `role="status"` + `aria-busy` + sr-only text
- Progress: `role="progressbar"` with `aria-valuenow/min/max`
- Live updates: `aria-live="polite"` on progress panel

## Errors & empty states

- Recovery: `role="alert"` + Retry
- Empty states include title, guidance, and contextual action

## High contrast

- Module nav and key toolbars use `contrast-more:border-2` / stronger borders
- Prefer focus-visible rings (`ring-accent/50`) over color-only cues

## Tables

- Captions (`sr-only` where visual title exists)
- Sortable headers remain buttons for screen readers (Analytics Table)
