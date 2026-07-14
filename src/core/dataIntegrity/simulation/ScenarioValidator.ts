/**
 * Scenario validator — validates scenario definitions before sandbox execution.
 */

import type { ScenarioDefinition } from "./ScenarioBuilder";

export interface ScenarioValidationIssue {
  code:
    | "MISSING_ID"
    | "INVALID_RANGE"
    | "MISSING_MODULES"
    | "SANDBOX_VIOLATION"
    | "CONFIGURATION";
  message: string;
  severity: "error" | "warning";
}

export interface ScenarioValidationResult {
  valid: boolean;
  issues: ScenarioValidationIssue[];
  warnings: string[];
  errors: string[];
}

export class ScenarioValidator {
  validate(
    scenario: ScenarioDefinition,
    options?: { sandboxOnly?: boolean; maxScenarios?: number }
  ): ScenarioValidationResult {
    const issues: ScenarioValidationIssue[] = [];
    try {
      if (!scenario.scenarioId?.trim()) {
        issues.push({
          code: "MISSING_ID",
          message: "scenarioId is required",
          severity: "error",
        });
      }
      if (!scenario.modules?.length) {
        issues.push({
          code: "MISSING_MODULES",
          message: "At least one module is required",
          severity: "error",
        });
      }
      for (const [key, value] of Object.entries({
        volatility: scenario.volatility,
        liquidity: scenario.liquidity,
        configurationDrift: scenario.configurationDrift,
        ruleChangeIntensity: scenario.ruleChangeIntensity,
        expectedFailureRate: scenario.expectedFailureRate,
      })) {
        if (value < 0 || value > 1) {
          issues.push({
            code: "INVALID_RANGE",
            message: `${key} must be between 0 and 1`,
            severity: "error",
          });
        }
      }
      if (scenario.marketShock < -1 || scenario.marketShock > 1) {
        issues.push({
          code: "INVALID_RANGE",
          message: "marketShock must be between -1 and 1",
          severity: "error",
        });
      }
      if (options?.sandboxOnly === false) {
        issues.push({
          code: "SANDBOX_VIOLATION",
          message: "Simulation engine requires sandboxOnly=true",
          severity: "error",
        });
      }
      if (
        options?.maxScenarios !== undefined &&
        options.maxScenarios < 1
      ) {
        issues.push({
          code: "CONFIGURATION",
          message: "maxScenarios must be >= 1",
          severity: "warning",
        });
      }
    } catch (err) {
      issues.push({
        code: "CONFIGURATION",
        message: `scenario validation failed: ${String(err)}`,
        severity: "error",
      });
    }

    const errors = issues
      .filter((i) => i.severity === "error")
      .map((i) => i.message);
    const warnings = issues
      .filter((i) => i.severity === "warning")
      .map((i) => i.message);

    return {
      valid: errors.length === 0,
      issues,
      warnings,
      errors,
    };
  }
}
