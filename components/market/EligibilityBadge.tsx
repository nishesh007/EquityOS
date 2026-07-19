import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";

/**
 * Eligibility + Opportunity Score badges for dashboard / research / watchlist.
 */
export function EligibilityBadge({
  candidate,
  compact = false,
}: {
  candidate: Pick<
    OpportunityCandidate,
    | "pipelineEligible"
    | "eligibilityScore"
    | "opportunityScore"
    | "marketRegime"
    | "marketTrend"
    | "pipelineConfidence"
    | "rejectedReasons"
    | "eligibleReasons"
    | "strategySignal"
  >;
  compact?: boolean;
}) {
  const eligible = candidate.pipelineEligible;
  const score =
    typeof candidate.opportunityScore === "number"
      ? Math.round(candidate.opportunityScore)
      : null;
  const eligibility =
    typeof candidate.eligibilityScore === "number"
      ? Math.round(candidate.eligibilityScore)
      : null;

  if (eligible == null && score == null) {
    return (
      <span
        className="text-[10px] text-text-faint"
        data-testid="eligibility-badge-pending"
      >
        Awaiting Pipeline
      </span>
    );
  }

  const tone =
    eligible === false
      ? "border-loss/30 bg-loss/10 text-loss"
      : eligible === true
        ? "border-gain/30 bg-gain/10 text-gain"
        : "border-surface-border text-text-muted";

  return (
    <div
      className={`flex flex-wrap items-center gap-1 ${compact ? "" : "mt-1"}`}
      data-testid="eligibility-badge"
    >
      <span
        className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${tone}`}
      >
        {eligible === false ? "Rejected" : eligible === true ? "Eligible" : "Pending"}
      </span>
      {score != null && (
        <span className="rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
          Opp {score}
        </span>
      )}
      {eligibility != null && (
        <span className="rounded border border-surface-border-subtle px-1.5 py-0.5 text-[9px] font-medium text-text-muted">
          Elig {eligibility}
        </span>
      )}
      {candidate.marketRegime && !compact && (
        <span className="rounded border border-surface-border-subtle px-1.5 py-0.5 text-[9px] text-text-muted">
          {candidate.marketRegime}
        </span>
      )}
      {typeof candidate.pipelineConfidence === "number" && !compact && (
        <span className="rounded border border-surface-border-subtle px-1.5 py-0.5 text-[9px] text-text-muted">
          Conf {Math.round(candidate.pipelineConfidence)}
        </span>
      )}
      {candidate.strategySignal && (
        <span className="rounded border border-purple-400/30 bg-purple-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300">
          {candidate.strategySignal.strategy} · {candidate.strategySignal.signal}
        </span>
      )}
    </div>
  );
}

export function OpportunityPipelineMeta({
  candidate,
}: {
  candidate: OpportunityCandidate;
}) {
  const reasons =
    candidate.strategySignal?.reasons ??
    (candidate.pipelineEligible === false
      ? candidate.rejectedReasons ?? []
      : candidate.eligibleReasons ?? []);

  if (!candidate.marketRegime && reasons.length === 0) return null;

  return (
    <div className="mt-2 space-y-1" data-testid="opportunity-pipeline-meta">
      <p className="text-[10px] text-text-muted">
        {[candidate.marketTrend, candidate.marketRegime, candidate.riskMode]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {candidate.strategySignal && (
        <p className="text-[10px] text-text-muted">
          {candidate.strategySignal.signal} · Entry{" "}
          {candidate.strategySignal.entry.toFixed(2)} · SL{" "}
          {candidate.strategySignal.stopLoss.toFixed(2)} · Target{" "}
          {candidate.strategySignal.target.toFixed(2)} · RR{" "}
          {candidate.strategySignal.riskReward.toFixed(2)}
        </p>
      )}
      {reasons.slice(0, 2).map((reason) => (
        <p key={reason} className="text-[10px] text-text-faint">
          {reason}
        </p>
      ))}
    </div>
  );
}
