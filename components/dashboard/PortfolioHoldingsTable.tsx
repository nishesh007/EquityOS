"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { EventAwarenessBadgeRow } from "@/components/events/EventAwarenessBadges";
import { useOptionalGlobalEventDrawer } from "@/components/events/GlobalEventDrawerProvider";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { createUnavailableQuote } from "@/lib/market-data/enriched-quote";
import { getCompanyRoute } from "@/lib/routes";
import { buildInitialQuotesMap } from "@/lib/market-data/enriched-quote";
import type { PortfolioHolding } from "@/types";
import { createInstitutionalTable, ResearchDataGrid } from "@/src/design";
import { Briefcase } from "lucide-react";
import type { SharedRecommendation } from "@/lib/recommendations";
import { buildPortfolioEventInsights } from "@/src/core/events/integration";
import { buildEventSeedCatalog, toDateKey } from "@/src/core/events";

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
  const drawer = useOptionalGlobalEventDrawer();
  const today = useMemo(() => toDateKey(new Date()), []);
  const catalog = useMemo(() => buildEventSeedCatalog(today), [today]);
  const eventInsights = useMemo(() => {
    const list = buildPortfolioEventInsights(
      catalog,
      holdings.map((h) => ({ symbol: h.symbol, name: h.name })),
      today
    );
    return new Map(list.map((insight) => [insight.symbol, insight]));
  }, [catalog, holdings, today]);

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

      <ResearchDataGrid
        table={HOLDINGS_TABLE}
        rows={rows}
        getRowId={(row) => row.id}
        emptyTitle="No Holdings"
        emptyDescription="Add positions to your portfolio to see them here."
        onRowClick={(row) => router.push(getCompanyRoute(row.symbol))}
        renderExpandedRow={(row) => {
          const insight = eventInsights.get(row.symbol.toUpperCase());
          const primary = insight?.primary ?? null;
          return (
            <div className="grid gap-2 sm:grid-cols-4">
              <div>
                <p className="data-label">Strategy Details</p>
                <p className="data-secondary mt-1">
                  {row.signal} · {row.strategy}
                  {row.holdingConfidence != null
                    ? ` · Confidence ${row.holdingConfidence.toFixed(1)}%`
                    : ""}
                </p>
              </div>
              <div>
                <p className="data-label">Risks</p>
                <p className="data-secondary mt-1">
                  Risk {row.risk ?? "—"} · Regime {row.regime}
                </p>
              </div>
              <div>
                <p className="data-label">Notes</p>
                <p className="data-secondary mt-1">
                  {row.name} · Opportunity {row.opportunityChange}
                </p>
              </div>
              <div>
                <p className="data-label">Upcoming Event</p>
                {primary ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      drawer?.openEvent(primary.event);
                    }}
                    className="mt-1 w-full text-left"
                  >
                    <p className="data-secondary">
                      {primary.event.title} · {primary.countdown.label}
                      {primary.riskLabel === "risk"
                        ? " · Risk"
                        : primary.riskLabel === "opportunity"
                          ? " · Opportunity"
                          : ""}
                    </p>
                    <EventAwarenessBadgeRow
                      kinds={primary.awareness}
                      max={2}
                      className="mt-1.5"
                    />
                  </button>
                ) : (
                  <p className="data-secondary mt-1">No upcoming events.</p>
                )}
              </div>
            </div>
          );
        }}
      />
    </Card>
  );
}
