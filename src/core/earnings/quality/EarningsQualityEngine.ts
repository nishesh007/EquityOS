/**
 * Institutional Earnings Quality Engine — core orchestrator (Sprint 9B.3).
 * Advisory only: evaluates accounting / cash / WC quality; never mutates other engines.
 */

import {
  resolveQualityConfiguration,
  type QualityConfiguration,
  type QualityConfigurationInput,
} from "./QualityConfiguration";
import {
  listQualityChecks,
  registerBuiltinQualityChecks,
} from "./QualityRegistry";
import { QualityMetricsTracker } from "./QualityMetrics";
import { QualityAuditLogger } from "./QualityAuditLogger";
import { AccrualAnalyzer } from "./AccrualAnalyzer";
import { CashFlowQualityAnalyzer } from "./CashFlowQualityAnalyzer";
import { WorkingCapitalAnalyzer } from "./WorkingCapitalAnalyzer";
import { MarginQualityAnalyzer } from "./MarginQualityAnalyzer";
import { CapitalAllocationAnalyzer } from "./CapitalAllocationAnalyzer";
import { AccountingRedFlagDetector } from "./AccountingRedFlagDetector";
import { QualityScoreEngine, type QualityScoreResult } from "./QualityScoreEngine";
import {
  QualitySnapshotStore,
  compareQualitySnapshots,
  type QualitySnapshot,
  type QualitySnapshotComparison,
  type QualitySnapshotKind,
} from "./QualitySnapshot";
import type {
  DimensionAnalysisResult,
  EarningsQualityInput,
  QualitySignal,
} from "./qualityTypes";
import {
  registerTrustEngine,
  registerTrustModule,
} from "../../dataIntegrity/trust";
import { getDataIntegrityEngine } from "../../dataIntegrity/DataIntegrityEngine";
import { getValidationPlatform } from "../../dataIntegrity/platform";
import { registerEarningsData } from "../data";
import { registerFinancialParser } from "../parser";

export interface EarningsQualityAnalysis {
  symbol: string;
  score: QualityScoreResult;
  dimensions: DimensionAnalysisResult[];
  signals: QualitySignal[];
  warnings: string[];
  errors: string[];
  advisoryOnly: true;
  engineVersion: string;
  analyzedAt: string;
  executionTimeMs: number;
}

export class EarningsQualityEngine {
  private config: QualityConfiguration;
  private readonly accruals = new AccrualAnalyzer();
  private readonly cashFlow = new CashFlowQualityAnalyzer();
  private readonly workingCapital = new WorkingCapitalAnalyzer();
  private readonly margins = new MarginQualityAnalyzer();
  private readonly capital = new CapitalAllocationAnalyzer();
  private readonly redFlags = new AccountingRedFlagDetector();
  private readonly scorer = new QualityScoreEngine();
  private readonly metrics = new QualityMetricsTracker();
  private audit: QualityAuditLogger;
  private snapshots: QualitySnapshotStore;

  private earningsIntegrated = false;
  private parserIntegrated = false;
  private trustIntegrated = false;
  private integrityIntegrated = false;
  private platformIntegrated = false;

  constructor(configInput?: QualityConfigurationInput) {
    this.config = resolveQualityConfiguration(configInput);
    this.audit = new QualityAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new QualitySnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): QualityConfiguration {
    return resolveQualityConfiguration(this.config);
  }

