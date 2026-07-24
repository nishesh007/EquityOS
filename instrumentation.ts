/**
 * Next.js instrumentation — keep the critical path empty.
 *
 * Heavy opportunity-scheduler + institutional validation registration is
 * deferred so DEV compile / first page render are not blocked by ~3MB of
 * dataIntegrity + earnings + alerts modules.
 *
 * End state matches the previous eager register() — same modules, same
 * idempotent registrars — just scheduled after the server can serve pages.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const started = Date.now();
  const { queueOpportunitySchedulerBootstrap, queueInstitutionalPlatformBootstrap } =
    await import("@/lib/dev/deferred-bootstrap");

  queueOpportunitySchedulerBootstrap();
  queueInstitutionalPlatformBootstrap();

  console.info(
    `[EquityOS bootstrap] instrumentation queued in ${Date.now() - started}ms (deferred)`
  );
}
