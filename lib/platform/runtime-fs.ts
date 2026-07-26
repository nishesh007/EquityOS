/**
 * Runtime filesystem policy — Sprint production hardening.
 *
 * Vercel / serverless: never mkdir/write under process.cwd() (/var/task).
 * Local development: project `.data/` and `data/` remain writable.
 * Serverless scratch: os.tmpdir() is writable and used for best-effort state.
 */

import os from "node:os";
import path from "node:path";

function cwdLooksReadOnly(): boolean {
  try {
    const cwd = process.cwd().replace(/\\/g, "/");
    if (cwd === "/var/task" || cwd.startsWith("/var/task/")) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function isServerlessRuntime(): boolean {
  if (process.env.VERCEL === "1" || Boolean(process.env.VERCEL)) return true;
  if (process.env.VERCEL_ENV) return true;
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return true;
  if (process.env.LAMBDA_TASK_ROOT) return true;
  return cwdLooksReadOnly();
}

/** True when local disk read/write under process.cwd() is allowed. */
export function isDiskPersistenceEnabled(): boolean {
  if (process.env.EQUITYOS_FORCE_DISK_PERSISTENCE === "1") return true;
  if (process.env.EQUITYOS_DISABLE_DISK_PERSISTENCE === "1") return false;
  if (isServerlessRuntime()) return false;
  return true;
}

/**
 * Writable scratch directory for serverless (Vercel `/tmp`, Lambda `/tmp`).
 * Null when project-disk persistence is enabled (use cwd `.data` instead).
 */
export function getServerlessScratchDir(...segments: string[]): string | null {
  if (isDiskPersistenceEnabled()) return null;
  return path.join(os.tmpdir(), "equityos", ...segments);
}

/** Human-readable persistence mode for logs / health. */
export function diskPersistenceMode(): "disk" | "memory" {
  return isDiskPersistenceEnabled() ? "disk" : "memory";
}
