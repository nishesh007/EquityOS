"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import type { PortfolioDoctorAnalysis, PortfolioSummary, UpcomingResult } from "@/types";
import type { OpportunityEngineState } from "@/lib/opportunity-engine/types";
import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";
import {
  buildExecutiveDashboard,
  type ExportAccessSubject,
  type ExportUserRole,
  type SubscriptionTier,
} from "@/lib/dashboard/institutional-executive-presentation";
import { ExecutiveHealthOverview } from "@/components/dashboard/institutional/ExecutiveHealthOverview";
import { ExecutiveMetricsGrid } from "@/components/dashboard/institutional/ExecutiveMetricsGrid";
import { ExecutiveStatusStrip } from "@/components/dashboard/institutional/ExecutiveStatusStrip";
import { ExecutiveAlertsPanel } from "@/components/dashboard/institutional/ExecutiveAlertsPanel";
import { ExecutiveSystemSummary } from "@/components/dashboard/institutional/ExecutiveSystemSummary";
import { ExecutiveReadinessCard } from "@/components/dashboard/institutional/ExecutiveReadinessCard";
import { ExecutiveQuickActions } from "@/components/dashboard/institutional/ExecutiveQuickActions";
import { ExecutiveFooter } from "@/components/dashboard/institutional/ExecutiveFooter";
import { ReportExportToolbar } from "@/components/reporting/ReportExportToolbar";
import { InstitutionalReportViewer } from "@/components/dashboard/institutional/InstitutionalReportViewer";

export function ExecutiveInstitutionalDashboard({
  snapshot = null,
  portfolio = null,
  doctor = null,
  opportunityState = null,
  earnings = null,
  role = "subscriber",
  subscriptionTier = "pro",
  userId = "dashboard-user",
  fetchSnapshot = true,
  compact = false,
}: {
  snapshot?: InstitutionalPlatformSnapshot | null;
  portfolio?: PortfolioSummary | null;
  doctor?: PortfolioDoctorAnalysis | null;
  opportunityState?: OpportunityEngineState | null;
  earnings?: UpcomingResult[] | null;
  role?: ExportUserRole;
  subscriptionTier?: SubscriptionTier;
  userId?: string;
  fetchSnapshot?: boolean;
  compact?: boolean;
}) {
  const [liveSnapshot, setLiveSnapshot] =
    useState<InstitutionalPlatformSnapshot | null>(snapshot);

  useEffect(() => {
    setLiveSnapshot(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (!fetchSnapshot || snapshot) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/validation/institutional-health");
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as InstitutionalPlatformSnapshot;
        if (!cancelled) setLiveSnapshot(payload);
      } catch {
        /* keep null */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchSnapshot, snapshot]);

  const subject: ExportAccessSubject = useMemo(
    () => ({ userId, role, subscriptionTier }),
    [userId, role, subscriptionTier]
  );

  const view = useMemo(
    () =>
      buildExecutiveDashboard({
        snapshot: liveSnapshot,
        portfolio,
        doctor,
        opportunityState,
        earnings,
        subject,
      }),
    [liveSnapshot, portfolio, doctor, opportunityState, earnings, subject]
  );

  return (
    <div
      id="institutional-executive"
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/10"
      data-testid="executive-institutional-dashboard"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border-subtle/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-3.5 w-3.5 text-accent" />
          <p className="text-xs font-semibold text-text-primary">
            Executive Overview
          </p>
        </div>
        {!view.exportPreviewOnly ? (
          <ReportExportToolbar
            reportType="ValidationReport"
            role={role}
            subscriptionTier={subscriptionTier}
            userId={userId}
          />
        ) : null}
      </div>

      <div className="space-y-4 px-4 py-4">
        {view.empty ? (
          <p className="text-[11px] text-text-muted" data-testid="executive-empty">
            {view.emptyMessage}
          </p>
        ) : null}

        <ExecutiveHealthOverview header={view.header} badges={view.badges} />
        <ExecutiveStatusStrip items={view.statusStrip} />
        <ExecutiveMetricsGrid metrics={view.metrics} />
        <ExecutiveQuickActions
          actions={view.quickActions}
          previewOnly={view.exportPreviewOnly}
          upgradeRequired={view.exportUpgradeRequired}
        />

        {!compact ? (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              <ExecutiveSystemSummary summary={view.summary} />
              <ExecutiveAlertsPanel alerts={view.alerts} />
            </div>
            <ExecutiveReadinessCard readiness={view.readiness} />
            <InstitutionalReportViewer
              snapshot={liveSnapshot}
              portfolio={portfolio}
              doctor={doctor}
              role={role}
              subscriptionTier={subscriptionTier}
              userId={userId}
              compact
              title="Executive · Institutional Report"
            />
          </>
        ) : null}

        <ExecutiveFooter footer={view.footer} />
      </div>
    </div>
  );
}
