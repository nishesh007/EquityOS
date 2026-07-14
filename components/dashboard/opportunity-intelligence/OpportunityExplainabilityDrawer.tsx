"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";
import type {
  InstitutionalCandidateView,
  InstitutionalPlatformSnapshot,
} from "@/lib/opportunity-engine/institutional-presentation";
import { buildInstitutionalResearchDrawerView } from "@/lib/dashboard/institutional-research-presentation";
import { InstitutionalResearchPanelContent } from "@/components/dashboard/opportunity-intelligence/InstitutionalResearchPanelContent";
import { InstitutionalTrustBadges } from "@/components/dashboard/opportunity-intelligence/InstitutionalTrustBadges";
import { InstitutionalTimelinePanel } from "@/components/dashboard/institutional/InstitutionalTimelinePanel";
import { InstitutionalReportViewer } from "@/components/dashboard/institutional/InstitutionalReportViewer";

/**
 * Institutional Research Panel — expandable recommendation drawer (9F.R3 + history).
 * Reuses existing InstitutionalCandidateView + OpportunityCandidate + platform snapshot.
 */
export function OpportunityExplainabilityDrawer({
  symbol,
  company,
  view,
  candidate = null,
  snapshot = null,
  open,
  onClose,
}: {
  symbol: string;
  company: string;
  view: InstitutionalCandidateView;
  candidate?: OpportunityCandidate | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
  open: boolean;
  onClose: () => void;
}) {
  const research = useMemo(
    () => buildInstitutionalResearchDrawerView(view, candidate),
    [view, candidate]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      data-testid="institutional-research-drawer"
    >
      <button
        type="button"
        aria-label="Close institutional research panel"
        className="h-full flex-1 cursor-default"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-surface-border bg-surface-raised shadow-card">
        <div className="flex items-start justify-between gap-3 border-b border-surface-border-subtle px-4 py-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
              Institutional Research Panel
            </p>
            <p className="text-sm font-semibold text-text-primary">{symbol}</p>
            <p className="text-[11px] text-text-muted">{company}</p>
            <InstitutionalTrustBadges badges={research.badges} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-faint hover:bg-surface-hover hover:text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <InstitutionalResearchPanelContent research={research} />
          <InstitutionalTimelinePanel
            view={view}
            candidate={candidate}
            snapshot={snapshot}
            title="Recommendation History"
          />
          <InstitutionalReportViewer
            snapshot={snapshot}
            candidate={view}
            compact
            title="Research Report"
          />
        </div>
      </aside>
    </div>
  );
}
