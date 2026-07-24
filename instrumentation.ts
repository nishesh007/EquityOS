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
  // Opportunity / Continuous Engine scheduler starts post-hydration via
  // /api/opportunities/scan?async=1 — never from instrumentation boot.
  const { queueInstitutionalPlatformBootstrap } = await import(
    "@/lib/dev/deferred-bootstrap"
  );

  queueInstitutionalPlatformBootstrap();

  console.info(
    `[EquityOS bootstrap] instrumentation queued in ${Date.now() - started}ms (deferred; OE scheduler deferred to hydration)`
  );
}
