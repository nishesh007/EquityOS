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
 *
 * Node bootstrap lives in `instrumentation.node.ts`. Loaded via `require`
 * (not `import()`) so the Edge instrumentation compile never resolves
 * `node:fs` through the deferred-bootstrap → scheduler → persistence chain.
 * Edge IgnorePlugin in next.config.ts is a second line of defense.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Synchronous require keeps this module out of the Edge webpack graph.
  const { registerNodeBootstrap } =
    require("./instrumentation.node") as typeof import("./instrumentation.node");
  await registerNodeBootstrap();
}
