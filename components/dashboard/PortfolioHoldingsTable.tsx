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
import { TABLE_CLASSES } from "@/src/design";
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

      <div className={TABLE_CLASSES.container}>
        <table className={TABLE_CLASSES.table}>
          <thead>
            <tr>
              <th>Symbol</th>
              <th className="!text-right">Qty</th>
              <th className="!text-right">Avg Price</th>
              <th className="!text-right">LTP</th>
              <th className="!text-right">Day Change</th>
              <th className="!text-right">Value</th>
              <th className="!text-right">P&amp;L</th>
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
                  className="group cursor-pointer"
                >
                  <td>
                    <div>
                      <p className="text-sm font-medium text-text-primary group-hover:text-accent">
                        {holding.symbol}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {holding.name}
                      </p>
                    </div>
                  </td>
                  <td className={TABLE_CLASSES.numericCell}>
                    <p className="text-sm">{holding.quantity}</p>
                  </td>
                  <td className={TABLE_CLASSES.numericCell}>
                    <p className="text-sm text-text-muted">
                      ₹{holding.avgPrice.toLocaleString("en-IN")}
                    </p>
                  </td>
                  <td className={TABLE_CLASSES.numericCell}>
                    <QuoteDisplayCompact quote={quote} className="flex flex-col items-end" />
                  </td>
                  <td className={TABLE_CLASSES.numericCell}>
                    <ChangeIndicator
                      value={changePercent}
                      size="sm"
                      showIcon={false}
                    />
                  </td>
                  <td className={TABLE_CLASSES.numericCell}>
                    <p className="text-sm">{formatCurrency(currentValue, true)}</p>
                  </td>
                  <td className={TABLE_CLASSES.numericCell}>
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
