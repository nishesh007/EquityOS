/**
 * Cross-module research integration — public exports (Sprint 10A.R5).
 */

export {
  INTEGRATION_EMPTY,
  TIMELINE_EVENT_KINDS,
  DECISION_KINDS,
  CROSS_MODULE_LINKS,
  emptyTimelineEntry,
  normalizeTimelineEntry,
  emptyDecisionEntry,
  normalizeDecisionEntry,
  emptySnapshot,
  normalizeSnapshot,
  emptyInsights,
  emptyTimelineView,
  emptyDecisionView,
  emptySnapshotTimelineView,
} from "./ResearchIntegrationModels";
export type {
  IntegrationEmptyMessage,
  TimelineEventKind,
  DecisionKind,
  CrossModuleLink,
  ResearchTimelineEntry,
  DecisionJournalEntry,
  ResearchSnapshot,
  ResearchSnapshotPayload,
  SnapshotComparison,
  WorkspaceInsights,
  ResearchTimelineView,
  DecisionJournalView,
  SnapshotTimelineView,
  CrossModuleEventLine,
  CrossModuleEventBag,
} from "./ResearchIntegrationModels";

export {
  recordTimelineEvent,
  getResearchTimeline,
  listTimelineEvents,
  resetResearchTimeline,
  ResearchTimelineEngine,
} from "./ResearchTimelineEngine";

export {
  recordDecision,
  listDecisions,
  getDecisionJournal,
  resetDecisionJournal,
  DecisionJournalEngine,
} from "./DecisionJournalEngine";
export type { RecordDecisionInput } from "./DecisionJournalEngine";

export {
  createSnapshot,
  restoreSnapshot,
  compareSnapshots,
  listSnapshots,
  getSnapshotTimeline,
  resetResearchSnapshots,
  ResearchSnapshotEngine,
} from "./ResearchSnapshotEngine";
export type { CreateSnapshotInput } from "./ResearchSnapshotEngine";

export {
  ingestCrossModuleEvents,
  buildCrossModuleEventBag,
  getCrossModuleLinks,
  resetCrossModuleBridge,
  CrossModuleResearchBridge,
} from "./CrossModuleResearchBridge";
export type { CrossModuleLinkStatus } from "./CrossModuleResearchBridge";

export {
  getWorkspaceInsights,
  resetWorkspaceInsightAggregator,
  WorkspaceInsightAggregator,
} from "./WorkspaceInsightAggregator";
export type { InsightAggregationInput } from "./WorkspaceInsightAggregator";

import { ingestCrossModuleEvents, buildCrossModuleEventBag, resetCrossModuleBridge } from "./CrossModuleResearchBridge";
import { resetResearchTimeline } from "./ResearchTimelineEngine";
import { resetDecisionJournal } from "./DecisionJournalEngine";
import { resetResearchSnapshots } from "./ResearchSnapshotEngine";

export function resetIntegrationEngines(): void {
  resetResearchTimeline();
  resetDecisionJournal();
  resetResearchSnapshots();
  resetCrossModuleBridge();
}

export function syncCrossModuleResearch(input: {
  workspaceId: string;
  ticker?: string | null;
  earningsLines?: string[] | null;
  alertLines?: string[] | null;
  screenerLines?: string[] | null;
  portfolioLines?: string[] | null;
  watchlistLines?: string[] | null;
  opportunityLines?: string[] | null;
  validationLines?: string[] | null;
  trustLines?: string[] | null;
}): ReturnType<typeof ingestCrossModuleEvents> {
  const bag = buildCrossModuleEventBag(input);
  return ingestCrossModuleEvents(bag);
}