  updateConfiguration(input: QualityConfigurationInput): void {
    this.config = resolveQualityConfiguration({
      ...this.config,
      ...input,
      weights: { ...this.config.weights, ...input.weights },
      thresholds: { ...this.config.thresholds, ...input.thresholds },
    });
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  /** Read-only soft integrations — never mutates peer engine logic. */
  integrateExternalEngines(): {
    earningsDataEngine: boolean;
    financialParser: boolean;
    trust: boolean;
    dataIntegrity: boolean;
    validationPlatform: boolean;
  } {
    let earningsDataEngine = this.earningsIntegrated;
    let financialParser = this.parserIntegrated;
    let trust = this.trustIntegrated;
    let dataIntegrity = this.integrityIntegrated;
    let validationPlatform = this.platformIntegrated;

    if (this.config.integrateEarningsDataEngine && !this.earningsIntegrated) {
      try {
        registerEarningsData();
        this.earningsIntegrated = true;
        earningsDataEngine = true;
      } catch {
        earningsDataEngine = false;
      }
    }

    if (this.config.integrateFinancialParser && !this.parserIntegrated) {
      try {
        registerFinancialParser();
        this.parserIntegrated = true;
        financialParser = true;
      } catch {
        financialParser = false;
      }
    }

    if (this.config.integrateTrustEngine && !this.trustIntegrated) {
      try {
        registerTrustEngine();
        registerTrustModule({
          id: "earningsQuality",
          name: "Institutional Earnings Quality",
          description: "Advisory earnings / accounting quality score",
          defaultWeight: 0.05,
          extractScore: (payload: unknown) => extractQualityTrustScore(payload),
        });
        this.trustIntegrated = true;
        trust = true;
      } catch {
        trust = false;
      }
    }

    if (this.config.integrateDataIntegrity && !this.integrityIntegrated) {
      try {
        getDataIntegrityEngine();
        this.integrityIntegrated = true;
        dataIntegrity = true;
      } catch {
        dataIntegrity = false;
      }
    }

    if (
      this.config.integrateValidationPlatform &&
      !this.platformIntegrated
    ) {
      try {
        getValidationPlatform();
        this.platformIntegrated = true;
        validationPlatform = true;
      } catch {
        validationPlatform = false;
      }
    }

    return {
      earningsDataEngine,
      financialParser,
      trust,
      dataIntegrity,
      validationPlatform,
    };
  }

  analyzeEarningsQuality(input: EarningsQualityInput): EarningsQualityAnalysis {
    const started = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      if (!input?.symbol) {
        errors.push("Symbol is required");
        this.metrics.recordError();
        return emptyAnalysis("", errors, this.config.engineVersion, started);
      }

      if (!input.current || typeof input.current !== "object") {
        errors.push("Current period metrics are required");
        this.metrics.recordError();
        return emptyAnalysis(
          input.symbol,
          errors,
          this.config.engineVersion,
          started
        );
      }

      const thresholds = this.config.thresholds;
      const dimensions: DimensionAnalysisResult[] = [
        this.cashFlow.analyze(input, thresholds),
        this.accruals.analyze(input, thresholds),
        this.redFlags.analyzeAccountingQuality(input, thresholds),
        this.workingCapital.analyze(input, thresholds),
        this.capital.analyze(input, thresholds),
        this.margins.analyze(input, thresholds),
      ];

      for (const d of dimensions) warnings.push(...d.warnings);

      const preliminarySignals = dimensions.flatMap((d) => d.signals);
      const redFlagDim = this.redFlags.analyzeRedFlags(
        input,
        thresholds,
        preliminarySignals
      );
      dimensions.push(redFlagDim);
      warnings.push(...redFlagDim.warnings);

      const score = this.scorer.compose(dimensions, this.config.weights);
      const executionTimeMs = Date.now() - started;

      this.metrics.recordAnalysis({
        score: score.score,
        issueCount: score.signals.length,
        runtimeMs: executionTimeMs,
      });

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "QualityAnalysis",
        symbol: input.symbol.toUpperCase(),
        qualityScore: score.score,
        issueCount: score.signals.length,
        executionTimeMs,
        warnings: [...warnings],
        errors: [],
        engineVersion: this.config.engineVersion,
        advisoryOnly: true,
      });

