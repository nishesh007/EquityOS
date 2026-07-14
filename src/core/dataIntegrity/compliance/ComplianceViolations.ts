/**
 * Compliance violation model and severity helpers.
 */

import type { ComplianceDomain } from "./ComplianceRuleBook";

export type ComplianceViolationSeverity =
  | "CRITICAL"
  | "MAJOR"
  | "MINOR"
  | "WARNING"
  | "RECOMMENDATION";

export interface ComplianceViolation {
  violationId: string;
  ruleId: string;
  title: string;
  domain: ComplianceDomain;
  severity: ComplianceViolationSeverity;
  evidence: string[];
  affectedModules: string[];
  suggestedResolution: string;
  confidence: number;
  detectedAt: string;
}

const SEVERITY_RANK: Record<ComplianceViolationSeverity, number> = {
  CRITICAL: 5,
  MAJOR: 4,
  MINOR: 3,
  WARNING: 2,
  RECOMMENDATION: 1,
};

export function severityRank(
  severity: ComplianceViolationSeverity
): number {
  return SEVERITY_RANK[severity];
}

export function tierToSeverity(
  tier: "MANDATORY" | "RECOMMENDED" | "OPTIONAL"
): ComplianceViolationSeverity {
  if (tier === "MANDATORY") return "CRITICAL";
  if (tier === "RECOMMENDED") return "MAJOR";
  return "WARNING";
}

export function meetsSeverityThreshold(
  severity: ComplianceViolationSeverity,
  threshold: ComplianceViolationSeverity
): boolean {
  return severityRank(severity) >= severityRank(threshold);
}

export function createViolationId(ruleId: string): string {
  return `cv:${ruleId}:${Math.random().toString(36).slice(2, 8)}`;
}

export class ComplianceViolations {
  private violations: ComplianceViolation[] = [];
  private maxViolations: number;

  constructor(maxViolations: number) {
    this.maxViolations = maxViolations;
  }

  setMaxViolations(n: number): void {
    this.maxViolations = n;
  }

  add(violation: ComplianceViolation): void {
    this.violations.push(violation);
    if (this.violations.length > this.maxViolations) {
      this.violations = this.violations
        .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
        .slice(0, this.maxViolations);
    }
  }

  addAll(items: ComplianceViolation[]): void {
    for (const item of items) this.add(item);
  }

  list(): ComplianceViolation[] {
    return [...this.violations].sort(
      (a, b) => severityRank(b.severity) - severityRank(a.severity)
    );
  }

  criticalCount(): number {
    return this.violations.filter((v) => v.severity === "CRITICAL").length;
  }

  clear(): void {
    this.violations = [];
  }

  get size(): number {
    return this.violations.length;
  }
}
