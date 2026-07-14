/**
 * Platform bootstrap — idempotent registration of all Sprint 9F engines (read-only orchestration).
 */

import { registerRecommendationRules } from "../rules/recommendation";
import { registerTradeSetupRules } from "../rules/tradeSetup";
import { registerHallucinationRules } from "../rules/hallucination";
import { registerHistoricalRules } from "../rules/historical";
import { registerTrustEngine } from "../trust";
import { registerDashboardService } from "../dashboard";
import { registerValidationOrchestrator } from "../orchestrator";
import { registerValidationEventBus } from "../events";
import { registerValidationAnalyticsEngine } from "../analytics";
import {
  registerValidationReportingEngine,
  registerReportExportEngine,
} from "../reporting";
import { registerValidationDiagnosticsEngine } from "../diagnostics";
import { registerValidationAdministrationEngine } from "../admin";
import { registerValidationOptimizationEngine } from "../optimization";
import { registerValidationReliabilityEngine } from "../reliability";
import { registerValidationObservabilityEngine } from "../observability";
import { registerValidationIntelligenceEngine } from "../intelligence";
import { registerValidationComplianceEngine } from "../compliance";
import { registerValidationKnowledgeGraph } from "../knowledge";
import { registerValidationVersioningEngine } from "../versioning";
import { registerSecurity } from "../security";
import { registerPerformance } from "../performance";
import { registerExplainability } from "../explainability";
import { registerSimulation } from "../simulation";
import { registerLearning } from "../learning";
import { registerRelease } from "../release";
import { registerDocumentation } from "../documentation";
import {
  REQUIRED_PLATFORM_ENGINES,
  createDefaultEngineRecord,
  markEngineRegistered,
  resetPlatformRegistry,
  upsertPlatformEngine,
  type PlatformEngineId,
} from "./PlatformRegistry";

export interface PlatformBootstrapResult {
  initialized: boolean;
  skipped: boolean;
  registeredCount: number;
  requiredCount: number;
  engines: PlatformEngineId[];
  warnings: string[];
  errors: string[];
}

let bootstrapped = false;

const CATALOG: Array<{ id: PlatformEngineId; label: string; sprint: string }> = [
  { id: "integrity", label: "Integrity Engine", sprint: "9F.1" },
  { id: "recommendation", label: "Recommendation Validation", sprint: "9F.6" },
  { id: "trade_setup", label: "Trade Setup Validation", sprint: "9F.7" },
  { id: "hallucination", label: "Hallucination Detection", sprint: "9F.8" },
  { id: "historical", label: "Historical Validation", sprint: "9F.9" },
  { id: "trust", label: "Trust Engine", sprint: "9F.10" },
  { id: "dashboard", label: "Validation Dashboard", sprint: "9F.11" },
  { id: "orchestrator", label: "Validation Orchestrator", sprint: "9F.12" },
  { id: "events", label: "Validation Event Bus", sprint: "9F.13" },
  { id: "analytics", label: "Analytics Engine", sprint: "9F.14" },
  { id: "reporting", label: "Reporting Engine", sprint: "9F.15" },
  { id: "diagnostics", label: "Diagnostics Engine", sprint: "9F.16" },
  { id: "admin", label: "Administration Engine", sprint: "9F.17" },
  { id: "optimization", label: "Optimization Engine", sprint: "9F.18" },
  { id: "reliability", label: "Reliability Engine", sprint: "9F.19" },
  { id: "observability", label: "Observability Engine", sprint: "9F.20" },
  { id: "intelligence", label: "Intelligence Engine", sprint: "9F.21" },
  { id: "compliance", label: "Compliance Engine", sprint: "9F.22" },
  { id: "knowledge", label: "Knowledge Graph", sprint: "9F.23" },
  { id: "versioning", label: "Versioning Engine", sprint: "9F.24" },
  { id: "security", label: "Security Engine", sprint: "9F.25" },
  { id: "performance", label: "Performance Engine", sprint: "9F.26" },
  { id: "explainability", label: "Explainability Engine", sprint: "9F.27" },
  { id: "simulation", label: "Simulation Engine", sprint: "9F.28" },
  { id: "learning", label: "Learning Engine", sprint: "9F.29" },
  { id: "release", label: "Release Certification Engine", sprint: "9F.30" },
  { id: "documentation", label: "Documentation Engine", sprint: "9F.31" },
];

