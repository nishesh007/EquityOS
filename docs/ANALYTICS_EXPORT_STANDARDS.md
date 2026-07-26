# Analytics Export Standards

Sprint 11F.1 — architecture only

---

## Status

| Format | Contract | Materialization |
|---|---|---|
| CSV | Supported for routing | Not implemented |
| JSON | Supported for routing | Not implemented |
| Excel (`.xlsx`) | Supported for routing | Not implemented |
| PDF | Supported for routing | Not implemented |

`SharedAnalyticsExportService.prepare()` validates + names files.  
`materialize()` returns `status: "unsupported"` until a dedicated export sprint.

---

## Request contract

```ts
interface ExportRequest {
  id?: string;
  format: "pdf" | "csv" | "excel" | "json";
  title: string;
  dateRange?: DateRange;
  payload: unknown;       // feature-owned snapshot
  columns?: string[];
  filename?: string;
  createdAt?: string;
}
```

## Preparation result

```ts
interface ExportPreparation {
  requestId: string;
  format: ExportFormat;
  status: "queued" | "preparing" | "ready" | "unsupported" | "failed";
  filename: string;
  mimeType: string;
  body?: string | Uint8Array;
  message?: string;
}
```

---

## Usage (future features)

```ts
import { analyticsExportService } from "@/lib/analytics";

const prepared = await analyticsExportService.prepare({
  format: "csv",
  title: "Backtest Results",
  payload: rows,
  columns: ["symbol", "returnPercent"],
});
// Later: await analyticsExportService.materialize(prepared…)
```

---

## Filename rules

- Default: slugified `title` + extension (`paper-performance.csv`)
- Override via `ExportRequest.filename`
- MIME map lives in `lib/analytics/export/export-service.ts`
