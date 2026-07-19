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
import type { SharedRecommendation } from "@/lib/recommendations";

interface PortfolioHoldingsTableProps {
  holdings: PortfolioHolding[];
  recommendations?: Record<string, SharedRecommendation>;
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
  strategy: string;
  holdingConfidence: number | null;
  signal: string;
  risk: number | null;
  regime: string;
  opportunityChange: string;
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
    { id: "strategy", label: "Current Strategy", kind: "text" },
    { id: "holdingConfidence", label: "Confidence", kind: "number" },
    { id: "signal", label: "Signal", kind: "text" },
    { id: "risk", label: "Risk", kind: "number" },
    { id: "regime", label: "Regime", kind: "text" },
    { id: "opportunityChange", label: "Opportunity", kind: "text" },
  ],
});

export function PortfolioHoldingsTable({
  holdings,
  recommendations = {},
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
        const recommendation =
          recommendations[holding.symbol.toUpperCase()];
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
          strategy: recommendation?.primaryStrategy ?? "No active strategy",
          holdingConfidence: recommendation?.confidence ?? null,
          signal: recommendation?.action ?? "HOLD",
          risk: recommendation?.risk ?? null,
          regime: recommendation?.marketRegime ?? "—",
          opportunityChange:
            recommendation?.action === "BUY"
              ? "Upgrade"
              : recommendation?.action === "SELL"
                ? "Downgrade"
                : "Monitor",
        };
      }),
    [holdings, quotes, recommendations]
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
