"use client";

import type { RecommendationDetailContext } from "./types";
import { useInstitutionalTrust } from "./useInstitutionalTrust";
import { useResearchIntelligence } from "./useResearchIntelligence";
import {
  EventsCatalystsSection,
  FinancialQualitySnapshotSection,
  FundamentalSummarySection,
  RelatedResearchSection,
  RiskAnalysisSection,
  TechnicalSummarySection,
  ValuationSummarySection,
} from "./ResearchSummarySections";
import {
  AuditTrailSection,
  ConfidenceEvolutionSection,
  DataQualitySection,
  InvestmentSuitabilitySection,
  RecommendationPerformanceSection,
  RecommendationTimelineSection,
  SimilarHistoricalSetupsSection,
} from "./TrustSummarySections";
import { DrawerBodySkeleton, DrawerErrorState } from "./DrawerStates";

/**
 * Sprint 11A.5 — deferred research + trust body (lazy-loaded).
 * Keeps sections 1–4 interactive while heavier packages hydrate.
 */
export function DeferredResearchAndTrust({
  context,
}: {
  context: RecommendationDetailContext;
}) {
  const {
    view: research,
    loading: researchLoading,
    error: researchError,
    retry: retryResearch,
    dataTransparency,
    researchConfidence,
  } = useResearchIntelligence(context.symbol, context.source, true);

  const {
    view: trust,
    loading: trustLoading,
    error: trustError,
    retry: retryTrust,
  } = useInstitutionalTrust(
    context.symbol,
    context.source,
    { dataTransparency, researchConfidence },
    true
  );

  const researchPending = researchLoading && !researchError;
  const trustPending = trustLoading && !trustError;

  if (researchPending && trustPending) {
    return <DrawerBodySkeleton />;
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {researchError ? (
        <DrawerErrorState
          message="Research summaries could not be loaded."
          onRetry={retryResearch}
        />
      ) : null}
      {trustError ? (
        <DrawerErrorState
          message="Historical validation could not be loaded."
          onRetry={retryTrust}
        />
      ) : null}

      {researchPending ? (
        <DrawerBodySkeleton />
      ) : !researchError ? (
        <>
          <TechnicalSummarySection view={research.technical} />
          <FundamentalSummarySection view={research.fundamental} />
          <ValuationSummarySection view={research.valuation} />
          <RiskAnalysisSection view={research.risk} />
          <EventsCatalystsSection view={research.events} />
          <FinancialQualitySnapshotSection view={research.quality} />
          <RelatedResearchSection view={research.related} />
        </>
      ) : null}

      {trustPending ? (
        <DrawerBodySkeleton />
      ) : !trustError ? (
        <>
          <SimilarHistoricalSetupsSection view={trust.similarSetups} />
          <RecommendationPerformanceSection view={trust.performance} />
          <ConfidenceEvolutionSection view={trust.confidenceEvolution} />
          <RecommendationTimelineSection view={trust.timeline} />
          <AuditTrailSection view={trust.auditTrail} />
          <DataQualitySection view={trust.dataQuality} />
          <InvestmentSuitabilitySection view={trust.suitability} />
        </>
      ) : null}
    </div>
  );
}
