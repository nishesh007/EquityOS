"use client";

import { useCallback, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import type { InstitutionalReport } from "@/src/core/dataIntegrity/reporting/ReportBuilder";
import type {
  InstitutionalCandidateView,
  InstitutionalPlatformSnapshot,
} from "@/lib/opportunity-engine/institutional-presentation";
import {
  buildReportViewer,
  type ExportAccessSubject,
  type ExportUserRole,
  type SubscriptionTier,
} from "@/lib/dashboard/institutional-report-viewer";
import { ReportNavigationSidebar } from "@/components/dashboard/institutional/ReportNavigationSidebar";
import { ReportSectionCard } from "@/components/dashboard/institutional/ReportSectionCard";
import { ReportExecutiveSummary } from "@/components/dashboard/institutional/ReportExecutiveSummary";
import { ReportMetricGrid } from "@/components/dashboard/institutional/ReportMetricGrid";
import { ReportChartsPanel } from "@/components/dashboard/institutional/ReportChartsPanel";
import { ReportMetadataPanel } from "@/components/dashboard/institutional/ReportMetadataPanel";
import { ReportFooter } from "@/components/dashboard/institutional/ReportFooter";
import { ReportSharePlaceholder } from "@/components/dashboard/institutional/ReportSharePlaceholder";
import { ReportExportToolbar } from "@/components/reporting/ReportExportToolbar";
import { PortfolioHealthCard } from "@/components/dashboard/institutional/PortfolioHealthCard";
import { buildPortfolioHealth } from "@/lib/dashboard/institutional-portfolio-presentation";
import type { PortfolioDoctorAnalysis, PortfolioSummary } from "@/types";

export function InstitutionalReportViewer({
  report = null,
  snapshot = null,
  candidate = null,
  portfolio = null,
  doctor = null,
  role = "subscriber",
  subscriptionTier = "pro",
  userId = "dashboard-user",
  compact = false,
  defaultOpen = false,
  title,
}: {
  report?: InstitutionalReport | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
  candidate?: InstitutionalCandidateView | null;
  portfolio?: PortfolioSummary | null;
  doctor?: PortfolioDoctorAnalysis | null;
  role?: ExportUserRole;
  subscriptionTier?: SubscriptionTier;
  userId?: string;
  compact?: boolean;
  defaultOpen?: boolean;
  title?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [activeId, setActiveId] = useState("executive_summary");

  const subject: ExportAccessSubject = useMemo(
    () => ({ userId, role, subscriptionTier }),
    [userId, role, subscriptionTier]
  );

  const model = useMemo(
    () =>
      buildReportViewer({
        report,
        snapshot,
        candidate,
        subject,
      }),
    [report, snapshot, candidate, subject]
  );

  const portfolioHealth = useMemo(() => {
    if (!portfolio && !doctor) return null;
    return buildPortfolioHealth({ portfolio, doctor, snapshot });
  }, [portfolio, doctor, snapshot]);

  const navigate = useCallback((id: string) => {
    setActiveId(id);
    const el = document.getElementById(`report-section-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const sectionById = useMemo(() => {
    const map = new Map(model.sections.map((s) => [s.id, s]));
    return map;
  }, [model.sections]);

  if (!open && compact) {
    return (
      <div
        className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
        data-testid="institutional-report-viewer-collapsed"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-accent" />
            <p className="text-xs font-semibold text-text-primary">
              {title ?? "Institutional Report Viewer"}
            </p>
            <span className="rounded border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
              {model.metadata.institutionalGrade}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md border border-surface-border-subtle px-2 py-1 text-[10px] font-medium text-text-secondary transition hover:bg-surface-hover"
            data-testid="institutional-report-viewer-open"
          >
            Open Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/10"
      data-testid="institutional-report-viewer"
    >
      <header className="border-b border-surface-border-subtle/80 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-semibold text-text-primary">
                {model.title}
              </h2>
              <span className="rounded border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
                {model.metadata.institutionalGrade}
              </span>
              {model.previewOnly ? (
                <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-600">
                  Preview
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] text-text-muted">{model.subtitle}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] uppercase tracking-wider text-text-faint">
              <span>Type · {model.metadata.reportType}</span>
              <span>Session · {model.metadata.marketSession}</span>
              <span>Env · {model.metadata.environment}</span>
              <span>Platform · {model.metadata.platformVersion}</span>
              <span>Validation · {model.metadata.validationVersion}</span>
              <span>Trust · {model.metadata.trustVersion}</span>
              <span>AI · {model.metadata.aiVersion}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ReportSharePlaceholder />
            {model.showExport ? (
              <ReportExportToolbar
                reportType={model.metadata.reportType}
                role={role}
                subscriptionTier={subscriptionTier}
                userId={userId}
              />
            ) : null}
            {compact ? (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-surface-border-subtle px-2 py-1 text-[10px] font-medium text-text-secondary transition hover:bg-surface-hover"
              >
                Collapse
              </button>
            ) : null}
          </div>
        </div>
        {model.upgradeRequired ? (
          <div
            className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2"
            data-testid="report-upgrade-banner"
          >
            <p className="text-xs font-semibold text-text-primary">
              Upgrade Required
            </p>
            <p className="text-[11px] text-text-muted">
              Free users may preview this report. Premium sections are blurred and
              exports are hidden.
            </p>
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">
        <ReportNavigationSidebar
          items={model.toc}
          activeId={activeId}
          onNavigate={navigate}
          className="hidden lg:block"
        />

        <div className="space-y-4 px-4 py-4">
          <div className="lg:hidden">
            <ReportNavigationSidebar
              items={model.toc}
              activeId={activeId}
              onNavigate={navigate}
              className="border-r-0 border-b border-surface-border-subtle/80"
            />
          </div>

          <ReportMetricGrid metrics={model.metricCards} />

          <ReportSectionCard
            id="executive_summary"
            heading="Executive Summary"
            locked={sectionById.get("executive_summary")?.locked}
            defaultExpanded
          >
            <ReportExecutiveSummary summary={model.executiveSummary} />
          </ReportSectionCard>

          {model.sections
            .filter((s) => s.id !== "executive_summary")
            .map((section) => (
              <ReportSectionCard
                key={section.id}
                id={section.id}
                heading={section.heading}
                locked={section.locked}
                premium={section.premium}
                defaultExpanded={
                  section.id === "market_summary" ||
                  section.id === "validation_summary" ||
                  section.id === "trust_summary"
                }
              >
                {section.id === "charts" ? (
                  <ReportChartsPanel section={section} />
                ) : (
                  <SectionBody section={section} />
                )}
              </ReportSectionCard>
            ))}

          {portfolioHealth ? (
            <div data-testid="report-portfolio-health">
              <PortfolioHealthCard health={portfolioHealth} />
            </div>
          ) : null}

          <ReportMetadataPanel metadata={model.metadata} />
          <ReportFooter footer={model.footer} />
        </div>
      </div>
    </div>
  );
}

function SectionBody({
  section,
}: {
  section: {
    paragraphs: string[];
    tables?: Array<{ headers: string[]; rows: string[][] }>;
  };
}) {
  return (
    <div className="space-y-2">
      {section.paragraphs.map((p) => (
        <p key={p} className="text-[11px] leading-relaxed text-text-secondary">
          {p}
        </p>
      ))}
      {section.tables?.map((table, ti) => (
        <div key={ti} className="overflow-x-auto">
          <table className="min-w-full text-left text-[10px]">
            <thead>
              <tr className="border-b border-surface-border-subtle">
                {table.headers.map((h) => (
                  <th
                    key={h}
                    className="px-2 py-1 font-medium uppercase tracking-wider text-text-faint"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-surface-border-subtle/40">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 text-text-secondary">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
