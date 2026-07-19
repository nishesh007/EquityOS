/**
 * Platform engine — core orchestration state machine (no validation mutation).
 */

import {
  DEFAULT_PLATFORM_CONFIGURATION,
  resolvePlatformConfiguration,
  type PlatformConfiguration,
  type PlatformConfigurationInput,
} from "./PlatformConfiguration";
import {
  REQUIRED_PLATFORM_ENGINES,
  listPlatformEngines,
} from "./PlatformRegistry";
import {
  PlatformBootstrap,
  resetPlatformBootstrapState,
  type PlatformBootstrapResult,
} from "./PlatformBootstrap";
import { PlatformHealth, type PlatformHealthReport } from "./PlatformHealth";
import {
  createUninitializedStatus,
  type PlatformStatus,
} from "./PlatformStatus";
import { PlatformMetricsTracker } from "./PlatformMetrics";
import { PlatformAuditLogger } from "./PlatformAuditLogger";
import {
  PlatformSnapshotStore,
  buildPlatformSnapshotPayload,
  comparePlatformSnapshots,
  type PlatformSnapshot,
  type PlatformSnapshotComparison,
  type PlatformSnapshotKind,
} from "./PlatformSnapshot";
import {
  PlatformCertification,
  type PlatformCertificationResult,
} from "./PlatformCertification";
import {
  PlatformSummaryBuilder,
  type PlatformSummary,
} from "./PlatformSummary";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface PlatformIntegrityResult {
  ok: boolean;
  missingEngines: string[];
  unhealthyEngines: string[];
  warnings: string[];
  errors: string[];
}

export class PlatformEngine {
  private config: PlatformConfiguration;
  private readonly bootstrap = new PlatformBootstrap();
  private readonly healthEngine = new PlatformHealth();
  private readonly certificationEngine = new PlatformCertification();
  private readonly summaryBuilder = new PlatformSummaryBuilder();
  private readonly metrics = new PlatformMetricsTracker();
  private audit: PlatformAuditLogger;
  private snapshots: PlatformSnapshotStore;
  private initialized = false;
  private lastHealth: PlatformHealthReport | null = null;
  private lastCertification: PlatformCertificationResult | null = null;
  private lastStatus: PlatformStatus;

  constructor(configInput?: PlatformConfigurationInput) {
    this.config = resolvePlatformConfiguration(configInput);
    this.audit = new PlatformAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new PlatformSnapshotStore(this.config.snapshotRetention);
    this.lastStatus = createUninitializedStatus(this.config.engineVersion);
  }

  getConfiguration(): PlatformConfiguration {
    return resolvePlatformConfiguration(this.config);
  }

