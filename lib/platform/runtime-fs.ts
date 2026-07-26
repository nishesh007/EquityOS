/**
 * Runtime filesystem policy — Sprint production hardening.
 *
 * Vercel / serverless filesystems are read-only under `/var/task`.
 * Local development may still use `.data/` and `data/` folders.
 *
 * Never mkdir/write project directories when disk persistence is disabled.
 */

function cwdLooksReadOnly(): boolean {
  try {
    const cwd = process.cwd().replace(/\\/g, "/");
    // AWS Lambda / Vercel serverless unpack root.
    if (cwd === "/var/task" || cwd.startsWith("/var/task/")) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** True when local disk read/write under process.cwd() is allowed. */
export function isDiskPersistenceEnabled(): boolean {
  if (process.env.EQUITYOS_FORCE_DISK_PERSISTENCE === "1") return true;
  if (process.env.EQUITYOS_DISABLE_DISK_PERSISTENCE === "1") return false;

  // Vercel sets VERCEL=1 (and often VERCEL_ENV).
  if (process.env.VERCEL === "1" || Boolean(process.env.VERCEL)) return false;
  if (process.env.VERCEL_ENV) return false;

  // Generic serverless / Lambda markers.
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return false;
  if (process.env.LAMBDA_TASK_ROOT) return false;

  // Hard read-only deploy root (covers env-var edge cases).
  if (cwdLooksReadOnly()) return false;

  // Production hosts must not assume a writable project tree.
  // Local `next start` can opt back in with EQUITYOS_FORCE_DISK_PERSISTENCE=1.
  if (process.env.NODE_ENV === "production") return false;

  return true;
}

/** Human-readable reason for logs / health. */
export function diskPersistenceMode(): "disk" | "memory" {
  return isDiskPersistenceEnabled() ? "disk" : "memory";
}
