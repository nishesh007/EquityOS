/**
 * Read-only Sprint 9F institutional health snapshot for dashboard UI.
 * Calls existing engine getters only — no scoring / validation mutation.
 */

import type {
  InstitutionalPlatformOperations,
  InstitutionalPlatformSnapshot,
} from "@/lib/opportunity-engine/institutional-presentation";

export async function fetchInstitutionalPlatformSnapshot(): Promise<InstitutionalPlatformSnapshot> {
  try {
    const [
      { getPlatformHealth, getPlatformStatus, getPlatformMetrics, getPlatformSummary, getValidationPlatform, registerValidationPlatform },
      { getDashboardSummary },
      { getTrustMetrics, registerTrustEngine },
      { getExplainabilityMetrics, registerExplainability },
      { getObservabilityMetrics, registerValidationObservabilityEngine },
      { getValidationDiagnosticsEngine, registerValidationDiagnosticsEngine },
      { getPerformanceMetrics, registerPerformance },
      { getSecurityMetrics, registerSecurity },
      { getReleaseMetrics, registerRelease },
      { getValidationReportingEngine, registerValidationReportingEngine },
    ] = await Promise.all([
      import("@/src/core/dataIntegrity/platform"),
      import("@/src/core/dataIntegrity/dashboard"),
      import("@/src/core/dataIntegrity/trust"),
      import("@/src/core/dataIntegrity/explainability"),
      import("@/src/core/dataIntegrity/observability"),
      import("@/src/core/dataIntegrity/diagnostics"),
      import("@/src/core/dataIntegrity/performance"),
      import("@/src/core/dataIntegrity/security"),
      import("@/src/core/dataIntegrity/release"),
      import("@/src/core/dataIntegrity/reporting"),
    ]);

    registerValidationPlatform();
    registerTrustEngine();
    registerExplainability();
    registerValidationObservabilityEngine();
    registerValidationDiagnosticsEngine();
    registerPerformance();
    registerSecurity();
    registerRelease();
    registerValidationReportingEngine();

    let operations: InstitutionalPlatformOperations | null = null;
    try {
      const auditRaw = getValidationPlatform().getAuditLog(40);
      operations = {
        status: getPlatformStatus(),
        metrics: getPlatformMetrics(),
        summary: getPlatformSummary(),
        observability: getObservabilityMetrics(),
        diagnostics: getValidationDiagnosticsEngine().getMetrics(),
        performance: getPerformanceMetrics(),
        security: getSecurityMetrics(),
        release: getReleaseMetrics(),
        reporting: getValidationReportingEngine().getMetrics(),
        audit: auditRaw.map((entry) => ({
          timestamp: entry.timestamp,
          event: String(entry.event ?? "PlatformEvent"),
          warnings: entry.warnings,
          errors: entry.errors,
        })),
      };
    } catch {
      operations = null;
    }

    return {
      platform: getPlatformHealth(),
      dashboard: getDashboardSummary(),
      trust: getTrustMetrics(),
      explainability: getExplainabilityMetrics(),
      operations,
    };
  } catch {
    return {
      platform: null,
      dashboard: null,
      trust: null,
      explainability: null,
      operations: null,
    };
  }
}
