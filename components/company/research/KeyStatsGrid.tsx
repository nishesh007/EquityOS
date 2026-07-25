"use client";

import { Card } from "@/components/ui/Card";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import { createUnavailableQuote } from "@/lib/market-data/enriched-quote";
import {
  formatPercentValue,
  formatRatioValue,
} from "@/lib/format/research-numbers";
import { cn, formatPrice, formatVolume, isValidMarketPrice } from "@/lib/utils";
import type { CompanyProfile, TradingData } from "@/types";

interface KeyStatsGridProps {
  company: CompanyProfile;
  trading: TradingData;
}

interface Stat {
  label: string;
  value: string;
  tone?: "gain" | "loss" | "accent" | "default";
  mono?: boolean;
}

export function KeyStatsGrid({ company, trading }: KeyStatsGridProps) {
  const { quotes, loading } = useMarketQuotes([company.symbol], {
    initialQuotes: company.quote
      ? { [company.symbol.toUpperCase()]: company.quote }
      : {},
  });

  const normalized = company.symbol.toUpperCase();
  const polled = quotes.get(company.symbol) ?? quotes.get(normalized);
  const quote =
    polled ??
    (loading ? company.quote : undefined) ??
    createUnavailableQuote(company.symbol);

  const livePrice = quote.price;
  const liveTrading = {
    open: quote.open ?? trading.open,
    high: quote.high ?? trading.high,
    low: quote.low ?? trading.low,
    previousClose: quote.previousClose ?? trading.previousClose,
    volume: quote.volume ?? trading.volume,
    deliveryPercent: quote.deliveryPercent ?? trading.deliveryPercent,
    vwap: quote.vwap ?? trading.vwap,
  };
  const rangePosition =
    isValidMarketPrice(livePrice) &&
    trading.weekHigh52 > trading.weekLow52
      ? ((livePrice - trading.weekLow52) /
          (trading.weekHigh52 - trading.weekLow52)) *
        100
      : 0;

  const stats: Stat[] = [
    { label: "Open", value: formatPrice(liveTrading.open), mono: true },
    {
      label: "High",
      value: formatPrice(liveTrading.high),
      mono: true,
      tone: "gain",
    },
    {
      label: "Low",
      value: formatPrice(liveTrading.low),
      mono: true,
      tone: "loss",
    },
    {
      label: "Prev Close",
      value: formatPrice(liveTrading.previousClose),
      mono: true,
    },
    {
      label: "Volume",
      value: `${formatVolume(liveTrading.volume)}`,
      mono: true,
    },
    {
      label: "Delivery %",
      value: formatPercentValue(liveTrading.deliveryPercent),
      mono: true,
      tone: "accent",
    },
    { label: "VWAP", value: formatPrice(liveTrading.vwap), mono: true },
    { label: "Turnover", value: trading.turnover, mono: true },
    {
      label: "Market Cap",
      value: quote.marketCap ?? company.marketCap,
      mono: true,
    },
    { label: "P/E", value: formatRatioValue(company.financials.pe), mono: true },
    { label: "P/B", value: formatRatioValue(company.financials.pb), mono: true },
    {
      label: "ROE",
      value: formatPercentValue(company.financials.roe),
      mono: true,
    },
    {
      label: "ROCE",
      value: formatPercentValue(company.financials.roce),
      mono: true,
    },
    {
      label: "Div Yield",
      value: formatPercentValue(trading.dividendYield),
      mono: true,
    },
  ];

  const toneClass: Record<NonNullable<Stat["tone"]>, string> = {
    gain: "text-gain",
    loss: "text-loss",
    accent: "text-accent",
    default: "text-text-primary",
  };

  return (
    <Card padding="md" className="animate-fade-in-up">
      <div className="mb-3">
        <h3 className="text-sm font-semibold tracking-tight text-text-primary">
          Overview & Market Data
        </h3>
        <p className="mt-0.5 text-[10px] text-text-muted">
          Session stats · multiples · 52-week range
        </p>
      </div>

      <div className="mb-3 w-full max-w-md">
        <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-text-faint">
          <span>52W Low</span>
          <span>52W High</span>
        </div>
        <div className="relative h-2 rounded-full bg-surface-overlay">
          <div className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-loss/40 via-accent/40 to-gain/40" />
          {isValidMarketPrice(livePrice) && (
            <div
              className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-text-primary shadow-glow"
              style={{
                left: `calc(${Math.max(2, Math.min(98, rangePosition))}% - 2px)`,
              }}
            />
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between font-mono text-xs tabular-nums text-text-secondary">
          <span>{formatPrice(trading.weekLow52)}</span>
          <span className="text-text-faint">
            {isValidMarketPrice(livePrice)
              ? `${Math.round(rangePosition)}% of range`
              : "52W range"}
          </span>
          <span>{formatPrice(trading.weekHigh52)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-border-subtle sm:grid-cols-4 lg:grid-cols-7">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface-raised px-3 py-2.5">
            <p className="data-label truncate text-[10px]">{stat.label}</p>
            <p
              className={cn(
                "mt-1 truncate text-sm font-semibold",
                stat.mono && "font-mono tabular-nums",
                toneClass[stat.tone ?? "default"]
              )}
              title={stat.value}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
