/**
 * Deterministic seeded pseudo-random helper for sandboxed simulations.
 */

export function seededUnit(seed: number, salt: number): number {
  let x = Math.imul(seed ^ salt, 0x9e3779b1);
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x = x ^ (x >>> 16);
  return ((x >>> 0) % 10_000) / 10_000;
}
