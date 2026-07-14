"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";
import {
  buildPlatformInstitutionalBadges,
  buildValidationDetailsView,
  buildValidationMetricViews,
} from "@/lib/dashboard/institutional-exposure";
import { InstitutionalMetricCell } from "@/components/dashboard/opportunity-intelligence/InstitutionalMetricCell";
import { InstitutionalPanelSkeleton } from "@/components/dashboard/opportunity-intelligence/InstitutionalPanelSkeleton";
import { InstitutionalTrustBadges } from "@/components/dashboard/opportunity-intelligence/InstitutionalTrustBadges";
import { InstitutionalValidationDetailsDrawer } from "@/components/dashboard/opportunity-intelligence/InstitutionalValidationDetailsDrawer";
import { ReportExportToolbar } from "@/components/reporting/ReportExportToolbar";

export function InstitutionalValidationPanel({
  snapshot,
}: {
  snapshot: InstitutionalPlatformSnapshot | null;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const metrics = useMemo(
    () => buildValidationMetricViews(snapshot),
    [snapshot]
  );
  const details = useMemo(
    () => buildValidationDetailsView(snapshot),
    [snapshot]
  );
  const badges = useMemo(
    () => buildPlatformInstitutionalBadges(snapshot),
    [snapshot]
  );

  if (!snapshot) {
    return <InstitutionalPanelSkeleton title="Loading validation metrics…" cells={10} />;
  }

  return (
    <>
      <div
        className="mb-4 rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
        data-testid="institutional-validation-card"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <p className="text-xs font-semibold text-text-primary">
              Institutional Validation
            </p>
            {snapshot.platform?.overallValidationStatus ? (
              <span className="rounded border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
                {snapshot.platform.overallValidationStatus}
              </span>
            ) : null}
            <InstitutionalTrustBadges badges={badges} compact />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-md border border-surface-border-subtle px-2 py-1 text-[10px] font-medium text-text-secondary transition hover:bg-surface-hover"
            >
              View Details
            </button>
            <ReportExportToolbar reportType="ValidationReport" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((metric) => (
            <InstitutionalMetricCell
              key={metric.id}
              metric={metric}
              onClick={() => setDrawerOpen(true)}
            />
          ))}
        </div>
      </div>

      <InstitutionalValidationDetailsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        details={details}
      />
    </>
  );
}
