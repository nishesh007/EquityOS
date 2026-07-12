"use client";

import { useCallback, useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { QuoteDisplayCompact } from "@/components/market/QuoteDisplay";
import { StockLink } from "@/components/ui/StockLink";
import { ViewFullPortfolioLink } from "@/components/dashboard/ViewFullPortfolioLink";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { createUnavailableQuote, type EnrichedQuote } from "@/lib/market-data/enriched-quote";
import { formatCurrency } from "@/lib/utils";
import { buildInitialQuotesMap } from "@/services/marketData";
import type { PortfolioSummary as PortfolioSummaryType } from "@/types";
import { Wallet } from "lucide-react";

interface PortfolioSummaryProps {
  portfolio: PortfolioSummaryType;
  showTopHoldings?: boolean;
  showViewAllLink?: boolean;
}

export function PortfolioSummary({
  portfolio,
  showTopHoldings = true,
  showViewAllLink = true,
}: PortfolioSummaryProps) {
  const symbols = portfolio.holdings.map((h) => h.symbol);
  const { quotes, loading } = useMarketQuotes(symbols, {
    initialQuotes: buildInitialQuotesMap(portfolio.holdings),
  });

  const resolveQuote = useCallback(
    (symbol: string, holdingQuote?: EnrichedQuote) => {
      const polled = quotes.get(symbol) ?? quotes.get(symbol.toUpperCase());
      return (
        polled ??
        (loading ? holdingQuote : undefined) ??
        createUnavailableQuote(symbol)
      );
    },
    [quotes, loading]
  );

  const liveMetrics = useMemo(() => {
    const pricedHoldings = portfolio.holdings
      .map((holding) => {
        const quote = resolveQuote(holding.symbol, holding.quote);
        const price = quote.price;
        const changePercent = quote.changePercent ?? 0;
        const available = quote.availability !== "unavailable" && price !== null && price > 0;
        return { holding, quote, price: price ?? 0, changePercent, available };
      })
      .filter((entry) => entry.available);

    const totalValue = pricedHoldings.reduce(
      (sum, entry) => sum + entry.price * entry.holding.quantity,
      0
    );
    const totalInvested = portfolio.holdings.reduce(
      (sum, holding) => sum + holding.avgPrice * holding.quantity,
      0
    );
    const dayChange = pricedHoldings.reduce(
      (sum, entry) =>
        sum + entry.price * entry.holding.quantity * (entry.changePercent / 100),
      0
    );
    const totalGain = totalValue - totalInvested;

    return {
      totalValue: Math.round(totalValue),
      dayChange: Math.round(dayChange),
      dayChangePercent:
        totalValue > 0 ? Math.round((dayChange / totalValue) * 10000) / 100 : 0,
      totalInvested,
      totalGain: Math.round(totalGain),
      totalGainPercent:
        totalInvested > 0
          ? Math.round((totalGain / totalInvested) * 10000) / 100
          : 0,
    };
  }, [portfolio.holdings, resolveQuote]);

  return (
    <Card padding="lg" className="h-full">
      <CardHeader
        title="Portfolio Summary"
        subtitle="Your investment overview"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Wallet className="h-4 w-4 text-accent" />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/50 p-4">
          <p className="data-label">Total Value</p>
          <p className="mt-1 data-value text-lg font-semibold">
            {formatCurrency(liveMetrics.totalValue, true)}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/50 p-4">
          <p className="data-label">Day P&L</p>
          <div className="mt-1 flex items-center gap-2">
            <p
              className={`data-value text-lg font-semibold ${
                liveMetrics.dayChange >= 0 ? "text-gain" : "text-loss"
              }`}
            >
              {formatCurrency(liveMetrics.dayChange, true)}
            </p>
            <ChangeIndicator value={liveMetrics.dayChangePercent} size="sm" />
          </div>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/50 p-4">
          <p className="data-label">Total Invested</p>
          <p className="mt-1 data-value text-lg font-semibold">
            {formatCurrency(liveMetrics.totalInvested, true)}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/50 p-4">
          <p className="data-label">Total Gain</p>
          <div className="mt-1 flex items-center gap-2">
            <p
              className={`data-value text-lg font-semibold ${
                liveMetrics.totalGain >= 0 ? "text-gain" : "text-loss"
              }`}
            >
              {formatCurrency(liveMetrics.totalGain, true)}
            </p>
            <ChangeIndicator value={liveMetrics.totalGainPercent} size="sm" />
          </div>
        </div>
      </div>

      {showTopHoldings && (
        <div className="mt-5">
          <p className="mb-3 text-xs font-medium text-text-muted">Top Holdings</p>
          <div className="space-y-2">
            {portfolio.holdings.slice(0, 4).map((holding) => {
              const quote = resolveQuote(holding.symbol, holding.quote);

              return (
                <StockLink
                  key={holding.id}
                  symbol={holding.symbol}
                  className="flex items-center justify-between rounded-lg border border-surface-border-subtle bg-surface/50 px-3 py-2.5 transition-colors hover:border-accent/20 hover:bg-surface-hover/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-overlay text-[10px] font-bold text-text-secondary">
                      {holding.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {holding.symbol}
                      </p>
                      <p className="text-[10px] text-text-muted">{holding.name}</p>
                    </div>
                  </div>
                  <QuoteDisplayCompact quote={quote} className="text-right" />
                </StockLink>
              );
            })}
          </div>
        </div>
      )}

      {showViewAllLink && <ViewFullPortfolioLink />}
    </Card>
  );
}
