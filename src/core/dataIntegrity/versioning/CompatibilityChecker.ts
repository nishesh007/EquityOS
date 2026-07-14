/**
 * Compatibility checker — breaking changes, drift, conflicts, mismatches.
 */

import type { VersionConfiguration } from "./VersionConfiguration";
import type { VersionRecord } from "./VersionRegistry";
import type { VersionComparisonResult } from "./VersionComparator";
import { compareSemver } from "./VersionManager";

export type CompatibilityIssueCode =
  | "BREAKING_CHANGE"
  | "DEPRECATED_API"
  | "REMOVED_RULE"
  | "CONFIGURATION_DRIFT"
  | "SCHEMA_DIFFERENCE"
  | "POLICY_DIFFERENCE"
  | "DEPENDENCY_CONFLICT"
  | "VERSION_MISMATCH";

export interface CompatibilityIssue {
  code: CompatibilityIssueCode;
  severity: "CRITICAL" | "MAJOR" | "MINOR" | "WARNING";
  message: string;
  evidence: string[];
  confidence: number;
}

export interface CompatibilityCheckResult {
  compatible: boolean;
  issues: CompatibilityIssue[];
  compatibilityScore: number;
  warnings: string[];
  errors: string[];
  checkedAt: string;
}

export class CompatibilityChecker {
  constructor(private config: VersionConfiguration) {}

  setConfiguration(config: VersionConfiguration): void {
    this.config = config;
  }

  check(input: {
    from?: VersionRecord;
    to?: VersionRecord;
    comparison?: VersionComparisonResult;
    knownRemovedRules?: string[];
    configDrift?: boolean;
    dependencyConflicts?: string[];
  }): CompatibilityCheckResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const issues: CompatibilityIssue[] = [];

    try {
      const from = input.from;
      const to = input.to;
      const comparison = input.comparison;

      if (comparison?.breakingLikely || (to?.breaking ?? false)) {
        issues.push({
          code: "BREAKING_CHANGE",
          severity: "CRITICAL",
          message: "Breaking change detected between versions.",
          evidence: [
            `from=${comparison?.leftVersion ?? from?.version.raw ?? "?"}`,
            `to=${comparison?.rightVersion ?? to?.version.raw ?? "?"}`,
          ],
          confidence: 0.95,
        });
      }

      if (to?.deprecated || from?.deprecated) {
        issues.push({
          code: "DEPRECATED_API",
          severity: "MAJOR",
          message: "Deprecated API or version in migration path.",
          evidence: [
            `fromDeprecated=${Boolean(from?.deprecated)}`,
            `toDeprecated=${Boolean(to?.deprecated)}`,
          ],
          confidence: 0.9,
        });
      }

      for (const ruleId of input.knownRemovedRules ?? []) {
        issues.push({
          code: "REMOVED_RULE",
          severity: "CRITICAL",
          message: `Rule removed: ${ruleId}`,
          evidence: [`ruleId=${ruleId}`],
          confidence: 0.92,
        });
      }

      if (input.configDrift) {
        issues.push({
          code: "CONFIGURATION_DRIFT",
          severity: "MAJOR",
          message: "Configuration drift detected across versions.",
          evidence: ["configDrift=true"],
          confidence: 0.88,
        });
      }

      if (
        from?.schemaVersion &&
        to?.schemaVersion &&
        from.schemaVersion !== to.schemaVersion
      ) {
        issues.push({
          code: "SCHEMA_DIFFERENCE",
          severity: "MAJOR",
          message: "Schema versions differ.",
          evidence: [
            `fromSchema=${from.schemaVersion}`,
            `toSchema=${to.schemaVersion}`,
          ],
          confidence: 0.9,
        });
      }

      if (from?.kind === "POLICY" && to?.kind === "POLICY") {
        const cmp = compareSemver(from.version, to.version);
        if (cmp !== 0) {
          issues.push({
            code: "POLICY_DIFFERENCE",
            severity: "MINOR",
            message: "Policy versions differ.",
            evidence: [`from=${from.version.raw}`, `to=${to.version.raw}`],
            confidence: 0.85,
          });
        }
      }

      for (const conflict of input.dependencyConflicts ?? []) {
        issues.push({
          code: "DEPENDENCY_CONFLICT",
          severity: "CRITICAL",
          message: `Dependency conflict: ${conflict}`,
          evidence: [conflict],
          confidence: 0.9,
        });
      }

      if (comparison && !comparison.equal && comparison.majorDelta !== 0) {
        issues.push({
          code: "VERSION_MISMATCH",
          severity: "MAJOR",
          message: "Major version mismatch between compared targets.",
          evidence: comparison.differences,
          confidence: 0.87,
        });
      }

      const compatibilityScore = scoreFromIssues(issues);
      const compatible = isCompatible(
        issues,
        compatibilityScore,
        this.config
      );

      if (!compatible) {
        warnings.push("Compatibility check failed institutional thresholds.");
      }

      return {
        compatible,
        issues,
        compatibilityScore,
        warnings,
        errors,
        checkedAt: new Date().toISOString(),
      };
    } catch (err) {
      errors.push(`checkCompatibility failed: ${String(err)}`);
      return {
        compatible: false,
        issues: [],
        compatibilityScore: 0,
        warnings,
        errors,
        checkedAt: new Date().toISOString(),
      };
    }
  }
}

function scoreFromIssues(issues: CompatibilityIssue[]): number {
  if (issues.length === 0) return 100;
  let penalty = 0;
  for (const issue of issues) {
    const base =
      issue.severity === "CRITICAL"
        ? 25
        : issue.severity === "MAJOR"
          ? 15
          : issue.severity === "MINOR"
            ? 8
            : 4;
    penalty += base * issue.confidence;
  }
  return round2(Math.max(0, Math.min(100, 100 - penalty)));
}

function isCompatible(
  issues: CompatibilityIssue[],
  score: number,
  config: VersionConfiguration
): boolean {
  const hasCritical = issues.some((i) => i.severity === "CRITICAL");
  if (config.compatibilityStrictness === "permissive") {
    return score >= 40;
  }
  if (config.compatibilityStrictness === "moderate") {
    return !hasCritical && score >= 60;
  }
  if (config.mode === "relaxed" && config.allowBreakingInRelaxed) {
    return score >= 50;
  }
  return !hasCritical && score >= 75;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
