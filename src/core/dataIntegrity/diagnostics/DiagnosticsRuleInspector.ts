/**
 * Rule-level inspection for diagnostics (read-only).
 */

export interface RuleInspectionInput {
  ruleId: string;
  name?: string;
  module?: string;
  category?: string;
  priority?: number;
  dependencies?: string[];
  executionOrder?: number;
  executionTimeMs?: number;
  failureCount?: number;
  successCount?: number;
  registered?: boolean;
  enabled?: boolean;
  version?: string;
  metadata?: Record<string, unknown>;
}

export interface RuleInspectionRow {
  ruleId: string;
  name: string;
  module: string;
  category: string;
  priority: number;
  dependencies: string[];
  executionOrder: number;
  executionTimeMs: number;
  failureFrequency: number;
  successRate: number;
  registrationStatus: "REGISTERED" | "UNREGISTERED" | "DISABLED";
  version: string | null;
  metadata: Record<string, unknown>;
}

export interface RuleInspectionResult {
  rules: RuleInspectionRow[];
  registeredCount: number;
  disabledCount: number;
  unregisteredCount: number;
  inspectedAt: string;
  warnings: string[];
  errors: string[];
}

export class DiagnosticsRuleInspector {
  inspectRules(inputs: RuleInspectionInput[]): RuleInspectionResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const rules: RuleInspectionRow[] = [];
    let registeredCount = 0;
    let disabledCount = 0;
    let unregisteredCount = 0;

    try {
      const sorted = [...inputs].sort((a, b) => {
        const orderA = a.executionOrder ?? a.priority ?? 999;
        const orderB = b.executionOrder ?? b.priority ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.ruleId.localeCompare(b.ruleId);
      });

      sorted.forEach((input, index) => {
        try {
          const success = Math.max(0, input.successCount ?? 0);
          const failure = Math.max(0, input.failureCount ?? 0);
          const total = success + failure;
          const successRate =
            total === 0 ? 100 : round2((success / total) * 100);
          const failureFrequency =
            total === 0 ? 0 : round2((failure / total) * 100);

          let registrationStatus: RuleInspectionRow["registrationStatus"] =
            "REGISTERED";
          if (input.registered === false) {
            registrationStatus = "UNREGISTERED";
            unregisteredCount += 1;
            warnings.push(`Rule ${input.ruleId} is not registered.`);
          } else if (input.enabled === false) {
            registrationStatus = "DISABLED";
            disabledCount += 1;
          } else {
            registeredCount += 1;
          }

          rules.push({
            ruleId: input.ruleId,
            name: input.name ?? input.ruleId,
            module: input.module ?? "unknown",
            category: input.category ?? "CUSTOM",
            priority: input.priority ?? index,
            dependencies: [...(input.dependencies ?? [])],
            executionOrder: input.executionOrder ?? index,
            executionTimeMs: input.executionTimeMs ?? 0,
            failureFrequency,
            successRate,
            registrationStatus,
            version: input.version ?? null,
            metadata: { ...(input.metadata ?? {}) },
          });
        } catch (err) {
          errors.push(
            `Failed inspecting rule ${input.ruleId}: ${String(err)}`
          );
        }
      });
    } catch (err) {
      errors.push(`Rule inspection failed: ${String(err)}`);
    }

    return {
      rules,
      registeredCount,
      disabledCount,
      unregisteredCount,
      inspectedAt: new Date().toISOString(),
      warnings,
      errors,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
