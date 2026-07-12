"use client";

import { Badge } from "@/components/ui/Badge";
import { CompanyLiveQuote } from "@/components/market/CompanyLiveQuote";
import type { CompanyProfile } from "@/types";
import { Building2 } from "lucide-react";

interface CompanyHeaderProps {
  company: CompanyProfile;
}

export function CompanyHeader({ company }: CompanyHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-raised/80 p-6 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-gain/5" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
            <Building2 className="h-7 w-7 text-accent" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                {company.name}
              </h1>
              <Badge variant="accent" size="sm">
                NSE: {company.symbol}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Badge variant="default" size="sm">
                {company.sector}
              </Badge>
              <span className="text-xs text-text-muted">{company.industry}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 lg:items-end">
          <CompanyLiveQuote
            symbol={company.symbol}
            initialQuote={company.quote}
            size="lg"
            align="right"
          />
          <p className="mt-1 text-xs text-text-muted">
            Mkt Cap:{" "}
            <span className="font-mono text-text-secondary">
              {company.marketCap}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
