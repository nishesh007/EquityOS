# Report Versioning

Sprint 11B.4

Every `InstitutionalReport.version` includes:

| Field | Meaning |
|---|---|
| `reportId` | Deterministic id from template + generated timestamp |
| `generatedAt` | ISO generation time |
| `backtestSessionIds` | Sessions contributing trades |
| `appliedFilters` | Validation filter snapshot |
| `applicationVersion` | App semver (`0.1.0`) |
| `dataVersion` | Demo/historical data stamp |
| `templateId` | Active template |

Displayed in the Report Center versioning strip.
