/**
 * Versioned compliance rule book — mandatory, recommended, optional rules and profiles.
 */

import type { ComplianceProfileId } from "./ComplianceConfiguration";

export type ComplianceRuleTier = "MANDATORY" | "RECOMMENDED" | "OPTIONAL";

export type ComplianceDomain =
  | "VALIDATION_GOVERNANCE"
  | "POLICY_COMPLIANCE"
  | "CONFIGURATION_COMPLIANCE"
  | "AUDIT_COMPLIANCE"
  | "EXECUTION_COMPLIANCE"
  | "RELIABILITY_COMPLIANCE"
  | "OBSERVABILITY_COMPLIANCE"
  | "SECURITY_READINESS"
  | "OPERATIONAL_READINESS"
  | "INSTITUTIONAL_STANDARDS";

export interface ComplianceRuleDefinition {
  ruleId: string;
  title: string;
  description: string;
  domain: ComplianceDomain;
  tier: ComplianceRuleTier;
  profiles: ComplianceProfileId[];
  /** Observation field checked for boolean truthiness or numeric thresholds */
  check: ComplianceRuleCheck;
  suggestedResolution: string;
}

export type ComplianceRuleCheck =
  | { kind: "flag"; field: keyof ComplianceObservationFields; expect: boolean }
  | {
      kind: "min";
      field: keyof ComplianceObservationFields;
      min: number;
    }
  | {
      kind: "max";
      field: keyof ComplianceObservationFields;
      max: number;
    }
  | {
      kind: "present";
      field: keyof ComplianceObservationFields;
    }
  | {
      kind: "versionsMatch";
      actualField: "configVersion";
      expectedField: "expectedConfigVersion";
    }
  | { kind: "custom"; evaluatorId: string };

/** Narrow field map used by rule checks (mirrors ComplianceObservation numerics/flags). */
export interface ComplianceObservationFields {
  policiesPresent?: number;
  policiesEnabled?: number;
  criticalRulesDisabled?: number;
  rulesEnabled?: number;
  rulesTotal?: number;
  auditEnabled?: boolean;
  monitoringEnabled?: boolean;
  reportingEnabled?: boolean;
  diagnosticsEnabled?: boolean;
  configVersion?: string;
  expectedConfigVersion?: string;
  configurationDrift?: boolean;
  healthScore?: number;
  reliabilityScore?: number;
  observabilityScore?: number;
  trustScore?: number;
  availability?: number;
  dependencyOk?: boolean;
  versionMismatch?: boolean;
  auditGap?: boolean;
  monitoringGap?: boolean;
  reportingGap?: boolean;
  governanceViolation?: boolean;
}

export interface ComplianceRuleBook {
  version: string;
  name: string;
  profileId: ComplianceProfileId;
  rules: ComplianceRuleDefinition[];
}

