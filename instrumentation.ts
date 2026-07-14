export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startOpportunityScheduler } = await import(
      "@/lib/opportunity-engine/scheduler"
    );
    startOpportunityScheduler();

    // Sprint 9F.3 — idempotent institutional market rule registration
    const { registerMarketRules } = await import(
      "@/src/core/dataIntegrity/rules/market"
    );
    registerMarketRules();

    // Sprint 9F.4 — idempotent technical indicator rule registration
    const { registerTechnicalRules } = await import(
      "@/src/core/dataIntegrity/rules/technical"
    );
    registerTechnicalRules();

    // Sprint 9F.5 — idempotent fundamental validation rule registration
    const { registerFundamentalRules } = await import(
      "@/src/core/dataIntegrity/rules/fundamental"
    );
    registerFundamentalRules();

    // Sprint 9F.6 — idempotent AI recommendation validation rule registration
    const { registerRecommendationRules } = await import(
      "@/src/core/dataIntegrity/rules/recommendation"
    );
    registerRecommendationRules();

    // Sprint 9F.7 — idempotent trade setup validation rule registration
    const { registerTradeSetupRules } = await import(
      "@/src/core/dataIntegrity/rules/tradeSetup"
    );
    registerTradeSetupRules();

    // Sprint 9F.8 — idempotent AI hallucination detection rule registration
    const { registerHallucinationRules } = await import(
      "@/src/core/dataIntegrity/rules/hallucination"
    );
    registerHallucinationRules();

    // Sprint 9F.9 — idempotent historical performance validation rule registration
    const { registerHistoricalRules } = await import(
      "@/src/core/dataIntegrity/rules/historical"
    );
    registerHistoricalRules();

    // Sprint 9F.10 — idempotent Institutional Trust Score Engine registration
    const { registerTrustEngine } = await import(
      "@/src/core/dataIntegrity/trust"
    );
    registerTrustEngine();

    // Sprint 9F.11 — idempotent Validation Dashboard Service registration
    const { registerDashboardService } = await import(
      "@/src/core/dataIntegrity/dashboard"
    );
    registerDashboardService();
  }
}
