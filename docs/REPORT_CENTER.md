# Institutional Report Center

Sprint 11B.4

Route: `/backtesting/reports`

## Purpose

Professional reports from completed backtest sessions and validation results, reusing:

- 11B.1 framework
- 11B.2 demo sessions (inputs only)
- 11B.3 validation report assembly (**unchanged calculations**)
- 11F.1 analytics charts/tables/KPIs + export contracts

## Sections

Executive Summary · Strategy Performance · Recommendation Quality · Benchmark Analysis · Risk Analysis · Trade Log · AI Insights · Export Center

Template selection controls which sections render.

## Module map

```
lib/backtesting/reports/     assemble · templates · visuals · export · executive summary
components/backtesting/reports/InstitutionalReportCenter.tsx
services/backtesting.ts      fetchReportCenterDashboard / exportReportForClient
```
