"use client";

import { Badge } from "@/components/ui/Badge";
import { CompanyLiveQuote } from "@/components/market/CompanyLiveQuote";
import { formatScore } from "@/lib/format/research-numbers";
import { cn } from "@/lib/utils";
import type { CompanyProfile } from "@/types";
import { Building2, Gauge } from "lucide-react";

interface CompanyHeaderProps {
  company: CompanyProfile;
  quickScore?: number | null;
  quickVerdict?: string | null;
}

/**
 * Premium company header — name, price, change, market status,
 * market cap, sector, industry, and quick score.
 */
export function CompanyHeader({
  company,
  quickScore,
  quickVerdict,
}: CompanyHeaderProps) {
  const scoreTone =
    typeof quickScore === "number"
      ? quickScore >= 70
        ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
        : quickScore >= 50
          ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
          : "text-rose-400 border-rose-500/30 bg-rose-500/10"
      : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 via-surface-raised to-gain/5 p-4 shadow-[0_0_40px_-20px_rgba(59,130,246,0.35)] sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-36 w-36 rounded-full bg-gain/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
            <Building2 className="h-6 w-6 text-accent" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
                {company.name}
              </h1>
              <Badge variant="accent" size="sm">
                NSE: {company.symbol}
              </Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="default" size="sm">
                {company.sector}
              </Badge>
              <span className="text-xs text-text-muted">{company.industry}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <MetaChip label="Market Cap" value={company.marketCap} />
              {typeof quickScore === "number" ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1",
                    scoreTone
                  )}
                >
                  <Gauge className="h-3.5 w-3.5" />
                  <span className="text-[10px] uppercase tracking-wider opacity-80">
                    Quick Score
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums">
                    {formatScore(quickScore)}
                  </span>
                  {quickVerdict ? (
                    <span className="text-[10px] font-medium opacity-90">
                      · {quickVerdict}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 lg:items-end">
          <CompanyLiveQuote
            symbol={company.symbol}
            initialQuote={company.quote}
            size="lg"
            align="right"
            compact
          />
        </div>
      </div>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-2.5 py-1">
      <span className="text-[10px] uppercase tracking-wider text-text-faint">
        {label}
      </span>
      <span className="font-mono text-xs font-semibold tabular-nums text-text-primary">
        {value}
      </span>
    </span>
  );
}
