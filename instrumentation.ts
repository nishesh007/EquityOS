/**
 * Next.js instrumentation — keep the critical path empty.
 *
 * Heavy opportunity-scheduler + institutional validation registration is
 * deferred so DEV compile / first page render are not blocked by ~3MB of
 * dataIntegrity + earnings + alerts modules.
 *
 * End state matches the previous eager register() — same modules, same
 * idempotent registrars — just scheduled after the server can serve pages.
 * OE scheduler starts deferred (no boot scan); interval ticks respect
 * 09:00–15:30 IST trading hours.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const started = Date.now();
  // Opportunity / Continuous Engine scheduler — deferred so first paint wins.
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
