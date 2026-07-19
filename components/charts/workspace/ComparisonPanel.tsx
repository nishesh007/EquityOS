"use client";

import type { OhlcBar } from "@/lib/providers/types";
import { relativeReturns } from "./indicatorMath";

interface ComparisonPanelProps {
  symbol: string;
  closes: number[];
  compareSymbol?: string;
  compareCloses?: number[];
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onCompareSymbolChange: (symbol: string) => void;
}

export function ComparisonPanel({
  symbol,
  closes,
  compareSymbol,
  compareCloses,
  enabled,
  onEnabledChange,
  onCompareSymbolChange,
}: ComparisonPanelProps) {
  const primary = closes.length ? relativeReturns(closes) : [];
  const primaryRet = primary.length ? primary[primary.length - 1] : null;
  const compare =
    compareCloses && compareCloses.length
      ? relativeReturns(compareCloses)
      : [];
  const compareRet = compare.length ? compare[compare.length - 1] : null;

  return (
    <div className="rounded-xl border border-surface-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-text-primary">
          Stock Comparison
        </p>
        <label className="inline-flex items-center gap-1.5 text-[10px] text-text-muted">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
          />
          Relative mode
        </label>
      </div>
      <p className="mt-1 text-[10px] text-text-faint">
        Percentage return from first bar in the visible series. Benchmark
        overlay needs compare history on the page.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-surface-border-subtle px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            {symbol}
          </p>
          <p
            className={`font-mono text-sm font-semibold tabular-nums ${
              primaryRet != null && primaryRet >= 0 ? "text-gain" : "text-loss"
            }`}
          >
            {primaryRet != null
              ? `${primaryRet >= 0 ? "+" : ""}${primaryRet.toFixed(2)}%`
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wider text-text-faint">
            Benchmark
          </p>
          <p
            className={`font-mono text-sm font-semibold tabular-nums ${
              compareRet != null && compareRet >= 0 ? "text-gain" : "text-loss"
            }`}
          >
            {compareRet != null
              ? `${compareRet >= 0 ? "+" : ""}${compareRet.toFixed(2)}%`
              : "—"}
          </p>
        </div>
      </div>
      <input
        value={compareSymbol ?? ""}
        onChange={(event) =>
          onCompareSymbolChange(event.target.value.toUpperCase())
        }
        placeholder="Compare symbol (e.g. TCS)"
        aria-label="Compare symbol"
        className="mt-2 w-full rounded-md border border-surface-border bg-surface px-2 py-1.5 text-[11px] text-text-primary placeholder:text-text-faint focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </div>
  );
}

/** Helper for callers passing OHLC maps. */
export function closesFromBars(bars: OhlcBar[] | undefined): number[] {
  return bars?.map((b) => b.close) ?? [];
}
