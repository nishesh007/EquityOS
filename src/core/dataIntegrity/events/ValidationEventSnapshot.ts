/**
 * Point-in-time snapshot of the event bus state for monitoring.
 */

import type { ValidationEvent } from "./ValidationEventTypes";
import type { EventBusHealth } from "./ValidationEventMetrics";
import type { EventBusMetricsSnapshot } from "./ValidationEventMetrics";

export interface ValidationEventSnapshot {
  snapshotId: string;
  timestamp: string;
  recentEvents: ValidationEvent[];
  metrics: EventBusMetricsSnapshot;
  health: EventBusHealth;
  subscriberCount: number;
  queueSize: number;
  engineVersion: string;
}

export function createEventSnapshotId(
  timestamp: string = new Date().toISOString()
): string {
  return `eventbus:${timestamp}`;
}