export class PlatformBootstrap {
  initialize(options?: { force?: boolean }): PlatformBootstrapResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (bootstrapped && !options?.force) {
      return {
        initialized: false,
        skipped: true,
        registeredCount: REQUIRED_PLATFORM_ENGINES.length,
        requiredCount: REQUIRED_PLATFORM_ENGINES.length,
        engines: [...REQUIRED_PLATFORM_ENGINES],
        warnings: ["Platform already bootstrapped"],
        errors: [],
      };
    }

    try {
      if (options?.force) {
        resetPlatformRegistry();
      }

      for (const item of CATALOG) {
        upsertPlatformEngine(
          createDefaultEngineRecord(item.id, item.label, item.sprint)
        );
      }

      const registrations: Array<{ id: PlatformEngineId; run: () => void }> = [
        { id: "integrity", run: () => undefined },
        { id: "recommendation", run: () => registerRecommendationRules() },
        { id: "trade_setup", run: () => registerTradeSetupRules() },
        { id: "hallucination", run: () => registerHallucinationRules() },
        { id: "historical", run: () => registerHistoricalRules() },
        { id: "trust", run: () => registerTrustEngine() },
        { id: "dashboard", run: () => registerDashboardService() },
        { id: "orchestrator", run: () => registerValidationOrchestrator() },
        { id: "events", run: () => registerValidationEventBus() },
        { id: "analytics", run: () => registerValidationAnalyticsEngine() },
        {
          id: "reporting",
          run: () => {
            registerValidationReportingEngine();
            registerReportExportEngine();
          },
        },
        { id: "diagnostics", run: () => registerValidationDiagnosticsEngine() },
        { id: "admin", run: () => registerValidationAdministrationEngine() },
        { id: "optimization", run: () => registerValidationOptimizationEngine() },
        { id: "reliability", run: () => registerValidationReliabilityEngine() },
        { id: "observability", run: () => registerValidationObservabilityEngine() },
        { id: "intelligence", run: () => registerValidationIntelligenceEngine() },
        { id: "compliance", run: () => registerValidationComplianceEngine() },
        { id: "knowledge", run: () => registerValidationKnowledgeGraph() },
        { id: "versioning", run: () => registerValidationVersioningEngine() },
        { id: "security", run: () => registerSecurity() },
        { id: "performance", run: () => registerPerformance() },
        { id: "explainability", run: () => registerExplainability() },
        { id: "simulation", run: () => registerSimulation() },
        { id: "learning", run: () => registerLearning() },
        { id: "release", run: () => registerRelease() },
        { id: "documentation", run: () => registerDocumentation() },
      ];

      for (const item of registrations) {
        try {
          item.run();
          const meta = CATALOG.find((c) => c.id === item.id);
          markEngineRegistered(item.id, {
            label: meta?.label,
            sprint: meta?.sprint,
            healthy: true,
            exportReady: true,
            metricsReady: true,
            snapshotReady: true,
            auditReady: true,
          });
        } catch (err) {
          const meta = CATALOG.find((c) => c.id === item.id);
          markEngineRegistered(item.id, {
            label: meta?.label,
            sprint: meta?.sprint,
            healthy: false,
            exportReady: true,
            metricsReady: false,
            snapshotReady: false,
            auditReady: false,
          });
          warnings.push(`${item.id} registration warning: ${String(err)}`);
        }
      }

      bootstrapped = true;
      return {
        initialized: true,
        skipped: false,
        registeredCount: REQUIRED_PLATFORM_ENGINES.length,
        requiredCount: REQUIRED_PLATFORM_ENGINES.length,
        engines: [...REQUIRED_PLATFORM_ENGINES],
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`platform bootstrap failed: ${String(err)}`);
      return {
        initialized: false,
        skipped: false,
        registeredCount: 0,
        requiredCount: REQUIRED_PLATFORM_ENGINES.length,
        engines: [],
        warnings,
        errors,
      };
    }
  }
}

export function resetPlatformBootstrapState(): void {
  bootstrapped = false;
  resetPlatformRegistry();
}
