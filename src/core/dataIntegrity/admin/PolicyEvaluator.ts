/**
 * Policy evaluation — eligibility, compatibility, and conflict detection.
 */

import type { AdministrationConfiguration } from "./AdministrationConfiguration";
import type { PolicyDefinition } from "./PolicyRegistry";
import type { GovernanceProfile } from "./PolicyProfiles";
import type { RuleGovernanceState } from "./RuleGovernance";
import type { ModuleGovernanceState } from "./ModuleGovernance";
import type { ActiveOverride } from "./PolicyOverrides";

export interface PolicyEvaluationContext {
  policies: PolicyDefinition[];
  profile: GovernanceProfile;
  rules: RuleGovernanceState[];
  modules: ModuleGovernanceState[];
  overrides: ActiveOverride[];
  activeModuleIds?: string[];
  activeRuleIds?: string[];
}

export interface PolicyConflict {
  code: string;
  severity: "WARNING" | "ERROR";
  message: string;
  policyIds?: string[];
  ruleIds?: string[];
  moduleIds?: string[];
}

export interface PolicyEvaluationResult {
  eligible: boolean;
  ruleEligibility: Record<string, boolean>;
  moduleEligibility: Record<string, boolean>;
  profileCompatible: boolean;
  configurationCompatible: boolean;
  dependencyCompatible: boolean;
  conflicts: PolicyConflict[];
  warnings: string[];
  errors: string[];
  evaluatedAt: string;
}

export class PolicyEvaluator {
  constructor(private config: AdministrationConfiguration) {}

  setConfiguration(config: AdministrationConfiguration): void {
    this.config = config;
  }

  evaluate(context: PolicyEvaluationContext): PolicyEvaluationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const conflicts: PolicyConflict[] = [];
    const ruleEligibility: Record<string, boolean> = {};
    const moduleEligibility: Record<string, boolean> = {};

