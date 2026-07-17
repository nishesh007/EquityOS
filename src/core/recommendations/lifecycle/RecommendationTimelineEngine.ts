/**
 * Append-only lifecycle timeline. Events are permanent and never rewritten.
 */

import type {
  RecommendationLivingState,
  RecommendationTimelineEvent,
  RecommendationTimelineEventType,
} from "./RecommendationLifecycleModels";
import { normalizeTimestamp } from "./RecommendationLifecycleModels";

const STATE_EVENT_TYPE: Partial<
  Record<RecommendationLivingState, RecommendationTimelineEventType>
> = {
  GENERATED: "Recommendation Generated",
  ENTRY_TRIGGERED: "Entry Triggered",
  TARGET_1_HIT: "Target 1 Hit",
  TARGET_2_HIT: "Target 2 Hit",
  STOP_LOSS_HIT: "SL Hit",
  MANUAL_EXIT: "Manual Exit",
  EXITED: "Exited",
  EXPIRED: "Expired",
  ARCHIVED: "Archived",
  INVALIDATED: "Invalidated",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

let eventSequence = 0;

export function timelineEventTypeForState(
  state: RecommendationLivingState
): RecommendationTimelineEventType {
  return STATE_EVENT_TYPE[state] ?? "Status Advanced";
}

export function createTimelineEvent(input: {
  recommendationId: string;
  state: RecommendationLivingState;
  occurredAt?: string | Date;
  note?: string;
  type?: RecommendationTimelineEventType;
}): RecommendationTimelineEvent {
  eventSequence += 1;
  return Object.freeze({
    eventId: `TLE-${Date.now()}-${eventSequence}`,
    recommendationId: input.recommendationId,
    type: input.type ?? timelineEventTypeForState(input.state),
    state: input.state,
    occurredAt: normalizeTimestamp(input.occurredAt),
    note: input.note,
  });
}

export function appendTimelineEvent(
  timeline: readonly RecommendationTimelineEvent[],
  event: RecommendationTimelineEvent
): readonly RecommendationTimelineEvent[] {
  return Object.freeze([...timeline, event]);
}

export class RecommendationTimelineEngine {
  create = createTimelineEvent;
  append = appendTimelineEvent;
  typeForState = timelineEventTypeForState;
}
