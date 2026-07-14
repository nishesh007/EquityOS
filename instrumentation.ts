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
  }
}
