import { Card, CardHeader } from "@/components/ui/Card";
import type { CompanyProfile } from "@/types";
import { Building2, Globe, Users, Calendar } from "lucide-react";

interface OverviewTabProps {
  company: CompanyProfile;
}

export function OverviewTab({ company }: OverviewTabProps) {
  const facts = [
    { icon: Building2, label: "Founded", value: company.founded },
    { icon: Users, label: "Employees", value: company.employees },
    { icon: Globe, label: "Website", value: company.website },
    { icon: Calendar, label: "Sector", value: company.sector },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card padding="lg" className="lg:col-span-2">
        <CardHeader title="About" subtitle="Company overview" />
        <p className="text-sm leading-relaxed text-text-secondary">
          {company.description}
        </p>
      </Card>

      <Card padding="lg">
        <CardHeader title="Key Facts" subtitle="At a glance" />
        <div className="space-y-4">
          {facts.map((fact) => {
            const Icon = fact.icon;
            return (
              <div key={fact.label} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-overlay">
                  <Icon className="h-4 w-4 text-text-muted" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-faint">
                    {fact.label}
                  </p>
                  <p className="text-sm font-medium text-text-primary">
                    {fact.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card padding="lg" className="lg:col-span-3">
        <CardHeader title="Business Profile" subtitle={company.industry} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/40 p-4">
            <p className="data-label">Market Cap</p>
            <p className="mt-1 text-lg font-semibold font-mono text-text-primary">
              {company.marketCap}
            </p>
          </div>
          <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/40 p-4">
            <p className="data-label">P/E Ratio</p>
            <p className="mt-1 text-lg font-semibold font-mono text-text-primary">
              {company.financials.pe}x
            </p>
          </div>
          <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/40 p-4">
            <p className="data-label">ROE</p>
            <p className="mt-1 text-lg font-semibold font-mono text-text-primary">
              {company.financials.roe}%
            </p>
          </div>
          <div className="rounded-lg border border-surface-border-subtle bg-surface-overlay/40 p-4">
            <p className="data-label">Debt/Equity</p>
            <p className="mt-1 text-lg font-semibold font-mono text-text-primary">
              {company.financials.debtToEquity}x
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
