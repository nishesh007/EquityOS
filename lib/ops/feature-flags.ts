/**
 * Feature flag evaluation — Sprint 12C.
 */

import type { FeatureFlag } from "./types";

function hashPercent(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % 100;
}

export function evaluateFlag(
  flag: FeatureFlag,
  ctx: { userId?: string | null; planId?: string | null }
): boolean {
  if (flag.emergencyDisabled) return false;
  if (!flag.enabled) return false;

  if (flag.scope === "global") {
    return flag.rolloutPercent >= 100 || hashPercent(flag.key) < flag.rolloutPercent;
  }

  if (flag.scope === "user") {
    if (!ctx.userId) return false;
    if (flag.userIds.includes(ctx.userId)) return true;
    return hashPercent(`${flag.key}:${ctx.userId}`) < flag.rolloutPercent;
  }

  if (flag.scope === "plan") {
    if (!ctx.planId) return false;
    if (flag.planIds.length && !flag.planIds.includes(ctx.planId)) return false;
    return hashPercent(`${flag.key}:${ctx.planId}`) < flag.rolloutPercent;
  }

  if (flag.scope === "beta" || flag.scope === "canary") {
    if (ctx.userId && flag.userIds.includes(ctx.userId)) return true;
    if (ctx.planId && flag.planIds.length && !flag.planIds.includes(ctx.planId)) {
      return false;
    }
    const seed = ctx.userId ?? ctx.planId ?? "anon";
    return hashPercent(`${flag.key}:${seed}`) < flag.rolloutPercent;
  }

  return false;
}
