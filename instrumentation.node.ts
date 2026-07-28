/**
 * Node-only instrumentation bootstrap.
 * Kept separate so the Edge instrumentation graph never resolves node:fs.
 */

export async function registerNodeBootstrap(): Promise<void> {
  const started = Date.now();
  const { runMarketStateStartupValidation } = await import(
    "@/lib/market/market-state-manager"
  );
  runMarketStateStartupValidation();

  const {
    queueInstitutionalPlatformBootstrap,
    queueOpportunitySchedulerBootstrap,
  } = await import("@/lib/dev/deferred-bootstrap");

  queueInstitutionalPlatformBootstrap();
  queueOpportunitySchedulerBootstrap();

  console.info(
    `[EquityOS bootstrap] instrumentation queued in ${Date.now() - started}ms (deferred platform + OE scheduler)`
  );
}