const BUILTIN_RULES: ComplianceRuleDefinition[] = [
  {
    ruleId: "pol-policies-present",
    title: "Policies must be registered",
    description: "At least one governance policy must be present.",
    domain: "POLICY_COMPLIANCE",
    tier: "MANDATORY",
    profiles: ["institutional", "production", "research", "staging", "development"],
    check: { kind: "min", field: "policiesPresent", min: 1 },
    suggestedResolution: "Register baseline governance policies via Administration Engine.",
  },
  {
    ruleId: "pol-policies-enabled",
    title: "Policies must be enabled",
    description: "Enabled policies must cover the active profile.",
    domain: "POLICY_COMPLIANCE",
    tier: "MANDATORY",
    profiles: ["institutional", "production", "research"],
    check: { kind: "min", field: "policiesEnabled", min: 1 },
    suggestedResolution: "Enable required policies for the active compliance profile.",
  },
  {
    ruleId: "gov-no-critical-disabled",
    title: "Critical rules must not be disabled",
    description: "Disabled critical validation rules violate governance standards.",
    domain: "VALIDATION_GOVERNANCE",
    tier: "MANDATORY",
    profiles: ["institutional", "production", "staging"],
    check: { kind: "max", field: "criticalRulesDisabled", max: 0 },
    suggestedResolution: "Re-enable critical rules or obtain governance approval for overrides.",
  },
  {
    ruleId: "gov-no-governance-violation",
    title: "No active governance violations",
    description: "Governance violation flags must be clear.",
    domain: "VALIDATION_GOVERNANCE",
    tier: "MANDATORY",
    profiles: ["institutional", "production"],
    check: { kind: "flag", field: "governanceViolation", expect: false },
    suggestedResolution: "Resolve administration policy conflicts and re-evaluate governance.",
  },
  {
    ruleId: "cfg-no-drift",
    title: "Configuration must not drift",
    description: "Configuration drift indicates non-compliant operational state.",
    domain: "CONFIGURATION_COMPLIANCE",
    tier: "MANDATORY",
    profiles: ["institutional", "production", "staging"],
    check: { kind: "flag", field: "configurationDrift", expect: false },
    suggestedResolution: "Align runtime configuration with approved configuration profiles.",
  },
  {
    ruleId: "cfg-version-match",
    title: "Configuration versions must match",
    description: "Actual and expected configuration versions must align.",
    domain: "CONFIGURATION_COMPLIANCE",
    tier: "RECOMMENDED",
    profiles: ["institutional", "production", "research", "staging"],
    check: {
      kind: "versionsMatch",
      actualField: "configVersion",
      expectedField: "expectedConfigVersion",
    },
    suggestedResolution: "Upgrade or pin configuration to the approved version.",
  },
  {
    ruleId: "aud-audit-enabled",
    title: "Audit logging must be enabled",
    description: "Audit coverage is required for institutional readiness.",
    domain: "AUDIT_COMPLIANCE",
    tier: "MANDATORY",
    profiles: ["institutional", "production"],
    check: { kind: "flag", field: "auditEnabled", expect: true },
    suggestedResolution: "Enable audit logging across validation control-plane modules.",
  },
  {
    ruleId: "aud-no-audit-gap",
    title: "No audit gaps",
    description: "Audit gaps reduce compliance and forensic readiness.",
    domain: "AUDIT_COMPLIANCE",
    tier: "RECOMMENDED",
    profiles: ["institutional", "production", "research"],
    check: { kind: "flag", field: "auditGap", expect: false },
    suggestedResolution: "Close audit gaps identified by compliance and administration engines.",
  },
  {
    ruleId: "obs-monitoring-enabled",
    title: "Monitoring must be enabled",
    description: "Observability monitoring is required for operational readiness.",
    domain: "OBSERVABILITY_COMPLIANCE",
    tier: "MANDATORY",
    profiles: ["institutional", "production", "staging"],
    check: { kind: "flag", field: "monitoringEnabled", expect: true },
    suggestedResolution: "Enable observability / telemetry collectors for validation modules.",
  },
  {
    ruleId: "obs-no-monitoring-gap",
    title: "No monitoring gaps",
    description: "Monitoring gaps indicate incomplete observability coverage.",
    domain: "OBSERVABILITY_COMPLIANCE",
    tier: "RECOMMENDED",
    profiles: ["institutional", "production", "research"],
    check: { kind: "flag", field: "monitoringGap", expect: false },
    suggestedResolution: "Extend monitoring coverage to uncovered validation modules.",
  },
  {
    ruleId: "rep-reporting-enabled",
    title: "Reporting must be available",
    description: "Reporting coverage supports audit and governance evidence.",
    domain: "AUDIT_COMPLIANCE",
    tier: "RECOMMENDED",
    profiles: ["institutional", "production", "research"],
    check: { kind: "flag", field: "reportingEnabled", expect: true },
    suggestedResolution: "Enable Validation Reporting Engine exports for compliance evidence.",
  },
  {
    ruleId: "rep-no-reporting-gap",
    title: "No reporting gaps",
    description: "Reporting gaps reduce institutional evidence quality.",
    domain: "INSTITUTIONAL_STANDARDS",
    tier: "OPTIONAL",
    profiles: ["institutional", "production"],
    check: { kind: "flag", field: "reportingGap", expect: false },
    suggestedResolution: "Generate periodic compliance and governance reports.",
  },
  {
    ruleId: "rel-reliability-score",
    title: "Reliability score threshold",
    description: "Reliability score must meet institutional readiness bar.",
    domain: "RELIABILITY_COMPLIANCE",
    tier: "RECOMMENDED",
    profiles: ["institutional", "production", "staging"],
    check: { kind: "min", field: "reliabilityScore", min: 70 },
    suggestedResolution: "Improve retry/timeout/circuit-breaker posture via Reliability Engine.",
  },
  {
    ruleId: "ops-health-score",
    title: "Operational health threshold",
    description: "Module health must meet operational readiness standards.",
    domain: "OPERATIONAL_READINESS",
    tier: "RECOMMENDED",
    profiles: ["institutional", "production", "research", "staging"],
    check: { kind: "min", field: "healthScore", min: 70 },
    suggestedResolution: "Investigate unhealthy modules via Diagnostics and Observability engines.",
  },
  {
    ruleId: "ops-availability",
    title: "Availability threshold",
    description: "Availability must meet institutional operational standards.",
    domain: "OPERATIONAL_READINESS",
    tier: "RECOMMENDED",
    profiles: ["institutional", "production"],
    check: { kind: "min", field: "availability", min: 95 },
    suggestedResolution: "Address availability regressions through reliability remediation.",
  },
  {
    ruleId: "sec-trust-score",
    title: "Trust score threshold",
    description: "Trust score supports security and institutional readiness.",
    domain: "SECURITY_READINESS",
    tier: "RECOMMENDED",
    profiles: ["institutional", "production", "research"],
    check: { kind: "min", field: "trustScore", min: 70 },
    suggestedResolution: "Improve trust posture via Trust Engine remediation guidance.",
  },
  {
    ruleId: "dep-ok",
    title: "Dependencies must be healthy",
    description: "Dependency violations indicate incomplete platform readiness.",
    domain: "EXECUTION_COMPLIANCE",
    tier: "MANDATORY",
    profiles: ["institutional", "production", "staging"],
    check: { kind: "flag", field: "dependencyOk", expect: true },
    suggestedResolution: "Resolve missing or failed validation module dependencies.",
  },
  {
    ruleId: "ver-no-mismatch",
    title: "No version mismatches",
    description: "Module version mismatches violate institutional standards.",
    domain: "INSTITUTIONAL_STANDARDS",
    tier: "RECOMMENDED",
    profiles: ["institutional", "production"],
    check: { kind: "flag", field: "versionMismatch", expect: false },
    suggestedResolution: "Align module versions to the approved institutional platform set.",
  },
  {
    ruleId: "exe-diagnostics-enabled",
    title: "Diagnostics readiness",
    description: "Diagnostics should be available for execution compliance.",
    domain: "EXECUTION_COMPLIANCE",
    tier: "OPTIONAL",
    profiles: ["institutional", "production", "research", "staging", "development"],
    check: { kind: "flag", field: "diagnosticsEnabled", expect: true },
    suggestedResolution: "Ensure Diagnostics Engine registration and collectors are active.",
  },
  {
    ruleId: "obs-observability-score",
    title: "Observability score threshold",
    description: "Observability score must meet monitoring coverage standards.",
    domain: "OBSERVABILITY_COMPLIANCE",
    tier: "OPTIONAL",
    profiles: ["institutional", "production"],
    check: { kind: "min", field: "observabilityScore", min: 70 },
    suggestedResolution: "Improve telemetry coverage and collection health.",
  },
];

