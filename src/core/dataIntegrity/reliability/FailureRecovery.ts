/**
 * Failure recovery — automatic / fallback / partial / dependency / pipeline / cache / config.
 */

import type { ReliabilityConfiguration } from "./ReliabilityConfiguration";
import type { FailureKind, ReliabilityProbe } from "./ReliabilityRegistry";

export type RecoveryTargetType =
  | "ENGINE"
  | "DEPENDENCY"
  | "PIPELINE"
  | "CACHE"
  | "CONFIGURATION"
  | "PLATFORM";

export interface FailureRecord {
  failureId: string;
  targetType: RecoveryTargetType;
  targetId: string;
  failureKind: FailureKind;
  message: string;
  at: string;
  recovered: boolean;
  recoveredAt?: string;
}

export interface RecoveryResult {
  ok: boolean;
  recoveryId: string;
  targetType: RecoveryTargetType;
  targetId: string;
  strategy: string;
  recovered: boolean;
  partial: boolean;
  fallbackUsed: boolean;
  durationMs: number;
  warnings: string[];
  errors: string[];
}

export class FailureRecovery {
  private readonly failures: FailureRecord[] = [];
  private readonly recoveries: RecoveryResult[] = [];
  private recoverySuccesses = 0;
  private recoveryAttempts = 0;
  private recoveryTimeSum = 0;

  constructor(private config: ReliabilityConfiguration) {}

  setConfiguration(config: ReliabilityConfiguration): void {
    this.config = config;
  }

  recordFailure(input: {
    targetType: RecoveryTargetType;
    targetId: string;
    failureKind?: FailureKind;
    message?: string;
  }): FailureRecord {
    const record: FailureRecord = {
      failureId: `fail:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
      targetType: input.targetType,
      targetId: input.targetId,
      failureKind: input.failureKind ?? "UNKNOWN",
      message: input.message ?? "Infrastructure failure",
      at: new Date().toISOString(),
      recovered: false,
    };
    this.failures.push(record);
    if (this.failures.length > this.config.maxFailureHistory) {
      this.failures.splice(0, this.failures.length - this.config.maxFailureHistory);
    }
    return { ...record };
  }

  runRecovery(input: {
    targetType: RecoveryTargetType;
    targetId: string;
    failureKind?: FailureKind;
    probes?: ReliabilityProbe[];
  }): RecoveryResult {
    const started = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    this.recoveryAttempts += 1;

    try {
      const failure = this.recordFailure({
        targetType: input.targetType,
        targetId: input.targetId,
        failureKind: input.failureKind,
      });

      let strategy = "automatic";
      let recovered = false;
      let partial = false;
      let fallbackUsed = false;

      switch (this.config.recoveryPolicy) {
        case "AUTOMATIC":
          strategy = this.resolveAutomaticStrategy(input.targetType);
          recovered = true;
          break;
        case "FALLBACK":
          strategy = "fallback-execution";
          recovered = true;
          fallbackUsed = true;
          warnings.push("Fallback execution path engaged (advisory).");
          break;
        case "PARTIAL":
          strategy = "partial-recovery";
          recovered = true;
          partial = true;
          warnings.push("Partial recovery applied; some subsystems remain degraded.");
          break;
        case "MANUAL":
          strategy = "manual-required";
          recovered = false;
          warnings.push("Manual recovery policy — automatic recovery skipped.");
          break;
        default:
          strategy = "automatic";
          recovered = true;
      }

      // Dependency / pipeline / cache / configuration specific notes
      if (input.targetType === "DEPENDENCY") {
        strategy = "dependency-recovery";
        recovered = this.config.recoveryPolicy !== "MANUAL";
      } else if (input.targetType === "PIPELINE") {
        strategy = "pipeline-recovery";
        recovered = this.config.recoveryPolicy !== "MANUAL";
      } else if (input.targetType === "CACHE") {
        strategy = "cache-recovery";
        recovered = this.config.recoveryPolicy !== "MANUAL";
      } else if (input.targetType === "CONFIGURATION") {
        strategy = "configuration-recovery";
        recovered = this.config.recoveryPolicy !== "MANUAL";
        if (recovered) {
          warnings.push("Configuration restored to last known good snapshot (advisory).");
        }
      }

      if (input.probes?.some((p) => p.critical && p.available === false)) {
        partial = true;
        warnings.push("Critical probe still unavailable after recovery attempt.");
      }

      failure.recovered = recovered;
      if (recovered) failure.recoveredAt = new Date().toISOString();

      const durationMs = Date.now() - started;
      if (recovered) {
        this.recoverySuccesses += 1;
        this.recoveryTimeSum += durationMs;
      }

      const result: RecoveryResult = {
        ok: recovered,
        recoveryId: `recov:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
        targetType: input.targetType,
        targetId: input.targetId,
        strategy,
        recovered,
        partial,
        fallbackUsed,
        durationMs,
        warnings,
        errors,
      };
      this.recoveries.push(result);
      if (this.recoveries.length > this.config.maxFailureHistory) {
        this.recoveries.splice(
          0,
          this.recoveries.length - this.config.maxFailureHistory
        );
      }
      return { ...result };
    } catch (err) {
      errors.push(`Recovery failed: ${String(err)}`);
      return {
        ok: false,
        recoveryId: `recov:error:${Math.random().toString(36).slice(2, 8)}`,
        targetType: input.targetType,
        targetId: input.targetId,
        strategy: "failed",
        recovered: false,
        partial: false,
        fallbackUsed: false,
        durationMs: Date.now() - started,
        warnings,
        errors,
      };
    }
  }

  getRecoveryRate(): number {
    if (this.recoveryAttempts === 0) return 100;
    return round2((this.recoverySuccesses / this.recoveryAttempts) * 100);
  }

  getAverageRecoveryTime(): number {
    if (this.recoverySuccesses === 0) return 0;
    return round2(this.recoveryTimeSum / this.recoverySuccesses);
  }

  getFailureHistory(limit?: number): FailureRecord[] {
    if (limit === undefined) return this.failures.map((f) => ({ ...f }));
    return this.failures.slice(-limit).map((f) => ({ ...f }));
  }

  getRecoveryHistory(limit?: number): RecoveryResult[] {
    if (limit === undefined) return this.recoveries.map((r) => ({ ...r }));
    return this.recoveries.slice(-limit).map((r) => ({ ...r }));
  }

  reset(): void {
    this.failures.length = 0;
    this.recoveries.length = 0;
    this.recoverySuccesses = 0;
    this.recoveryAttempts = 0;
    this.recoveryTimeSum = 0;
  }

  private resolveAutomaticStrategy(targetType: RecoveryTargetType): string {
    switch (targetType) {
      case "CACHE":
        return "cache-recovery";
      case "PIPELINE":
        return "pipeline-recovery";
      case "DEPENDENCY":
        return "dependency-recovery";
      case "CONFIGURATION":
        return "configuration-recovery";
      default:
        return "automatic-recovery";
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
