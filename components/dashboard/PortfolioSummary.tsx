import { Card, CardHeader } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { StockLink } from "@/components/ui/StockLink";
import { ViewFullPortfolioLink } from "@/components/dashboard/ViewFullPortfolioLink";
import { formatCurrency } from "@/lib/utils";
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
            {formatCurrency(portfolio.totalValue, true)}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/50 p-4">
          <p className="data-label">Day P&L</p>
          <div className="mt-1 flex items-center gap-2">
            <p
              className={`data-value text-lg font-semibold ${
                portfolio.dayChange >= 0 ? "text-gain" : "text-loss"
              }`}
            >
              {formatCurrency(portfolio.dayChange, true)}
            </p>
            <ChangeIndicator value={portfolio.dayChangePercent} size="sm" />
          </div>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/50 p-4">
          <p className="data-label">Total Invested</p>
          <p className="mt-1 data-value text-lg font-semibold">
            {formatCurrency(portfolio.totalInvested, true)}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/50 p-4">
          <p className="data-label">Total Gain</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="data-value text-lg font-semibold text-gain">
              {formatCurrency(portfolio.totalGain, true)}
            </p>
            <ChangeIndicator value={portfolio.totalGainPercent} size="sm" />
          </div>
        </div>
      </div>

      {showTopHoldings && (
        <div className="mt-5">
          <p className="mb-3 text-xs font-medium text-text-muted">Top Holdings</p>
          <div className="space-y-2">
            {portfolio.holdings.slice(0, 4).map((holding) => (
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
                <div className="text-right">
                  <p className="text-sm font-mono text-text-primary tabular-nums">
                    ₹{holding.currentPrice.toLocaleString("en-IN")}
                  </p>
                  <ChangeIndicator
                    value={holding.changePercent}
                    size="sm"
                    showIcon={false}
                  />
                </div>
              </StockLink>
            ))}
          </div>
        </div>
      )}

      {showViewAllLink && <ViewFullPortfolioLink />}
    </Card>
  );
}
