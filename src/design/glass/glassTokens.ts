/**
 * Sprint 10C.R5 — glassmorphism surface tokens.
 *
 * One canonical recipe: subtle blur, restrained transparency (surfaces stay
 * ≥ 80% opaque for AA-safe text contrast), themed borders and glass shadow.
 */

export const GLASS_SURFACE =
  "border border-surface-border-subtle bg-surface-raised/80 backdrop-blur-xl";

export const GLASS_CLASSES = Object.freeze({
  card: `${GLASS_SURFACE} rounded-xl shadow-glass`,
  panel: `${GLASS_SURFACE} rounded-xl shadow-glass`,
  toolbar: `${GLASS_SURFACE} rounded-lg shadow-card`,
  modal: `${GLASS_SURFACE} rounded-2xl shadow-overlay bg-card/90`,
  dropdown: `${GLASS_SURFACE} rounded-lg shadow-dropdown bg-card/90`,
  sidebar: `${GLASS_SURFACE} shadow-glass`,
  tooltip: `${GLASS_SURFACE} rounded-md shadow-popup bg-card/95`,
  badge: "border border-surface-border bg-surface-raised/70 backdrop-blur-md rounded-full",
} as const);

export type GlassSurfaceToken = keyof typeof GLASS_CLASSES;

export const GLASS_SURFACE_TOKENS: readonly GlassSurfaceToken[] = Object.freeze(
  Object.keys(GLASS_CLASSES) as GlassSurfaceToken[]
);
