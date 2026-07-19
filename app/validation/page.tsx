import { ExecutiveInstitutionalDashboard } from "@/components/dashboard/institutional/ExecutiveInstitutionalDashboard";
import { InstitutionalReportViewer } from "@/components/dashboard/institutional/InstitutionalReportViewer";
import { InstitutionalPlatformHealthPanel } from "@/components/dashboard/opportunity-intelligence/InstitutionalPlatformHealthPanel";
import { InstitutionalValidationPanel } from "@/components/dashboard/opportunity-intelligence/InstitutionalValidationPanel";
import { MarketIntelligenceStrip } from "@/components/market";
import { ValidationModulesTable } from "@/components/validation/ValidationModulesTable";
import { fetchInstitutionalPlatformSnapshot } from "@/services/institutionalValidationData";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { KpiTile, PageContainer } from "@/src/design";

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

  return (
    <PageContainer>
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">
          Validation Center
        </h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Data integrity, trust and validation platform health — institutional
          read-only view · market regime {marketIntelligence.regime.regime}
        </p>
      </div>

      <section className="mb-6 animate-fade-in-up [animation-delay:40ms]">
        <MarketIntelligenceStrip snapshot={marketIntelligence} />
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
