"use client";

import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { QuoteDisplayCompact } from "@/components/market/QuoteDisplay";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { createUnavailableQuote } from "@/lib/market-data/enriched-quote";
import { formatCurrency } from "@/lib/utils";
import { getCompanyRoute } from "@/lib/routes";
import { buildInitialQuotesMap } from "@/services/marketData";
import type { PortfolioHolding } from "@/types";
import { Briefcase } from "lucide-react";

interface PortfolioHoldingsTableProps {
  holdings: PortfolioHolding[];
}

export function PortfolioHoldingsTable({
  holdings,
}: PortfolioHoldingsTableProps) {
  const router = useRouter();
  const symbols = holdings.map((h) => h.symbol);
  const { quotes } = useMarketQuotes(symbols, {
    initialQuotes: buildInitialQuotesMap(holdings),
  });

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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border-subtle text-left">
              <th className="pb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Symbol
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Qty
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Avg Price
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                LTP
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Day Change
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Value
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                P&amp;L
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => {
              const quote =
                quotes.get(holding.symbol) ??
                holding.quote ??
                createUnavailableQuote(holding.symbol);
              const currentPrice = quote.price ?? holding.currentPrice;
              const changePercent = quote.changePercent ?? holding.changePercent;
              const currentValue = currentPrice * holding.quantity;
              const investedValue = holding.avgPrice * holding.quantity;
              const pnl = currentValue - investedValue;
              const pnlPercent =
                investedValue > 0 ? (pnl / investedValue) * 100 : 0;

              return (
                <tr
                  key={holding.id}
                  onClick={() => router.push(getCompanyRoute(holding.symbol))}
                  className="group cursor-pointer border-b border-surface-border-subtle/50 transition-colors hover:bg-surface-hover/30"
                >
                  <td className="py-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary group-hover:text-accent">
                        {holding.symbol}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {holding.name}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <p className="text-sm font-mono text-text-primary tabular-nums">
                      {holding.quantity}
                    </p>
                  </td>
                  <td className="py-3 text-right">
                    <p className="text-sm font-mono text-text-muted tabular-nums">
                      ₹{holding.avgPrice.toLocaleString("en-IN")}
                    </p>
                  </td>
                  <td className="py-3 text-right">
                    <QuoteDisplayCompact quote={quote} className="flex flex-col items-end" />
                  </td>
                  <td className="py-3 text-right">
                    <ChangeIndicator
                      value={changePercent}
                      size="sm"
                      showIcon={false}
                    />
                  </td>
                  <td className="py-3 text-right">
                    <p className="text-sm font-mono text-text-primary tabular-nums">
                      {formatCurrency(currentValue, true)}
                    </p>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <p
                        className={`text-sm font-mono tabular-nums ${
                          pnl >= 0 ? "text-gain" : "text-loss"
                        }`}
                      >
                        {formatCurrency(pnl, true)}
                      </p>
                      <ChangeIndicator
                        value={pnlPercent}
                        size="sm"
                        showIcon={false}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
