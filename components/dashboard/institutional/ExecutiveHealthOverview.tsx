"use client";

import type { ExecutiveHeaderView } from "@/lib/dashboard/institutional-executive-presentation";
import type { PlatformInstitutionalBadge } from "@/lib/dashboard/institutional-exposure";
import { InstitutionalTrustBadges } from "@/components/dashboard/opportunity-intelligence/InstitutionalTrustBadges";

export function ExecutiveHealthOverview({
  header,
  badges = [],
}: {
  header: ExecutiveHeaderView;
  badges?: PlatformInstitutionalBadge[];
}) {
  const cells = [
    { label: "Institutional Grade", value: header.institutionalGrade },
    { label: "Platform Status", value: header.platformStatus },
    { label: "Production Ready", value: header.productionReady },
    { label: "Validation Status", value: header.validationStatus },
    { label: "Trust Status", value: header.trustStatus },
    { label: "AI Status", value: header.aiStatus },
    { label: "Market Status", value: header.marketStatus },
    { label: "Last Successful Scan", value: header.lastSuccessfulScan },
    { label: "Platform Version", value: header.platformVersion },
  ];

  return (
    <div data-testid="executive-health-overview">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
            Executive Overview
          </p>
          <h2 className="text-sm font-semibold text-text-primary">
            Institutional Command Center
          </h2>
        </div>
        <InstitutionalTrustBadges badges={badges} compact />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="rounded-md border border-surface-border-subtle/70 bg-surface-raised/40 px-2.5 py-2"
          >
            <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
              {cell.label}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-text-primary">{cell.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
