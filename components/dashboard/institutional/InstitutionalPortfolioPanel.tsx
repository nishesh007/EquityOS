"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase } from "lucide-react";
import type { PortfolioDoctorAnalysis, PortfolioSummary } from "@/types";
import type {
  InstitutionalCandidateView,
  InstitutionalPlatformSnapshot,
} from "@/lib/opportunity-engine/institutional-presentation";
import { buildPortfolioDashboard } from "@/lib/dashboard/institutional-portfolio-presentation";
import { PortfolioHealthCard } from "@/components/dashboard/institutional/PortfolioHealthCard";
import { PortfolioValidationPanel } from "@/components/dashboard/institutional/PortfolioValidationPanel";
import { PortfolioTrustPanel } from "@/components/dashboard/institutional/PortfolioTrustPanel";
import { PortfolioRiskPanel } from "@/components/dashboard/institutional/PortfolioRiskPanel";
import { PortfolioDiversificationPanel } from "@/components/dashboard/institutional/PortfolioDiversificationPanel";
import { PortfolioSectorExposure } from "@/components/dashboard/institutional/PortfolioSectorExposure";
import { PortfolioQualityMatrix } from "@/components/dashboard/institutional/PortfolioQualityMatrix";
import { PortfolioHeatmap } from "@/components/dashboard/institutional/PortfolioHeatmap";
import { PortfolioRecommendationPanel } from "@/components/dashboard/institutional/PortfolioRecommendationPanel";
import { PortfolioInstitutionalBadges } from "@/components/dashboard/institutional/PortfolioInstitutionalBadges";
import { InstitutionalReportViewer } from "@/components/dashboard/institutional/InstitutionalReportViewer";

export function InstitutionalPortfolioPanel({
  portfolio = null,
  doctor = null,
  snapshot = null,
  candidate = null,
  compact = false,
  fetchSnapshot = true,
  title = "Institutional Portfolio",
  showReportViewer = true,
  showLegacyRecommendations = false,
}: {
  portfolio?: PortfolioSummary | null;
  doctor?: PortfolioDoctorAnalysis | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
  candidate?: InstitutionalCandidateView | null;
  compact?: boolean;
  fetchSnapshot?: boolean;
  title?: string;
  showReportViewer?: boolean;
  showLegacyRecommendations?: boolean;
}) {
  const [liveSnapshot, setLiveSnapshot] =
    useState<InstitutionalPlatformSnapshot | null>(snapshot);
  const [expanded, setExpanded] = useState(!compact);

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
        /* presentation-only — keep null snapshot */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchSnapshot, snapshot]);

  const view = useMemo(
    () =>
      buildPortfolioDashboard({
        portfolio,
        doctor,
        snapshot: liveSnapshot,
        candidate,
      }),
    [portfolio, doctor, liveSnapshot, candidate]
  );

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/10"
      data-testid="institutional-portfolio-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border-subtle/70 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Briefcase className="h-3.5 w-3.5 text-accent" />
          <p className="text-xs font-semibold text-text-primary">{title}</p>
          <span className="text-[10px] text-text-faint">
            {view.holdingCount} holdings · {view.generatedAt}
          </span>
          <PortfolioInstitutionalBadges badges={view.badges} compact />
        </div>
        {compact ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md border border-surface-border-subtle px-2 py-1 text-[10px] font-medium text-text-secondary hover:bg-surface-hover"
            data-testid="institutional-portfolio-toggle"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        ) : null}
      </div>

      {view.empty && !expanded ? (
        <div className="px-4 py-3">
          <p className="text-[11px] text-text-muted">{view.emptyMessage}</p>
        </div>
      ) : null}

      {expanded ? (
        <div className="space-y-4 px-4 py-4">
          <PortfolioHealthCard health={view.health} />

          {compact ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <PortfolioRiskPanel risk={view.risk} />
              {showLegacyRecommendations ? (
                <PortfolioRecommendationPanel recommendations={view.recommendations} />
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-2">
                <PortfolioValidationPanel validation={view.validation} />
                <PortfolioTrustPanel trust={view.trust} />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <PortfolioRiskPanel risk={view.risk} />
                <PortfolioDiversificationPanel diversification={view.diversification} />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <PortfolioSectorExposure diversification={view.diversification} />
                <PortfolioHeatmap cells={view.heatmap} />
              </div>
              <PortfolioQualityMatrix rows={view.qualityMatrix} />
              {showLegacyRecommendations ? (
                <PortfolioRecommendationPanel recommendations={view.recommendations} />
              ) : null}
              {showReportViewer ? (
                <InstitutionalReportViewer
                  snapshot={liveSnapshot}
                  candidate={candidate}
                  compact
                  title="Portfolio · Institutional Report"
                />
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="px-4 py-3">
          <PortfolioHealthCard health={view.health} />
        </div>
      )}
    </div>
  );
}
