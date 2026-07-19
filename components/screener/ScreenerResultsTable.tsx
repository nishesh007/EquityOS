"use client";

import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { createUnavailableQuote } from "@/lib/market-data/enriched-quote";
import { getCompanyRoute } from "@/lib/routes";
import type { ScreenerRow } from "@/lib/screener/types";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { createInstitutionalTable, ResearchDataGrid } from "@/src/design";

interface ScreenerResultsTableProps {
  rows: ScreenerRow[];
  totalMatched: number;
  totalUniverse: number;
  executionMs: number;
}

interface ScreenerGridRow {
  id: string;
  symbol: string;
  sector: string;
  cmp: number | null;
  updated: string;
  changePercent: number | null;
  marketCap: number | null;
  pe: number | null;
  roe: number | null;
  quality: number | null;
  recommendation: string;
  strategy: string;
  opportunity: number | null;
}

const SCREENER_TABLE = createInstitutionalTable<ScreenerGridRow>({
  id: "screener-results",
  pageSize: 50,
  density: "compact",
  defaultSort: { columnId: "opportunity", direction: "desc" },
  columns: [
    { id: "symbol", label: "Symbol", kind: "text", sticky: true, width: 100 },
    { id: "sector", label: "Sector", kind: "text" },
    { id: "cmp", label: "CMP", kind: "price" },
    { id: "updated", label: "Updated", kind: "text", hidden: true },
    { id: "changePercent", label: "Change", kind: "trend" },
    { id: "marketCap", label: "Mkt Cap", kind: "number" },
    { id: "pe", label: "P/E", kind: "number" },
    { id: "roe", label: "ROE", kind: "percent" },
    { id: "quality", label: "Quality", kind: "number" },
    { id: "recommendation", label: "Signal", kind: "badge" },
    { id: "strategy", label: "Strategy", kind: "text" },
    { id: "opportunity", label: "Opportunity", kind: "number" },
  ],
});

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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

  const gridRows = useMemo<ScreenerGridRow[]>(
    () =>
      rows.map((row) => {
        const quote =
          quotes.get(row.symbol) ??
          row.quote ??
          createUnavailableQuote(row.symbol);
        return {
          id: row.symbol,
          symbol: row.symbol,
          sector: row.sector,
          cmp: quote.price,
          updated:
            quote.availability === "unavailable"
              ? quote.lastSuccessfulUpdateIST ?? "—"
              : quote.lastUpdatedIST?.split(" ").slice(-3).join(" ") ?? "—",
          changePercent:
            quote.changePercent ?? asNumber(row.metrics.change_percent),
          marketCap: asNumber(row.metrics.market_cap),
          pe: asNumber(row.metrics.pe),
          roe: asNumber(row.metrics.roe),
          quality: asNumber(row.metrics.quality_score),
          recommendation: row.recommendation?.action ?? "—",
          strategy: row.recommendation?.primaryStrategy ?? "No match",
          opportunity: row.recommendation?.opportunityScore ?? null,
        };
      }),
    [rows, quotes]
  );

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-text-muted">
          No stocks match your current filters.
        </p>
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
          {totalMatched.toLocaleString("en-IN")} of{" "}
          {totalUniverse.toLocaleString("en-IN")} stocks
          <span className="ml-2 text-text-faint">· {executionMs}ms</span>
        </p>
      </div>

      <ResearchDataGrid
        table={SCREENER_TABLE}
        rows={gridRows}
        getRowId={(row) => row.id}
        maxHeight={560}
        onRowClick={(row) => router.push(getCompanyRoute(row.symbol))}
        renderExpandedRow={(row) => (
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                Strategy Details
              </p>
              <p className="mt-1 text-xs">
                {row.recommendation} · {row.strategy}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                Fundamentals
              </p>
              <p className="mt-1 text-xs">
                PE {row.pe ?? "—"} · ROE {row.roe ?? "—"} · Quality{" "}
                {row.quality ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                Notes
              </p>
              <p className="mt-1 text-xs">
                {row.sector} · Mkt Cap {row.marketCap ?? "—"} Cr · Updated{" "}
                {row.updated}
              </p>
            </div>
          </div>
        )}
      />
    </div>
  );
}
