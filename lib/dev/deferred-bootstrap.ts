/**
 * Deferred Node bootstrap for heavy institutional modules.
 * Keeps Next.js `instrumentation` off the critical compile/startup path.
 *
 * Production: same registrations, scheduled after the event loop turns.
 * Development: longer delay so the first page can compile/render first.
 */

export type BootstrapPhase = "scheduler" | "platform";

let schedulerQueued = false;
let platformQueued = false;
let platformDone = false;
let platformPromise: Promise<void> | null = null;

function isDevelopmentRuntime(): boolean {
  return process.env.NODE_ENV === "development";
}

/** Delay before heavy platform registration (ms). */
function platformDelayMs(): number {
  if (process.env.EQUITYOS_BOOTSTRAP_IMMEDIATE === "1") return 0;
  return isDevelopmentRuntime() ? 8_000 : 0;
}

/** Delay before opportunity scheduler starts (ms). */
function schedulerDelayMs(): number {
  if (process.env.EQUITYOS_BOOTSTRAP_IMMEDIATE === "1") return 0;
  // Well after first paint / hydration — scheduler has no boot scan anyway.
  return isDevelopmentRuntime() ? 20_000 : 5_000;
}

function schedule(fn: () => void, delayMs: number): void {
  if (delayMs <= 0) {
    setImmediate(fn);
    return;
  }
  setTimeout(fn, delayMs);
}

async function registerInstitutionalPlatform(): Promise<void> {
  const started = Date.now();

  // Sprint 9F.3 — idempotent institutional market rule registration
  const { registerMarketRules } = await import(
    "@/src/core/dataIntegrity/rules/market"
  );
  registerMarketRules();

  const { registerTechnicalRules } = await import(
    "@/src/core/dataIntegrity/rules/technical"
  );
  registerTechnicalRules();

  const { registerFundamentalRules } = await import(
    "@/src/core/dataIntegrity/rules/fundamental"
  );
  registerFundamentalRules();

  const { registerRecommendationRules } = await import(
    "@/src/core/dataIntegrity/rules/recommendation"
  );
  registerRecommendationRules();

  const { registerTradeSetupRules } = await import(
    "@/src/core/dataIntegrity/rules/tradeSetup"
  );
  registerTradeSetupRules();

  const { registerHallucinationRules } = await import(
    "@/src/core/dataIntegrity/rules/hallucination"
  );
  registerHallucinationRules();

  const { registerHistoricalRules } = await import(
    "@/src/core/dataIntegrity/rules/historical"
  );
  registerHistoricalRules();

  const { registerTrustEngine } = await import(
    "@/src/core/dataIntegrity/trust"
  );
  registerTrustEngine();

  const { registerDashboardService } = await import(
    "@/src/core/dataIntegrity/dashboard"
  );
  registerDashboardService();

  const { registerValidationOrchestrator } = await import(
    "@/src/core/dataIntegrity/orchestrator"
  );
  registerValidationOrchestrator();

  const { registerValidationEventBus } = await import(
    "@/src/core/dataIntegrity/events"
  );
  registerValidationEventBus();

  const { registerValidationAnalyticsEngine } = await import(
    "@/src/core/dataIntegrity/analytics"
  );
  registerValidationAnalyticsEngine();

  const {
    registerValidationReportingEngine,
    registerReportExportEngine,
  } = await import("@/src/core/dataIntegrity/reporting");
  registerValidationReportingEngine();
  registerReportExportEngine();

  const { registerValidationDiagnosticsEngine } = await import(
    "@/src/core/dataIntegrity/diagnostics"
  );
  registerValidationDiagnosticsEngine();

  const { registerValidationAdministrationEngine } = await import(
    "@/src/core/dataIntegrity/admin"
  );
  registerValidationAdministrationEngine();

  const { registerValidationOptimizationEngine } = await import(
    "@/src/core/dataIntegrity/optimization"
  );
  registerValidationOptimizationEngine();

  const { registerValidationReliabilityEngine } = await import(
    "@/src/core/dataIntegrity/reliability"
  );
  registerValidationReliabilityEngine();

  const { registerValidationObservabilityEngine } = await import(
    "@/src/core/dataIntegrity/observability"
  );
  registerValidationObservabilityEngine();

  const { registerValidationIntelligenceEngine } = await import(
    "@/src/core/dataIntegrity/intelligence"
  );
  registerValidationIntelligenceEngine();

  const { registerValidationComplianceEngine } = await import(
    "@/src/core/dataIntegrity/compliance"
  );
  registerValidationComplianceEngine();

  const { registerValidationKnowledgeGraph } = await import(
    "@/src/core/dataIntegrity/knowledge"
  );
  registerValidationKnowledgeGraph();

  const { registerValidationVersioningEngine } = await import(
    "@/src/core/dataIntegrity/versioning"
  );
  registerValidationVersioningEngine();

  const { registerSecurity } = await import(
    "@/src/core/dataIntegrity/security"
  );
  registerSecurity();

  const { registerPerformance } = await import(
    "@/src/core/dataIntegrity/performance"
  );
  registerPerformance();

  const { registerExplainability } = await import(
    "@/src/core/dataIntegrity/explainability"
  );
  registerExplainability();

  const { registerSimulation } = await import(
    "@/src/core/dataIntegrity/simulation"
  );
  registerSimulation();

  const { registerLearning } = await import(
    "@/src/core/dataIntegrity/learning"
  );
  registerLearning();

  const { registerRelease } = await import(
    "@/src/core/dataIntegrity/release"
  );
  registerRelease();

  const { registerDocumentation } = await import(
    "@/src/core/dataIntegrity/documentation"
  );
  registerDocumentation();

  const { registerValidationPlatform } = await import(
    "@/src/core/dataIntegrity/platform"
  );
  registerValidationPlatform();

  const { registerEarningsData } = await import("@/src/core/earnings/data");
  registerEarningsData();

  const { registerFinancialParser } = await import(
    "@/src/core/earnings/parser"
  );
  registerFinancialParser();

  const { registerAlertEngine } = await import("@/src/core/alerts");
  registerAlertEngine();

  platformDone = true;
  console.info(
    `[EquityOS bootstrap] institutional platform ready in ${Date.now() - started}ms`
  );
  // Breadth warm removed — client hydrate + SWR populate widgets without
  // contending with first dashboard paint on the Node event loop.
}

