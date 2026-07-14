/**
 * Temporary, auditable governance overrides.
 */

import type { AdministrationConfiguration } from "./AdministrationConfiguration";
import type { ApprovalStatus } from "./AdministrationConfiguration";

export type OverrideTargetType = "RULE" | "MODULE" | "POLICY" | "PROFILE";

export type OverrideExecutionMode =
  | "SEQUENTIAL"
  | "PARALLEL"
  | "CONDITIONAL"
  | "DISABLED"
  | "CUSTOM"
  | (string & {});

export interface ActiveOverride {
  overrideId: string;
  targetType: OverrideTargetType;
  targetId: string;
  severity?: string;
  priority?: number;
  threshold?: number;
  executionMode?: OverrideExecutionMode;
  retryCount?: number;
  timeoutMs?: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  createdBy?: string;
  reason?: string;
  approvalStatus: ApprovalStatus;
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
}

export interface ApplyOverrideInput {
  targetType: OverrideTargetType;
  targetId: string;
  severity?: string;
  priority?: number;
  threshold?: number;
  executionMode?: OverrideExecutionMode;
  retryCount?: number;
  timeoutMs?: number;
  ttlMs?: number;
  createdBy?: string;
  reason?: string;
  approvalStatus?: ApprovalStatus;
  previousValues?: Record<string, unknown>;
}

export class PolicyOverrides {
  private readonly overrides = new Map<string, ActiveOverride>();

  constructor(private config: AdministrationConfiguration) {}

  setConfiguration(config: AdministrationConfiguration): void {
    this.config = config;
  }

  applyOverride(input: ApplyOverrideInput): {
    ok: boolean;
    override: ActiveOverride | null;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      this.expireOverrides();
      if (this.listActive().length >= this.config.maxOverrides) {
        errors.push(`Override limit reached (${this.config.maxOverrides}).`);
        return { ok: false, override: null, warnings, errors };
      }

      if (
        input.timeoutMs != null &&
        input.timeoutMs < 0
      ) {
        errors.push("Invalid timeout override.");
        return { ok: false, override: null, warnings, errors };
      }
      if (input.retryCount != null && input.retryCount < 0) {
        errors.push("Invalid retry count override.");
        return { ok: false, override: null, warnings, errors };
      }

      let approval: ApprovalStatus = "NOT_REQUIRED";
      if (this.config.approvalRequired) {
        approval =
          input.approvalStatus === "APPROVED" ||
          input.approvalStatus === "AUTO_APPROVED"
            ? input.approvalStatus
            : input.approvalStatus === "REJECTED"
              ? "REJECTED"
              : "PENDING";
        if (approval === "REJECTED") {
          errors.push("Override rejected by approval gate.");
          return { ok: false, override: null, warnings, errors };
        }
        if (approval === "PENDING") {
          warnings.push("Override pending approval; stored inactive.");
        }
      }

      const ttl = input.ttlMs ?? this.config.overrideDefaultTtlMs;
      const now = Date.now();
      const newValues: Record<string, unknown> = {};
      if (input.severity !== undefined) newValues.severity = input.severity;
      if (input.priority !== undefined) newValues.priority = input.priority;
      if (input.threshold !== undefined) newValues.threshold = input.threshold;
      if (input.executionMode !== undefined)
        newValues.executionMode = input.executionMode;
      if (input.retryCount !== undefined) newValues.retryCount = input.retryCount;
      if (input.timeoutMs !== undefined) newValues.timeoutMs = input.timeoutMs;

      const override: ActiveOverride = {
        overrideId: `ovr:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
        targetType: input.targetType,
        targetId: input.targetId,
        severity: input.severity,
        priority: input.priority,
        threshold: input.threshold,
        executionMode: input.executionMode,
        retryCount: input.retryCount,
        timeoutMs: input.timeoutMs,
        active: approval !== "PENDING",
        expiresAt: ttl > 0 ? new Date(now + ttl).toISOString() : null,
        createdAt: new Date().toISOString(),
        createdBy: input.createdBy,
        reason: input.reason,
        approvalStatus: approval,
        previousValues: { ...(input.previousValues ?? {}) },
        newValues,
      };

      this.overrides.set(override.overrideId, override);
      return { ok: true, override: { ...override }, warnings, errors };
    } catch (err) {
      errors.push(`Apply override failed: ${String(err)}`);
      return { ok: false, override: null, warnings, errors };
    }
  }

  clearOverride(overrideId: string): boolean {
    return this.overrides.delete(overrideId);
  }

  listActive(): ActiveOverride[] {
    this.expireOverrides();
    return [...this.overrides.values()]
      .filter((o) => o.active)
      .map((o) => ({ ...o, previousValues: { ...o.previousValues }, newValues: { ...o.newValues } }));
  }

  listAll(): ActiveOverride[] {
    this.expireOverrides();
    return [...this.overrides.values()].map((o) => ({
      ...o,
      previousValues: { ...o.previousValues },
      newValues: { ...o.newValues },
    }));
  }

  reset(): void {
    this.overrides.clear();
  }

  private expireOverrides(): void {
    const now = Date.now();
    for (const override of this.overrides.values()) {
      if (
        override.expiresAt &&
        new Date(override.expiresAt).getTime() <= now
      ) {
        override.active = false;
      }
    }
  }
}
