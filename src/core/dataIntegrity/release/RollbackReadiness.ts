/**
 * Rollback readiness — evaluates ability to safely reverse a release.
 */

import type { ChecklistResult } from "./ReleaseChecklist";
import type { ReleaseHealthScore } from "./ReleaseMetrics";

export interface RollbackReadinessResult {
  score: number;
  planPresent: boolean;
  snapshotAvailable: boolean;
  ownerAssigned: boolean;
  versionCompatible: boolean;
  ready: boolean;
  warnings: string[];
  errors: string[];
}

export class RollbackReadiness {
  evaluate(input: {
    checklist: ChecklistResult;
    score: ReleaseHealthScore;
    versionCompatible?: boolean;
  }): RollbackReadinessResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const planPresent = hasItem(input.checklist, "rb-plan", true);
      const snapshotAvailable = hasItem(input.checklist, "rb-snapshot", true);
      const ownerAssigned = hasItem(input.checklist, "rb-owner", false);
      const versionCompatible = input.versionCompatible ?? true;

      let score = 40;
      if (planPresent) score += 20;
      if (snapshotAvailable) score += 20;
      if (ownerAssigned) score += 10;
      if (versionCompatible) score += 10;
      score = clamp(
        Math.round(score * (0.7 + input.score.reliability / 300)),
        0,
        100
      );

      if (!planPresent) warnings.push("Rollback plan missing");
      if (!snapshotAvailable) warnings.push("Rollback snapshot unavailable");
      if (!versionCompatible) warnings.push("Version compatibility uncertain");

      return {
        score,
        planPresent,
        snapshotAvailable,
        ownerAssigned,
        versionCompatible,
        ready: score >= 70 && planPresent && snapshotAvailable,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`rollback readiness failed: ${String(err)}`);
      return {
        score: 0,
        planPresent: false,
        snapshotAvailable: false,
        ownerAssigned: false,
        versionCompatible: false,
        ready: false,
        warnings,
        errors,
      };
    }
  }
}

function hasItem(
  checklist: ChecklistResult,
  itemId: string,
  requireCompleted: boolean
): boolean {
  const item = checklist.items.find((i) => i.itemId === itemId);
  if (!item) return false;
  return requireCompleted ? item.completed : true;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
