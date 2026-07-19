"use client";

import { StockLink } from "@/components/ui/StockLink";
import type {
  HeatmapColorMetric,
  HeatmapStockCell,
} from "@/lib/market-heatmap";
import { useMemo, useState } from "react";
import {
  colorForValue,
  formatMetricDisplay,
  metricValueForStock,
} from "./color";

interface StockTreemapProps {
  stocks: HeatmapStockCell[];
  colorMetric: HeatmapColorMetric;
  /** Max tiles rendered (virtualization budget). */
  limit?: number;
}

function tileWeight(stock: HeatmapStockCell): number {
  if (stock.marketCapCr != null && stock.marketCapCr > 0) {
    return Math.sqrt(stock.marketCapCr);
  }
  if (stock.volume != null && stock.volume > 0) {
    return Math.sqrt(stock.volume);
  }
  return 1;
}

export function StockTreemap({
  stocks,
  colorMetric,
  limit = 48,
}: StockTreemapProps) {
  const [visible, setVisible] = useState(limit);

  const levelMedian = useMemo(() => {
    const values = stocks
      .map((s) => metricValueForStock(s, colorMetric))
      .filter((v): v is number => v != null && v > 0)
      .sort((a, b) => a - b);
    if (values.length === 0) return null;
    return values[Math.floor(values.length / 2)] ?? null;
  }, [stocks, colorMetric]);

  const ranked = useMemo(() => {
    return stocks
      .slice()
      .sort((a, b) => tileWeight(b) - tileWeight(a))
      .slice(0, visible);
  }, [stocks, visible]);

  const totalWeight = ranked.reduce((sum, s) => sum + tileWeight(s), 0) || 1;

  if (stocks.length === 0) {
    return (
      <p className="text-[11px] text-text-muted">
        No quoted stocks in this sector for the selected universe.
      </p>
    );
  }

  return (
    <div>
      <div
        className="flex flex-wrap gap-1"
        role="list"
        aria-label="Stock heatmap tiles"
      >
        {ranked.map((stock) => {
          const weight = tileWeight(stock);
          const flexGrow = Math.max(1, Math.round((weight / totalWeight) * 40));
          const value = metricValueForStock(stock, colorMetric);
          const bg = colorForValue(value, colorMetric, levelMedian);
          const tooltip = [
            stock.symbol,
            `₹${stock.price.toLocaleString("en-IN")}`,
            `${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(2)}%`,
            stock.volume != null
              ? `Vol ${stock.volume.toLocaleString("en-IN")}`
              : null,
            stock.rsi != null ? `RSI ${stock.rsi.toFixed(1)}` : null,
            `Rank #${stock.sectorRank}`,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <StockLink
              key={stock.symbol}
              symbol={stock.symbol}
              title={tooltip}
              className="min-w-[4.5rem] max-w-[12rem] rounded-md border border-black/10 px-2 py-1.5 transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              style={{
                flexGrow,
                flexBasis: `${Math.max(12, flexGrow * 2)}%`,
                backgroundColor: bg,
              }}
            >
              <p className="truncate text-[10px] font-semibold text-text-primary">
                {stock.symbol}
              </p>
              <p className="font-mono text-[11px] font-semibold tabular-nums text-text-primary">
                {formatMetricDisplay(
                  colorMetric === "dailyChange" ||
                    colorMetric === "weeklyChange" ||
                    colorMetric === "monthlyChange" ||
                    colorMetric === "relativeStrength" ||
                    colorMetric === "breadth"
                    ? value
                    : stock.changePercent,
                  colorMetric === "volume" ||
                    colorMetric === "delivery" ||
                    colorMetric === "marketCap"
                    ? "dailyChange"
                    : colorMetric
                )}
              </p>
            </StockLink>
          );
        })}
      </div>
      {stocks.length > visible ? (
        <button
          type="button"
          className="mt-3 text-[11px] font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => setVisible((v) => Math.min(stocks.length, v + limit))}
        >
          Show more stocks ({stocks.length - visible} remaining)
        </button>
      ) : null}
    </div>
  );
}
