/**
 * Dashboard Opportunity Engine empty-state machine.
 * Pure derivation — no fetches, no side effects.
 */

export type OpportunityUiPhase =
  | "initializing"
  | "queued"
  | "running"
  | "available"
  | "empty"
  | "failed";

export interface OpportunityStatusSnapshot {
  isScanning: boolean;
  lastScannedAt: string | null;
  scanCount: number;
  recommendationCount: number;
  /** True after client posted async scan accept (not yet running). */
  scanQueued?: boolean;
  lastError?: string | null;
}

export function deriveOpportunityUiPhase(
  snap: OpportunityStatusSnapshot
): OpportunityUiPhase {
  if (snap.recommendationCount > 0) return "available";
  if (snap.lastError) return "failed";
  if (snap.isScanning) return "running";
  if (snap.scanQueued) return "queued";
  if (snap.lastScannedAt != null || snap.scanCount > 0) return "empty";
  return "initializing";
}

export function opportunityPhaseCopy(phase: OpportunityUiPhase): {
  title: string;
  message: string;
  summary: string;
} {
  switch (phase) {
    case "initializing":
      return {
        title: "Engine initializing",
        message:
          "Strategy Engine is starting up. Opportunities appear after the first scan completes.",
        summary: "Strategy Engine initializing…",
      };
    case "queued":
      return {
        title: "Scan queued",
        message:
          "A background opportunity scan is queued and will start shortly.",
        summary: "Opportunity scan queued…",
      };
    case "running":
      return {
        title: "Scan running",
        message:
          "Opportunity scan is in progress across the eligible universe.",
        summary: "Opportunity scan running…",
      };
    case "available":
      return {
        title: "Recommendations available",
        message: "Active Strategy Engine opportunities are listed below.",
        summary: "Active opportunities available",
      };
    case "failed":
      return {
        title: "Scan failed",
        message:
          "The latest opportunity scan failed. Retry from AI Opportunities or refresh the dashboard.",
        summary: "Opportunity scan failed",
      };
    case "empty":
    default:
      return {
        title: "No active opportunities",
        message:
          "No active Strategy Engine recommendations in the latest completed scan.",
        summary:
          "No active Strategy Engine recommendations in the latest scan.",
      };
  }
}
