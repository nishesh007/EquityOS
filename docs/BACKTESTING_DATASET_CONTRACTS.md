# Backtesting Dataset Contracts

Sprint 11B.1 — architecture only (no live providers)

---

## Supported data domains

| Domain | Type |
|---|---|
| OHLCV | `OhlcvBar` |
| Corporate actions | `CorporateActionRecord` (`split` / `bonus` / `dividend` / `rights` / `other`) |
| Splits / bonuses / dividends | Via `CorporateActionKind` |
| Events | `HistoricalEventRecord` |
| Recommendation snapshots | `BacktestRecommendationSnapshot` |
| Market regime | `MarketRegimeRecord` |
| Data quality | `DatasetQuality` on `DatasetSlice` |

Bundled as `HistoricalDatasetBundle` for a `HistoricalDatasetRequest` window.

---

## Provider interface

```ts
interface HistoricalDatasetProvider {
  id: string;
  label: string;
  isAvailable(): boolean | Promise<boolean>;
  fetchDataset(request: HistoricalDatasetRequest): Promise<HistoricalDatasetBundle>;
}
```

`historicalDatasetRegistry` (`InMemoryDatasetRegistry`) accepts registrations. **No providers are implemented in 11B.1.**

---

## Quality

```ts
DatasetQuality {
  completeness: number; // 0–100
  gaps: number;
  warnings: string[];
  source?: string;
}
```

Execution pipeline surfaces quality warnings into `ExecutionResult.warnings`.

---

## Replay stubs

`ReplayConfiguration` + `ReplayFrame` exist for Sprint 11B.2. The execution pipeline already emits lightweight frames (sequence, asOf, openTradeIds) without a UI.
