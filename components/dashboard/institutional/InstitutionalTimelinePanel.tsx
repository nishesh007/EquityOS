"use client";

import { useMemo, useState } from "react";
import { History } from "lucide-react";
import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import type {
  InstitutionalCandidateView,
  InstitutionalPlatformSnapshot,
} from "@/lib/opportunity-engine/institutional-presentation";
import {
  buildInstitutionalHistoryView,
  type TimelineFilterSource,
} from "@/lib/dashboard/institutional-history-presentation";
import { TimelineFilterBar } from "@/components/dashboard/institutional/TimelineFilterBar";
import { TimelineEventCard } from "@/components/dashboard/institutional/TimelineEventCard";
import { RecommendationTimeline } from "@/components/dashboard/institutional/RecommendationTimeline";
import { ValidationTimeline } from "@/components/dashboard/institutional/ValidationTimeline";
import { TrustTimeline } from "@/components/dashboard/institutional/TrustTimeline";
import { DecisionAuditPanel } from "@/components/dashboard/institutional/DecisionAuditPanel";
import { ConfidenceHistoryChart } from "@/components/dashboard/institutional/ConfidenceHistoryChart";

export function InstitutionalTimelinePanel({
  view = null,
  candidate = null,
  snapshot = null,
  compact = false,
  title = "Institutional History",
}: {
  view?: InstitutionalCandidateView | null;
  candidate?: OpportunityCandidate | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
  compact?: boolean;
  title?: string;
}) {
  const [filter, setFilter] = useState<TimelineFilterSource>("All");

  const history = useMemo(
    () =>
      buildInstitutionalHistoryView({
        view,
        candidate,
        snapshot,
        filter,
      }),
    [view, candidate, snapshot, filter]
  );

  return (
    <div
      className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="institutional-timeline-panel"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-accent" />
          <p className="text-xs font-semibold text-text-primary">{title}</p>
        </div>
        <TimelineFilterBar value={filter} onChange={setFilter} />
      </div>

      {history.empty ? (
        <p className="text-[11px] text-text-muted">{history.emptyMessage}</p>
      ) : (
        <div className="space-y-4">
          <section>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
              Timeline
            </p>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {history.filtered.map((event) => (
                <TimelineEventCard key={event.id} event={event} />
              ))}
            </div>
          </section>

          {!compact ? (
            <>
              <section>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
                  Recommendation Timeline
                </p>
                <RecommendationTimeline events={history.events} />
              </section>
              <section>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
                  Validation Timeline
                </p>
                <ValidationTimeline events={history.events} />
              </section>
              <section>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
                  Trust Timeline
                </p>
                <TrustTimeline events={history.events} />
              </section>
              <section>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
                  Decision Audit
                </p>
                <DecisionAuditPanel audit={history.audit} />
              </section>
              <section>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
                  Confidence History
                </p>
                <ConfidenceHistoryChart history={history.confidenceHistory} />
              </section>
            </>
          ) : (
            <section>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Decision Audit
              </p>
              <DecisionAuditPanel audit={history.audit} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
