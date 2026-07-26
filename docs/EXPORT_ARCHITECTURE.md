# Export Architecture (Reports)

Sprint 11B.4

Reports call `analyticsExportService.prepare()` (Sprint 11F.1 contracts), then materialize:

| Format | Body |
|---|---|
| JSON | Full `InstitutionalReport` |
| CSV | Trade log |
| Excel | Strategy table + trade log (CSV-compatible workbook payload) |
| PDF | Institutional text layout (print-to-PDF compatible) |

Adapter: `exportInstitutionalReport()` in `lib/backtesting/reports/export.ts`.  
UI downloads via `Export Center` buttons on `/backtesting/reports`.
