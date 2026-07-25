import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { InstitutionalCard } from "@/src/design";

export interface RecommendationSectionMeta {
  id: string;
  title: string;
  description: string;
}

/** Sprint 11A.1 placeholder sections — filled in Sprint 11A.2. */
export const RECOMMENDATION_DRAWER_SECTIONS: readonly RecommendationSectionMeta[] =
  [
    {
      id: "executive-summary",
      title: "Executive Summary",
      description:
        "Concise investment thesis and decision snapshot from the research engines.",
    },
    {
      id: "investment-committee-verdict",
      title: "Investment Committee Verdict",
      description:
        "Committee-style consensus, agreement, and publication gate outcome.",
    },
    {
      id: "trade-plan",
      title: "Trade Plan",
      description:
        "Entry, stop, targets, holding period, and risk/reward construction.",
    },
    {
      id: "ai-conviction",
      title: "AI Conviction",
      description:
        "Model conviction, opportunity score, and supporting evidence factors.",
    },
    {
      id: "technical-summary",
      title: "Technical Summary",
      description:
        "Price structure, momentum, and technical framework alignment.",
    },
    {
      id: "fundamental-summary",
      title: "Fundamental Summary",
      description:
        "Quality, growth, and fundamental framework highlights.",
    },
    {
      id: "valuation-summary",
      title: "Valuation Summary",
      description:
        "Relative and absolute valuation context versus peers and history.",
    },
    {
      id: "risk-analysis",
      title: "Risk Analysis",
      description:
        "Downside scenarios, risk mode, and invalidation conditions.",
    },
    {
      id: "catalysts",
      title: "Catalysts",
      description:
        "Near-term and structural catalysts that could reprice the name.",
    },
    {
      id: "historical-validation",
      title: "Historical Validation",
      description:
        "Backtest and historical signal quality for this recommendation style.",
    },
    {
      id: "recommendation-timeline",
      title: "Recommendation Timeline",
      description:
        "Chronology of prior calls, revisions, and outcome tracking.",
    },
  ] as const;

export function RecommendationDrawerSections() {
  return (
    <div className="space-y-3 p-4 md:p-5">
      {RECOMMENDATION_DRAWER_SECTIONS.map((section, index) => (
        <InstitutionalCard
          key={section.id}
          padding="sm"
          className="animate-fade-in"
        >
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">
                  Section {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-0.5 text-sm font-semibold tracking-tight text-text-primary">
                  {section.title}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                  {section.description}
                </p>
              </div>
              <span className="shrink-0 rounded-md border border-surface-border-subtle bg-surface/50 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-text-faint">
                Sprint 11A.2
              </span>
            </div>
            <div
              className="rounded-lg border border-dashed border-surface-border-subtle/80 bg-surface/30 p-3"
              role="status"
              aria-label={`${section.title} loading placeholder`}
            >
              <Skeleton className="mb-2 h-3 w-1/3" />
              <SkeletonText lines={3} />
            </div>
          </div>
        </InstitutionalCard>
      ))}
    </div>
  );
}
