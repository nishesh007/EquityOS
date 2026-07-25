"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { StockLink } from "@/components/ui/StockLink";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { ViewFullPortfolioLink } from "@/components/dashboard/ViewFullPortfolioLink";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import {
  createUnavailableQuote,
  type EnrichedQuote,
} from "@/lib/market-data/enriched-quote";
import { formatCurrency } from "@/lib/utils";
import { buildInitialQuotesMap } from "@/lib/market-data/enriched-quote";
import type { PortfolioSummary as PortfolioSummaryType } from "@/types";
import { AllocationRing, KpiTile } from "@/src/design";
import { Wallet } from "lucide-react";
import { useCallback, useMemo } from "react";

interface PortfolioSummaryProps {
  portfolio: PortfolioSummaryType;
  showTopHoldings?: boolean;
  showViewAllLink?: boolean;
  /**
   * Dashboard executive KPIs use Lakhs; detailed portfolio page uses exact ₹.
   */
  currencyStyle?: "lakhs" | "exact";
}

/** Dashboard summary KPIs — always express amounts in Lakhs (Sprint 10C). */
function formatLakhs(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  const sign = value < 0 ? "-" : "";
  return `${sign}₹${(Math.abs(value) / 1e5).toFixed(2)}L`;
}

export function PortfolioSummary({
  portfolio,
  showTopHoldings = true,
  showViewAllLink = true,
  currencyStyle = "lakhs",
}: PortfolioSummaryProps) {
  const formatMoney = (value: number) =>
    currencyStyle === "lakhs"
      ? formatLakhs(value)
      : formatCurrency(value, false);

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
        const available =
          quote.availability !== "unavailable" && price !== null && price > 0;
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
        sum +
        entry.price * entry.holding.quantity * (entry.changePercent / 100),
      0
    );
    const totalGain = totalValue - totalInvested;

    const holdingsWithValue = portfolio.holdings
      .map((holding) => {
        const quote = resolveQuote(holding.symbol, holding.quote);
        const price =
          quote.price && quote.price > 0 ? quote.price : holding.avgPrice;
        const value = price * holding.quantity;
        return { holding, quote, value };
      })
      .sort((a, b) => b.value - a.value);

    return {
      totalValue: Math.round(totalValue),
      dayChange: Math.round(dayChange),
      dayChangePercent:
        totalValue > 0
          ? Math.round((dayChange / totalValue) * 10000) / 100
          : 0,
      totalInvested,
      totalGain: Math.round(totalGain),
      totalGainPercent:
        totalInvested > 0
          ? Math.round((totalGain / totalInvested) * 10000) / 100
          : 0,
      holdingsWithValue,
    };
  }, [portfolio.holdings, resolveQuote]);

  return (
    <Card padding="md" accent="amber" className="flex h-full flex-col">
      <CardHeader
        title="Portfolio"
        subtitle="Holdings · allocation · P&L"
        icon={<Wallet className="h-4 w-4 text-amber-400" />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Total Value"
          value={formatMoney(liveMetrics.totalValue)}
        />
        <KpiTile
          label="Day P&L"
          value={formatMoney(liveMetrics.dayChange)}
          delta={liveMetrics.dayChangePercent}
        />
        <KpiTile
          label="Total Invested"
          value={formatMoney(liveMetrics.totalInvested)}
        />
        <KpiTile
          label="Unrealized P&L"
          value={formatMoney(liveMetrics.totalGain)}
          delta={liveMetrics.totalGainPercent}
        />
      </div>

      {portfolio.holdings.length > 0 ? (
        <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-medium text-text-muted">
              Capital Allocation
            </p>
            <AllocationRing
              size={96}
              legend
              centerLabel={formatMoney(liveMetrics.totalValue)}
              centerCaption="Deployed"
              slices={liveMetrics.holdingsWithValue.map(
                ({ holding, value }) => ({
                  id: holding.id,
                  label: holding.symbol,
                  value,
                })
              )}
            />
          </div>

          {showTopHoldings ? (
            <div className="min-w-0">
              <p className="mb-2 text-xs font-medium text-text-muted">
                Top Holdings
              </p>
              <div className="space-y-1.5">
                {liveMetrics.holdingsWithValue.slice(0, 4).map(
                  ({ holding, quote, value }) => (
                    <StockLink
                      key={holding.id}
                      symbol={holding.symbol}
                      className="flex items-center justify-between gap-2 rounded-lg border border-surface-border-subtle bg-surface/50 px-2.5 py-2 transition-colors hover:border-accent/20 hover:bg-surface-hover/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-text-primary">
                          {holding.symbol}
                        </p>
                        <p className="data-secondary truncate">
                          {holding.name}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-[11px] font-medium tabular-nums text-text-primary">
                          {formatMoney(value)}
                        </p>
                        <ChangeIndicator
                          value={quote.changePercent ?? 0}
                          size="sm"
                          showIcon={false}
                        />
                      </div>
                    </StockLink>
                  )
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyStatePanel
            message="No holdings in the local portfolio seed. Brokerage sync will enrich this view when connected."
            source="Local portfolio · brokerage optional"
            icon={Wallet}
          />
        </div>
      )}

      {showViewAllLink && <ViewFullPortfolioLink />}
    </Card>
  );
}