      return {
        symbol: input.symbol.toUpperCase(),
        score,
        dimensions,
        signals: score.signals,
        warnings,
        errors,
        advisoryOnly: true,
        engineVersion: this.config.engineVersion,
        analyzedAt: new Date().toISOString(),
        executionTimeMs,
      };
    } catch (err) {
      this.metrics.recordError();
      errors.push(`analyzeEarningsQuality failed: ${String(err)}`);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Error",
        symbol: input?.symbol,
        executionTimeMs: Date.now() - started,
        warnings,
        errors,
        engineVersion: this.config.engineVersion,
        advisoryOnly: true,
      });
      return emptyAnalysis(
        input?.symbol ?? "",
        errors,
        this.config.engineVersion,
        started
      );
    }
  }

  detectAccountingIssues(input: EarningsQualityInput): QualitySignal[] {
    try {
      const accounting = this.redFlags.analyzeAccountingQuality(
        input,
        this.config.thresholds
      );
      const red = this.redFlags.analyzeRedFlags(
        input,
        this.config.thresholds,
        accounting.signals
      );
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "RedFlagsDetected",
        symbol: input.symbol,
        issueCount: accounting.signals.length + red.signals.length,
        executionTimeMs: 0,
        warnings: [...accounting.warnings, ...red.warnings],
        errors: [],
        engineVersion: this.config.engineVersion,
        advisoryOnly: true,
      });
      return [...accounting.signals, ...red.signals];
    } catch {
      this.metrics.recordError();
      return [];
    }
  }

  evaluateCashFlowQuality(input: EarningsQualityInput): DimensionAnalysisResult {
    try {
      const result = this.cashFlow.analyze(input, this.config.thresholds);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "CashFlowEvaluated",
        symbol: input.symbol,
        qualityScore: result.score,
        issueCount: result.signals.length,
        executionTimeMs: 0,
        warnings: result.warnings,
        errors: [],
        engineVersion: this.config.engineVersion,
        advisoryOnly: true,
      });
      return result;
    } catch (err) {
      this.metrics.recordError();
      return {
        dimension: "cashFlowQuality",
        score: 50,
        signals: [],
        warnings: [String(err)],
      };
    }
  }

  evaluateWorkingCapital(input: EarningsQualityInput): DimensionAnalysisResult {
    try {
      const result = this.workingCapital.analyze(input, this.config.thresholds);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "WorkingCapitalEvaluated",
        symbol: input.symbol,
        qualityScore: result.score,
        issueCount: result.signals.length,
        executionTimeMs: 0,
        warnings: result.warnings,
        errors: [],
        engineVersion: this.config.engineVersion,
        advisoryOnly: true,
      });
      return result;
    } catch (err) {
      this.metrics.recordError();
      return {
        dimension: "workingCapital",
        score: 50,
        signals: [],
        warnings: [String(err)],
      };
    }
  }

  evaluateCapitalAllocation(
    input: EarningsQualityInput
  ): DimensionAnalysisResult {
    try {
      const result = this.capital.analyze(input, this.config.thresholds);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "CapitalAllocationEvaluated",
        symbol: input.symbol,
        qualityScore: result.score,
        issueCount: result.signals.length,
        executionTimeMs: 0,
        warnings: result.warnings,
        errors: [],
        engineVersion: this.config.engineVersion,
        advisoryOnly: true,
      });
      return result;
    } catch (err) {
      this.metrics.recordError();
      return {
        dimension: "capitalAllocation",
        score: 50,
        signals: [],
        warnings: [String(err)],
      };
    }
  }

  createQualitySnapshot(
    analysis?: EarningsQualityAnalysis,
    label?: string,
    kind: QualitySnapshotKind = "quality"
  ): QualitySnapshot {
    const source =
      analysis ??
      emptyAnalysis("UNKNOWN", ["No analysis provided"], this.config.engineVersion, Date.now());
    const snapshot = this.snapshots.create(
      {
        kind,
        symbol: source.symbol,
        score: source.score.score,
        breakdown: source.score.breakdown,
        signalCount: source.signals.length,
        criticalCount: source.signals.filter((s) => s.severity === "critical")
          .length,
        classification: source.score.classification,
        configurationVersion: this.config.engineVersion,
      },
      label
    );
    this.metrics.recordSnapshot();
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "SnapshotCreated",
      symbol: source.symbol,
      qualityScore: source.score.score,
      issueCount: source.signals.length,
      executionTimeMs: 0,
      warnings: [],
      errors: [],
      engineVersion: this.config.engineVersion,
      advisoryOnly: true,
    });
    return snapshot;
  }

  compareSnapshots(
    baseline: QualitySnapshot,
    compare: QualitySnapshot
  ): QualitySnapshotComparison {
    return compareQualitySnapshots(
      baseline,
      compare,
      this.config.thresholds.regressionScoreDrop
    );
  }

  getQualityMetrics() {
    return this.metrics.getMetrics();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  listChecks() {
    return listQualityChecks();
  }

  listSnapshots(limit?: number) {
    return this.snapshots.list(limit);
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.earningsIntegrated = false;
    this.parserIntegrated = false;
    this.trustIntegrated = false;
    this.integrityIntegrated = false;
    this.platformIntegrated = false;
  }
}

function emptyAnalysis(
  symbol: string,
  errors: string[],
  engineVersion: string,
  started: number
): EarningsQualityAnalysis {
  const breakdown = {
    cashFlowQuality: 0,
    accrualQuality: 0,
    accountingQuality: 0,
    workingCapital: 0,
    capitalAllocation: 0,
    margins: 0,
    redFlags: 0,
    overall: 0,
  };
  return {
    symbol: symbol.toUpperCase(),
    score: {
      score: 0,
      breakdown,
      weights: resolveQualityConfiguration().weights,
      signals: [],
      classification: "poor",
      advisoryOnly: true,
    },
    dimensions: [],
    signals: [],
    warnings: [],
    errors,
    advisoryOnly: true,
    engineVersion,
    analyzedAt: new Date().toISOString(),
    executionTimeMs: Math.max(0, Date.now() - started),
  };
}

function extractQualityTrustScore(payload: unknown): number | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const p = payload as Record<string, unknown>;
  if (typeof p.earningsQualityScore === "number") return p.earningsQualityScore;
  if (
    p.moduleScores &&
    typeof p.moduleScores === "object" &&
    p.moduleScores !== null &&
    typeof (p.moduleScores as Record<string, unknown>).earningsQuality ===
      "number"
  ) {
    return (p.moduleScores as Record<string, number>).earningsQuality;
  }
  return undefined;
}

export { registerBuiltinQualityChecks };
