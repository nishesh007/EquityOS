import { Badge } from "@/components/ui/Badge";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import type { CompanyProfile } from "@/types";
import { Building2 } from "lucide-react";

interface CompanyHeaderProps {
  company: CompanyProfile;
}

export function CompanyHeader({ company }: CompanyHeaderProps) {
  const isGain = company.changePercent >= 0;

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
          <p className="text-3xl font-bold font-mono text-text-primary tabular-nums">
            ₹{company.price.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-mono tabular-nums ${
                isGain ? "text-gain" : "text-loss"
              }`}
            >
              {isGain ? "+" : ""}₹{Math.abs(company.change).toFixed(2)}
            </span>
            <ChangeIndicator value={company.changePercent} size="md" />
          </div>
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