export class ComplianceRuleBookStore {
  private books = new Map<string, ComplianceRuleBook>();
  private customRules: ComplianceRuleDefinition[] = [];

  constructor() {
    this.seedBuiltinBooks();
  }

  private seedBuiltinBooks(): void {
    const profiles: ComplianceProfileId[] = [
      "institutional",
      "research",
      "production",
      "staging",
      "development",
    ];
    for (const profileId of profiles) {
      const version = "1.0.0";
      const key = `${profileId}@${version}`;
      this.books.set(key, {
        version,
        name: `${profileId} compliance rule book`,
        profileId,
        rules: BUILTIN_RULES.filter((r) => r.profiles.includes(profileId)),
      });
    }
  }

  getBook(
    profileId: ComplianceProfileId,
    version: string
  ): ComplianceRuleBook | null {
    const book = this.books.get(`${profileId}@${version}`);
    if (!book) return null;
    return {
      ...book,
      rules: [...book.rules, ...this.customRules.filter((r) =>
        r.profiles.includes(profileId)
      )],
    };
  }

  listBooks(): ComplianceRuleBook[] {
    return [...this.books.values()].map((b) => ({
      ...b,
      rules: [...b.rules],
    }));
  }

  registerCustomRule(rule: ComplianceRuleDefinition): void {
    this.customRules = [
      ...this.customRules.filter((r) => r.ruleId !== rule.ruleId),
      rule,
    ];
  }

  registerCustomRuleSet(
    book: ComplianceRuleBook,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    const key = `${book.profileId}@${book.version}`;
    if (this.books.has(key) && !options?.force) {
      return { registered: false, skipped: true };
    }
    this.books.set(key, {
      ...book,
      rules: [...book.rules],
    });
    return { registered: true, skipped: false };
  }

  reset(): void {
    this.books.clear();
    this.customRules = [];
    this.seedBuiltinBooks();
  }
}

export function getBuiltinComplianceRules(): ComplianceRuleDefinition[] {
  return BUILTIN_RULES.map((r) => ({ ...r, profiles: [...r.profiles] }));
}
