"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { createUnavailableQuote } from "@/lib/market-data/enriched-quote";
import { getCompanyRoute } from "@/lib/routes";
import { buildInitialQuotesMap } from "@/services/marketData";
import type { PortfolioHolding } from "@/types";
import { createInstitutionalTable, InstitutionalTable } from "@/src/design";
import { Briefcase } from "lucide-react";

interface PortfolioHoldingsTableProps {
  holdings: PortfolioHolding[];
}

interface HoldingRow {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  ltp: number | null;
  dayChangePercent: number | null;
  value: number;
  pnl: number;
  pnlPercent: number;
}

const HOLDINGS_TABLE = createInstitutionalTable<HoldingRow>({
  id: "portfolio-holdings",
  pageSize: 25,
  columns: [
    { id: "symbol", label: "Symbol", kind: "text", sticky: true, width: 120 },
    { id: "name", label: "Company", kind: "text", hidden: true },
    { id: "quantity", label: "Qty", kind: "number" },
    { id: "avgPrice", label: "Avg Price", kind: "price" },
    { id: "ltp", label: "LTP", kind: "price" },
    { id: "dayChangePercent", label: "Day Change", kind: "trend" },
    { id: "value", label: "Value", kind: "currency" },
    { id: "pnl", label: "P&L", kind: "currency" },
    { id: "pnlPercent", label: "P&L %", kind: "trend" },
  ],
});

export function PortfolioHoldingsTable({
  holdings,
}: PortfolioHoldingsTableProps) {
  const router = useRouter();
  const symbols = holdings.map((h) => h.symbol);
  const { quotes } = useMarketQuotes(symbols, {
    initialQuotes: buildInitialQuotesMap(holdings),
  });

  // Presentation rows only — same live-quote derivations as before.
  const rows = useMemo<HoldingRow[]>(
    () =>
      holdings.map((holding) => {
        const quote =
          quotes.get(holding.symbol) ??
          holding.quote ??
          createUnavailableQuote(holding.symbol);
        const currentPrice = quote.price ?? holding.currentPrice;
        const changePercent = quote.changePercent ?? holding.changePercent;
        const currentValue = currentPrice * holding.quantity;
        const investedValue = holding.avgPrice * holding.quantity;
        const pnl = currentValue - investedValue;
        const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;
        return {
          id: holding.id,
          symbol: holding.symbol,
          name: holding.name,
          quantity: holding.quantity,
          avgPrice: holding.avgPrice,
          ltp: quote.price,
          dayChangePercent: changePercent,
          value: currentValue,
          pnl,
          pnlPercent,
        };
      }),
    [holdings, quotes]
  );

  return (
    <Card padding="lg" className="h-full">
      <CardHeader
        title="All Holdings"
        subtitle={`${holdings.length} positions in your portfolio`}
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Briefcase className="h-4 w-4 text-accent" />
          </div>
        }
      />

      <InstitutionalTable
        table={HOLDINGS_TABLE}
        rows={rows}
        getRowId={(row) => row.id}
        emptyTitle="No Holdings"
        emptyDescription="Add positions to your portfolio to see them here."
        onRowClick={(row) => router.push(getCompanyRoute(row.symbol))}
      />
    </Card>
  );
}