  updateConfiguration(input: PlatformConfigurationInput): void {
    this.config = resolvePlatformConfiguration({
      ...this.config,
      ...input,
      healthWeights: {
        ...this.config.healthWeights,
        ...input.healthWeights,
      },
    });
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  initialize(options?: { force?: boolean }): PlatformBootstrapResult {
    const started = Date.now();
    try {
      if (!this.config.orchestrationOnly) {
        throw new Error("Platform requires orchestrationOnly=true");
      }
      const result = this.bootstrap.initialize(options);
      this.initialized = result.initialized || result.skipped;
      this.metrics.setInitialized(this.initialized);
      this.metrics.setEngineCounts(
        result.registeredCount,
        result.requiredCount
      );

      this.lastHealth = this.healthEngine.compute(
        listPlatformEngines(),
        this.config
      );
      this.lastStatus = {
        initialized: this.initialized,
        engineVersion: this.config.engineVersion,
        certificationStatus:
          this.lastCertification?.status ?? "uninitialized",
        health: this.lastHealth,
        engines: listPlatformEngines(),
        warnings: result.warnings,
        errors: result.errors,
        updatedAt: new Date().toISOString(),
      };

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "PlatformInitialized",
        status: this.initialized ? "initialized" : "failed",
        healthScore: this.lastHealth.overallHealthScore,
        scoreBreakdown: this.lastHealth,
        executionTimeMs: Date.now() - started,
        warnings: result.warnings,
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });

      safePublishEvent({
        eventType: "WarningRaised",
        module: "platform",
        source: "platform-engine",
        severity: result.errors.length > 0 ? "WARNING" : "INFO",
        payload: {
          initialized: this.initialized,
          registeredCount: result.registeredCount,
          orchestrationOnly: true,
          noValidationMutation: true,
        },
        executionTimeMs: Date.now() - started,
      });

      return result;
    } catch (err) {
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Error",
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [`initialize failed: ${String(err)}`],
        engineVersion: this.config.engineVersion,
      });
      return {
        initialized: false,
        skipped: false,
        registeredCount: 0,
        requiredCount: REQUIRED_PLATFORM_ENGINES.length,
        engines: [],
        warnings: [],
        errors: [`initialize failed: ${String(err)}`],
      };
    }
  }

  getStatus(): PlatformStatus {
    if (!this.initialized) {
      return createUninitializedStatus(this.config.engineVersion);
    }
    this.lastHealth = this.healthEngine.compute(
      listPlatformEngines(),
      this.config
    );
    this.lastStatus = {
      ...this.lastStatus,
      initialized: true,
      health: this.lastHealth,
      engines: listPlatformEngines(),
      certificationStatus:
        this.lastCertification?.status ?? "uninitialized",
      updatedAt: new Date().toISOString(),
    };
    return {
      ...this.lastStatus,
      engines: listPlatformEngines(),
      health: { ...this.lastHealth },
    };
  }

  getHealth(): PlatformHealthReport {
    this.lastHealth = this.healthEngine.compute(
      listPlatformEngines(),
      this.config
    );
    this.metrics.setHealthScore(this.lastHealth.overallHealthScore);
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "HealthComputed",
      healthScore: this.lastHealth.overallHealthScore,
      scoreBreakdown: this.lastHealth,
      executionTimeMs: 0,
      warnings: [],
      errors: [],
      engineVersion: this.config.engineVersion,
    });
    return { ...this.lastHealth };
  }

  getMetrics() {
    this.metrics.setEngineCounts(
      listPlatformEngines().filter((e) => e.registered).length,
      REQUIRED_PLATFORM_ENGINES.length
    );
    this.metrics.setSnapshotCount(this.snapshots.size);
    this.metrics.setInitialized(this.initialized);
    return this.metrics.getMetrics();
  }

  verifyIntegrity(): PlatformIntegrityResult {
    const engines = listPlatformEngines();
    const missing = REQUIRED_PLATFORM_ENGINES.filter(
      (id) => !engines.some((e) => e.engineId === id && e.registered)
    );
    const unhealthy = engines
      .filter((e) => e.registered && !e.healthy)
      .map((e) => e.engineId);
    const warnings: string[] = [];
    if (missing.length > 0) {
      warnings.push(`Missing engines: ${missing.join(", ")}`);
    }
    if (unhealthy.length > 0) {
      warnings.push(`Unhealthy engines: ${unhealthy.join(", ")}`);
    }
    const ok = missing.length === 0 && unhealthy.length === 0;
    this.audit.append({
      timestamp: new Date().toISOString(),
      event: "IntegrityVerified",
      status: ok ? "ok" : "failed",
      healthScore: this.lastHealth?.overallHealthScore,
      executionTimeMs: 0,
      warnings,
      errors: ok ? [] : warnings,
      engineVersion: this.config.engineVersion,
    });
    return {
      ok,
      missingEngines: missing,
      unhealthyEngines: unhealthy,
      warnings,
      errors: ok ? [] : [...warnings],
    };
  }

  runCertification(): PlatformCertificationResult {
    const started = Date.now();
    try {
      if (!this.initialized) {
        this.initialize();
      }
      const integrity = this.verifyIntegrity();
      const health = this.getHealth();
      const result = this.certificationEngine.certify({
        engines: listPlatformEngines(),
        required: REQUIRED_PLATFORM_ENGINES,
        health,
        config: this.config,
        integrityOk: integrity.ok,
      });
      this.lastCertification = result;
      this.metrics.recordCertification({
        healthScore: health.overallHealthScore,
        risk: health.overallRisk,
        runtimeMs: Date.now() - started,
      });
      this.lastStatus = {
        ...this.getStatus(),
        certificationStatus: result.status,
      };

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "CertificationRun",
        status: result.status,
        healthScore: health.overallHealthScore,
        scoreBreakdown: health,
        executionTimeMs: Date.now() - started,
        warnings: result.warnings,
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });

      safePublishEvent({
        eventType: "WarningRaised",
        module: "platform",
        source: "platform-engine",
        severity:
          result.status === "production_ready" ||
          result.status === "conditionally_ready"
            ? "INFO"
            : "WARNING",
        payload: {
          certificationId: result.certificationId,
          status: result.status,
          healthScore: health.overallHealthScore,
          noValidationMutation: true,
        },
        executionTimeMs: Date.now() - started,
      });

      return result;
    } catch (err) {
      const health = this.lastHealth ?? this.getHealth();
      const failed: PlatformCertificationResult = {
        certificationId: `platcert:error:${Date.now()}`,
        status: "blocked",
        summary: "Platform certification failed",
        reasoning: [String(err)],
        checks: [],
        health,
        generatedAt: new Date().toISOString(),
        warnings: [],
        errors: [`runCertification failed: ${String(err)}`],
      };
      this.lastCertification = failed;
      return failed;
    }
  }

  createSnapshot(
    label?: string,
    kind: PlatformSnapshotKind = "platform"
  ): PlatformSnapshot {
    const started = Date.now();
    try {
      const health = this.lastHealth ?? this.getHealth();
      const payload = buildPlatformSnapshotPayload({
        kind,
        health,
        certificationStatus:
          this.lastCertification?.status ?? "uninitialized",
        enginesRegistered: listPlatformEngines().filter((e) => e.registered)
          .length,
        enginesRequired: REQUIRED_PLATFORM_ENGINES.length,
        configurationVersion: this.config.engineVersion,
      });
      const snapshot = this.snapshots.save(payload, label);
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        status: this.lastCertification?.status,
        healthScore: health.overallHealthScore,
        scoreBreakdown: health,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch {
      return this.snapshots.save(
        buildPlatformSnapshotPayload({
          kind,
          health: this.getHealth(),
          certificationStatus: "uninitialized",
          enginesRegistered: 0,
          enginesRequired: REQUIRED_PLATFORM_ENGINES.length,
          configurationVersion: this.config.engineVersion,
        }),
        label ?? "error"
      );
    }
  }

  compareSnapshots(
    baselineId: string,
    compareId: string
  ): PlatformSnapshotComparison | null {
    const a = this.snapshots.load(baselineId);
    const b = this.snapshots.load(compareId);
    if (!a || !b) return null;
    return comparePlatformSnapshots(a, b);
  }

  getSummary(): PlatformSummary {
    const status = this.getStatus();
    const health = status.health;
    return this.summaryBuilder.build({
      status,
      health,
      certification: this.lastCertification,
      engines: listPlatformEngines(),
    });
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  listSnapshots(): PlatformSnapshot[] {
    return this.snapshots.list();
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.initialized = false;
    this.lastHealth = null;
    this.lastCertification = null;
    this.lastStatus = createUninitializedStatus(this.config.engineVersion);
    resetPlatformBootstrapState();
  }
}
