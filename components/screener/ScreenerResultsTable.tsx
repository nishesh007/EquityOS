"use client";

import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { QuoteDisplayCompact } from "@/components/market/QuoteDisplay";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { createUnavailableQuote } from "@/lib/market-data/enriched-quote";
import { getCompanyRoute } from "@/lib/routes";
import type { ScreenerRow } from "@/lib/screener/types";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

interface ScreenerResultsTableProps {
  rows: ScreenerRow[];
  totalMatched: number;
  totalUniverse: number;
  executionMs: number;
}

function formatMetric(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") {
    if (Math.abs(value) >= 1000) return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  return value;
}

export function ScreenerResultsTable({
  rows,
  totalMatched,
  totalUniverse,
  executionMs,
}: ScreenerResultsTableProps) {
  const router = useRouter();
  const symbols = useMemo(() => rows.map((row) => row.symbol), [rows]);
  const initialQuotes = useMemo(() => {
    const map: Record<string, NonNullable<ScreenerRow["quote"]>> = {};
    for (const row of rows) {
      if (row.quote) map[row.symbol] = row.quote;
    }
    return map;
  }, [rows]);

  const { quotes } = useMarketQuotes(symbols, { initialQuotes });

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-text-muted">No stocks match your current filters.</p>
        <p className="mt-1 text-xs text-text-faint">
          Try adjusting filter criteria or load a preset screen.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-text-muted">
          {totalMatched.toLocaleString("en-IN")} of {totalUniverse.toLocaleString("en-IN")} stocks
          <span className="ml-2 text-text-faint">· {executionMs}ms</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border-subtle text-left">
              <th className="pb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Symbol
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                CMP
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Updated
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Change
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Mkt Cap
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                P/E
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                ROE
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Quality
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Recommendation
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Opportunity
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const quote =
                quotes.get(row.symbol) ?? row.quote ?? createUnavailableQuote(row.symbol);
              const changePercent =
                quote.changePercent ?? (row.metrics.change_percent as number | null);

              return (
                <tr
                  key={row.symbol}
                  onClick={() => router.push(getCompanyRoute(row.symbol))}
                  className="group cursor-pointer border-b border-surface-border-subtle/50 transition-colors hover:bg-surface-hover/30"
                >
                  <td className="py-2.5">
                    <div>
                      <p className="text-sm font-medium text-text-primary group-hover:text-accent">
                        {row.symbol}
                      </p>
                      <p className="max-w-[180px] truncate text-[10px] text-text-muted">
                        {row.sector}
                      </p>
                    </div>
                  </td>
                  <td className="py-2.5 text-right">
                    <QuoteDisplayCompact quote={quote} className="flex flex-col items-end" />
                  </td>
                  <td className="py-2.5 text-right">
                    <p className="text-[9px] text-text-faint">
                      {quote.availability === "unavailable"
                        ? quote.lastSuccessfulUpdateIST ?? "—"
                        : quote.lastUpdatedIST?.split(" ").slice(-3).join(" ") ?? "—"}
                    </p>
                  </td>
                  <td className="py-2.5 text-right">
                    <ChangeIndicator
                      value={changePercent ?? 0}
                      size="sm"
                      showIcon={false}
                    />
                  </td>
                  <td className="py-2.5 text-right">
                    <p className="text-xs font-mono text-text-muted tabular-nums">
                      {formatMetric(row.metrics.market_cap as number)} Cr
                    </p>
                  </td>
                  <td className="py-2.5 text-right">
                    <p className="text-xs font-mono text-text-secondary tabular-nums">
                      {formatMetric(row.metrics.pe as number)}
                    </p>
                  </td>
                  <td className="py-2.5 text-right">
                    <p className="text-xs font-mono text-text-secondary tabular-nums">
                      {formatMetric(row.metrics.roe as number)}%
                    </p>
                  </td>
                  <td className="py-2.5 text-right">
                    <p className="text-xs font-mono text-text-secondary tabular-nums">
                      {formatMetric(row.metrics.quality_score as number)}
                    </p>
                  </td>
                  <td className="py-2.5 text-right">
                    <p className="text-xs font-semibold text-accent">
                      {row.recommendation?.action ?? "—"}
                    </p>
                    <p className="text-[9px] text-text-muted">
                      {row.recommendation?.primaryStrategy ?? "No match"}
                    </p>
                  </td>
                  <td className="py-2.5 text-right">
                    <p className="text-xs font-mono text-text-secondary tabular-nums">
                      {row.recommendation?.opportunityScore ?? "—"}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
