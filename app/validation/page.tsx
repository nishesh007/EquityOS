import { ExecutiveInstitutionalDashboard } from "@/components/dashboard/institutional/ExecutiveInstitutionalDashboard";
import { InstitutionalReportViewer } from "@/components/dashboard/institutional/InstitutionalReportViewer";
import { InstitutionalPlatformHealthPanel } from "@/components/dashboard/opportunity-intelligence/InstitutionalPlatformHealthPanel";
import { InstitutionalValidationPanel } from "@/components/dashboard/opportunity-intelligence/InstitutionalValidationPanel";
import { MarketIntelligenceStrip } from "@/components/market";
import {
  RecommendationValidationPanel,
  SharedRecommendationPanel,
} from "@/components/recommendations";
import { ValidationModulesTable } from "@/components/validation/ValidationModulesTable";
import { fetchInstitutionalPlatformSnapshot } from "@/services/institutionalValidationData";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { fetchSharedRecommendationsFresh } from "@/services/opportunityEngine";
import { KpiTile, PageContainer } from "@/src/design";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Sprint 10C.R4 — dedicated Validation page.
 * All platform validation widgets live here (moved off the main dashboard).
 * Read-only presentation of existing Sprint 9E/9F engine metrics.
 */
export default async function ValidationPage() {
  const [snapshot, marketIntelligence] = await Promise.all([
    fetchInstitutionalPlatformSnapshot(),
    getMarketIntelligenceSnapshot(),
  ]);
  const summary = snapshot.dashboard?.summary ?? null;
  const recommendations = await fetchSharedRecommendationsFresh(8);

  return (
    <PageContainer>
      <div className="mb-6 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400"
          >
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            Research Confidence
          </h1>
        </div>
        <div
          aria-hidden
          className="mt-3 h-px w-full bg-gradient-to-r from-indigo-500/60 via-indigo-500/20 to-transparent"
        />
        <p className="mt-2 text-sm text-text-muted">
          Data integrity, trust and validation platform health — read-only
          view · market regime {marketIntelligence.regime.regime}
        </p>
      </div>

      <section className="mb-6 animate-fade-in-up [animation-delay:40ms]">
        <MarketIntelligenceStrip snapshot={marketIntelligence} />
      </section>
      <section className="mb-6 animate-fade-in-up [animation-delay:50ms]">
        <SharedRecommendationPanel recommendations={recommendations} />
      </section>
      <section className="mb-6 animate-fade-in-up [animation-delay:70ms]">
        <RecommendationValidationPanel recommendations={recommendations} />
      </section>

      {summary && (
        <section className="mb-6 grid grid-cols-2 gap-4 animate-fade-in-up [animation-delay:60ms] md:grid-cols-3 xl:grid-cols-6">
          <KpiTile label="Total Validations" value={String(summary.totalValidations)} />
          <KpiTile label="Passed" value={String(summary.passedValidations)} />
          <KpiTile label="Failed" value={String(summary.failedValidations)} />
          <KpiTile label="Warnings" value={String(summary.warningCount)} />
          <KpiTile label="Critical" value={String(summary.criticalCount)} />
          <KpiTile
            label="Avg Integrity"
            value={`${Math.round(summary.averageIntegrityScore)}%`}
          />
        </section>
      )}

      <section className="mb-6 animate-fade-in-up [animation-delay:120ms]">
        <ValidationModulesTable snapshot={snapshot} />
      </section>

      <section className="space-y-6 animate-fade-in-up [animation-delay:180ms]">
        <ExecutiveInstitutionalDashboard snapshot={snapshot} fetchSnapshot={false} />
        <InstitutionalValidationPanel snapshot={snapshot} />
        <InstitutionalPlatformHealthPanel snapshot={snapshot} />
        <InstitutionalReportViewer
          snapshot={snapshot}
          compact
          title="Validation · Institutional Report"
        />
      </section>
    </PageContainer>
  );
}
