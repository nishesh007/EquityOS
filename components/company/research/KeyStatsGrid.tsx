import { Card } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { cn, formatPrice, formatVolume } from "@/lib/utils";
import type { CompanyProfile, TradingData } from "@/types";
import { Radio } from "lucide-react";

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
  const isGain = company.changePercent >= 0;

  const rangePosition =
    ((company.price - trading.weekLow52) /
      (trading.weekHigh52 - trading.weekLow52)) *
    100;

  const stats: Stat[] = [
    { label: "Open", value: formatPrice(trading.open), mono: true },
    { label: "High", value: formatPrice(trading.high), mono: true, tone: "gain" },
    { label: "Low", value: formatPrice(trading.low), mono: true, tone: "loss" },
    { label: "Prev Close", value: formatPrice(trading.previousClose), mono: true },
    { label: "Volume", value: `${formatVolume(trading.volume)}`, mono: true },
    { label: "Delivery %", value: `${trading.deliveryPercent}%`, mono: true, tone: "accent" },
    { label: "VWAP", value: formatPrice(trading.vwap), mono: true },
    { label: "Turnover", value: trading.turnover, mono: true },
    { label: "Market Cap", value: company.marketCap, mono: true },
    { label: "P/E", value: `${company.financials.pe}x`, mono: true },
    { label: "P/B", value: `${company.financials.pb}x`, mono: true },
    { label: "ROE", value: `${company.financials.roe}%`, mono: true },
    { label: "ROCE", value: `${company.financials.roce}%`, mono: true },
    { label: "Div Yield", value: `${trading.dividendYield}%`, mono: true },
    { label: "Sector", value: company.sector },
    { label: "Industry", value: company.industry },
  ];

  const toneClass: Record<NonNullable<Stat["tone"]>, string> = {
    gain: "text-gain",
    loss: "text-loss",
    accent: "text-accent",
    default: "text-text-primary",
  };

  return (
    <Card padding="lg" className="animate-fade-in-up">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gain opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gain" />
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Live · NSE
              </span>
              <Radio className="h-3 w-3 text-text-faint" />
            </div>
            <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-text-primary">
              {formatPrice(company.price)}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={cn(
                  "font-mono text-sm tabular-nums",
                  isGain ? "text-gain" : "text-loss"
                )}
              >
                {isGain ? "+" : ""}
                {formatPrice(Math.abs(company.change))}
              </span>
              <ChangeIndicator value={company.changePercent} size="md" />
            </div>
          </div>
        </div>

        {/* 52-week range bar */}
        <div className="w-full max-w-sm">
          <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-text-faint">
            <span>52W Low</span>
            <span>52W High</span>
          </div>
          <div className="relative h-2 rounded-full bg-surface-overlay">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-loss/40 via-accent/40 to-gain/40 w-full" />
            <div
              className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-text-primary shadow-glow"
              style={{ left: `calc(${Math.max(2, Math.min(98, rangePosition))}% - 2px)` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono text-xs tabular-nums text-text-secondary">
            <span>{formatPrice(trading.weekLow52)}</span>
            <span className="text-text-faint">{Math.round(rangePosition)}% of range</span>
            <span>{formatPrice(trading.weekHigh52)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-border-subtle sm:grid-cols-4 lg:grid-cols-8">
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