    try {
      const enabledPolicies = context.policies.filter(
        (p) => p.status === "ENABLED"
      );

      let profileCompatible = true;
      for (const policy of enabledPolicies) {
        if (
          policy.profileIds &&
          policy.profileIds.length > 0 &&
          !policy.profileIds.includes(context.profile.profileId)
        ) {
          profileCompatible = false;
          conflicts.push({
            code: "PROFILE_INCOMPATIBLE",
            severity: "ERROR",
            message: `Policy ${policy.policyId} incompatible with profile ${context.profile.profileId}.`,
            policyIds: [policy.policyId],
          });
        }
      }

      for (const mod of context.modules) {
        let eligible = mod.enabled && !mod.maintenanceMode;
        for (const policy of enabledPolicies) {
          if (policy.rules.forbidModules?.includes(mod.moduleId)) {
            eligible = false;
            conflicts.push({
              code: "MODULE_FORBIDDEN",
              severity: "WARNING",
              message: `Module ${mod.moduleId} forbidden by policy ${policy.policyId}.`,
              policyIds: [policy.policyId],
              moduleIds: [mod.moduleId],
            });
          }
          if (
            policy.rules.requireModules?.includes(mod.moduleId) &&
            !mod.enabled
          ) {
            eligible = false;
            conflicts.push({
              code: "MODULE_REQUIRED_DISABLED",
              severity: "ERROR",
              message: `Required module ${mod.moduleId} is disabled.`,
              policyIds: [policy.policyId],
              moduleIds: [mod.moduleId],
            });
          }
        }
        if (mod.safeMode && context.profile.environment === "production") {
          warnings.push(
            `Module ${mod.moduleId} is in safe mode under production profile.`
          );
        }
        moduleEligibility[mod.moduleId] = eligible;
      }

      for (const rule of context.rules) {
        let eligible =
          rule.enabled &&
          !rule.deprecated &&
          rule.registrationStatus !== "UNREGISTERED";
        for (const policy of enabledPolicies) {
          if (policy.rules.disableRules?.includes(rule.ruleId)) {
            eligible = false;
          }
          if (policy.rules.enableRules?.includes(rule.ruleId)) {
            eligible = rule.enabled;
          }
        }
        const override = context.overrides.find(
          (o) =>
            o.targetType === "RULE" && o.targetId === rule.ruleId && o.active
        );
        if (override?.executionMode === "DISABLED") {
          eligible = false;
        }
        ruleEligibility[rule.ruleId] = eligible;
      }

      const enableSet = new Set<string>();
      const disableSet = new Set<string>();
      for (const policy of enabledPolicies) {
        for (const id of policy.rules.enableRules ?? []) enableSet.add(id);
        for (const id of policy.rules.disableRules ?? []) disableSet.add(id);
      }
      for (const id of enableSet) {
        if (disableSet.has(id)) {
          conflicts.push({
            code: "RULE_ENABLE_DISABLE_CONFLICT",
            severity: "ERROR",
            message: `Rule ${id} is both enabled and disabled by policies.`,
            ruleIds: [id],
          });
        }
      }

      const severityMap = new Map<string, Set<string>>();
      for (const policy of enabledPolicies) {
        for (const [ruleId, severity] of Object.entries(
          policy.rules.severityOverrides ?? {}
        )) {
          const set = severityMap.get(ruleId) ?? new Set();
          set.add(severity);
          severityMap.set(ruleId, set);
        }
      }
      for (const [ruleId, set] of severityMap) {
        if (set.size > 1) {
          conflicts.push({
            code: "SEVERITY_CONFLICT",
            severity: "ERROR",
            message: `Conflicting severity overrides for rule ${ruleId}.`,
            ruleIds: [ruleId],
          });
        }
      }

      let dependencyCompatible = true;
      for (const rule of context.rules) {
        for (const dep of rule.dependencies) {
          const depState = context.rules.find((r) => r.ruleId === dep);
          if (!depState) {
            dependencyCompatible = false;
            conflicts.push({
              code: "MISSING_DEPENDENCY",
              severity: "WARNING",
              message: `Rule ${rule.ruleId} depends on missing rule ${dep}.`,
              ruleIds: [rule.ruleId, dep],
            });
          } else if (!ruleEligibility[dep]) {
            dependencyCompatible = false;
            conflicts.push({
              code: "DISABLED_DEPENDENCY",
              severity: "ERROR",
              message: `Rule ${rule.ruleId} depends on ineligible rule ${dep}.`,
              ruleIds: [rule.ruleId, dep],
            });
          }
        }
      }

      const configurationCompatible = !(
        this.config.strictGovernance &&
        context.profile.environment === "production" &&
        context.profile.strictMode === false
      );

      if (!configurationCompatible) {
        conflicts.push({
          code: "CONFIG_INCOMPATIBLE",
          severity: "WARNING",
          message:
            "Strict governance requires strictMode on production profiles.",
        });
      }

      const errorConflicts = conflicts.filter((c) => c.severity === "ERROR");
      for (const c of conflicts) {
        if (c.severity === "ERROR") errors.push(c.message);
        else warnings.push(c.message);
      }

      const eligible =
        profileCompatible &&
        dependencyCompatible &&
        (this.config.conflictBlocksApply ? errorConflicts.length === 0 : true);

      return {
        eligible,
        ruleEligibility,
        moduleEligibility,
        profileCompatible,
        configurationCompatible,
        dependencyCompatible,
        conflicts,
        warnings,
        errors,
        evaluatedAt: new Date().toISOString(),
      };
    } catch (err) {
      errors.push(`Policy evaluation failed: ${String(err)}`);
      return {
        eligible: false,
        ruleEligibility,
        moduleEligibility,
        profileCompatible: false,
        configurationCompatible: false,
        dependencyCompatible: false,
        conflicts: [
          {
            code: "EVALUATION_FAILURE",
            severity: "ERROR",
            message: String(err),
          },
        ],
        warnings,
        errors,
        evaluatedAt: new Date().toISOString(),
      };
    }
  }
}