/**
 * Ensure validation/earnings/alerts registrations have run.
 * Safe to call from validation routes before first use.
 */
export function ensureInstitutionalPlatformRegistered(): Promise<void> {
  if (platformDone) return Promise.resolve();
  if (platformPromise) return platformPromise;
  platformPromise = registerInstitutionalPlatform().catch((error) => {
    platformPromise = null;
    throw error;
  });
  return platformPromise;
}

export function queueOpportunitySchedulerBootstrap(): void {
  if (schedulerQueued) return;
  schedulerQueued = true;

  const delay = schedulerDelayMs();
  schedule(() => {
    const started = Date.now();
    void (async () => {
      try {
        const { ensurePersistedDataHydrated } = await import(
          "@/lib/opportunity-engine/persistence"
        );
        await ensurePersistedDataHydrated();
        const { startOpportunityScheduler } = await import(
          "@/lib/opportunity-engine/scheduler"
        );
        startOpportunityScheduler();
        console.info(
          `[EquityOS bootstrap] opportunity scheduler started after ${Date.now() - started}ms (delay ${delay}ms)`
        );
      } catch (error) {
        console.error("[EquityOS bootstrap] scheduler failed:", error);
      }
    })();
  }, delay);
}

export function queueInstitutionalPlatformBootstrap(): void {
  if (platformQueued) return;
  platformQueued = true;

  const delay = platformDelayMs();
  schedule(() => {
    void ensureInstitutionalPlatformRegistered().catch((error) => {
      console.error("[EquityOS bootstrap] platform registration failed:", error);
    });
  }, delay);
}
