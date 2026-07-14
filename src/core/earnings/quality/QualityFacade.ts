/**
 * Institutional Earnings Quality Engine — public façade (Sprint 9B.3).
 * Idempotent registration + convenience wrappers. Advisory only.
 */

import {
  resolveQualityConfiguration,
  type QualityConfigurationInput,
} from "./QualityConfiguration";
import {
  listQualityChecks,
  registerBuiltinQualityChecks,
  resetQualityRegistry,
} from "./QualityRegistry";
import {
  EarningsQualityEngine,
  type EarningsQualityAnalysis,
} from "./EarningsQualityEngine";
import type { EarningsQualityInput, QualitySignal } from "./qualityTypes";
import type { DimensionAnalysisResult } from "./qualityTypes";
import type {
  QualitySnapshot,
  QualitySnapshotKind,
} from "./QualitySnapshot";

export interface QualityRegistrationResult {
  registered: boolean;
  skipped: boolean;
  checksRegistered: number;
  integrations: {
    earningsDataEngine: boolean;
    financialParser: boolean;
    trust: boolean;
    dataIntegrity: boolean;
    validationPlatform: boolean;
  };
}

let defaultEngine: EarningsQualityEngine | null = null;
let engineRegistered = false;

export function registerQualityEngine(options?: {
  engine?: EarningsQualityEngine;
  config?: QualityConfigurationInput;
  force?: boolean;
}): QualityRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      checksRegistered: listQualityChecks().length,
      integrations: {
        earningsDataEngine: false,
        financialParser: false,
        trust: false,
        dataIntegrity: false,
        validationPlatform: false,
      },
    };
  }

  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new EarningsQualityEngine(options?.config);
  }

  const builtins = registerBuiltinQualityChecks({ force: options?.force });
  const integrations = defaultEngine.integrateExternalEngines();
  engineRegistered = true;

  return {
    registered: true,
    skipped: false,
    checksRegistered: builtins.total,
    integrations,
  };
}

export function getEarningsQualityEngine(
  options?: QualityConfigurationInput
): EarningsQualityEngine {
  if (!defaultEngine || options) {
    defaultEngine = new EarningsQualityEngine(options);
    registerBuiltinQualityChecks();
  }
  return defaultEngine;
}

export function resetQualityEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetQualityRegistry();
}

/** Public API — never throws to consumers. */
export function analyzeEarningsQuality(
  input: EarningsQualityInput
): EarningsQualityAnalysis {
  try {
    registerQualityEngine();
    return getEarningsQualityEngine().analyzeEarningsQuality(input);
  } catch (err) {
    return {
      symbol: (input?.symbol ?? "").toUpperCase(),
      score: {
        score: 0,
        breakdown: {
          cashFlowQuality: 0,
          accrualQuality: 0,
          accountingQuality: 0,
          workingCapital: 0,
          capitalAllocation: 0,
          margins: 0,
          redFlags: 0,
          overall: 0,
        },
        weights: resolveQualityConfiguration().weights,
        signals: [],
        classification: "poor",
        advisoryOnly: true,
      },
      dimensions: [],
      signals: [],
      warnings: [],
      errors: [String(err)],
      advisoryOnly: true,
      engineVersion: resolveQualityConfiguration().engineVersion,
      analyzedAt: new Date().toISOString(),
      executionTimeMs: 0,
    };
  }
}

export function detectAccountingIssues(
  input: EarningsQualityInput
): QualitySignal[] {
  try {
    registerQualityEngine();
    return getEarningsQualityEngine().detectAccountingIssues(input);
  } catch {
    return [];
  }
}

export function evaluateCashFlowQuality(
  input: EarningsQualityInput
): DimensionAnalysisResult {
  try {
    registerQualityEngine();
    return getEarningsQualityEngine().evaluateCashFlowQuality(input);
  } catch (err) {
    return {
      dimension: "cashFlowQuality",
      score: 50,
      signals: [],
      warnings: [String(err)],
    };
  }
}

export function evaluateWorkingCapital(
  input: EarningsQualityInput
): DimensionAnalysisResult {
  try {
    registerQualityEngine();
    return getEarningsQualityEngine().evaluateWorkingCapital(input);
  } catch (err) {
    return {
      dimension: "workingCapital",
      score: 50,
      signals: [],
      warnings: [String(err)],
    };
  }
}

export function evaluateCapitalAllocation(
  input: EarningsQualityInput
): DimensionAnalysisResult {
  try {
    registerQualityEngine();
    return getEarningsQualityEngine().evaluateCapitalAllocation(input);
  } catch (err) {
    return {
      dimension: "capitalAllocation",
      score: 50,
      signals: [],
      warnings: [String(err)],
    };
  }
}

export function createQualitySnapshot(
  analysis?: EarningsQualityAnalysis,
  label?: string,
  kind?: QualitySnapshotKind
): QualitySnapshot {
  registerQualityEngine();
  return getEarningsQualityEngine().createQualitySnapshot(
    analysis,
    label,
    kind
  );
}

export function getQualityMetrics() {
  try {
    registerQualityEngine();
    return getEarningsQualityEngine().getQualityMetrics();
  } catch {
    return {
      analyses: 0,
      issuesDetected: 0,
      snapshots: 0,
      averageScore: 0,
      averageRuntimeMs: 0,
      errors: 0,
      lastAnalysisAt: null,
    };
  }
}
