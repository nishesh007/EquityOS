/**
 * Sprint 10C.R5 — institutional elevation and radius aliases.
 *
 * Standardized XS→XL naming layered over the R1 token system. Shadow
 * aliases resolve through the existing `--eos-shadow-*` variables (already
 * mode-aware); hover/focus add interaction elevations.
 */

export type ElevationToken =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "floating"
  | "hover"
  | "focus";

export const ELEVATION_SHADOWS: Readonly<Record<ElevationToken, string>> =
  Object.freeze({
    xs: "0 1px 2px rgba(0, 0, 0, 0.25)",
    sm: "var(--eos-shadow-card)",
    md: "var(--eos-shadow-dropdown)",
    lg: "var(--eos-shadow-popup)",
    xl: "var(--eos-shadow-overlay)",
    floating: "var(--eos-shadow-floating)",
    hover: "var(--eos-shadow-floating)",
    focus: "0 0 0 2px rgb(var(--eos-color-accent) / 0.6)",
  });

export const ELEVATION_ORDER: readonly ElevationToken[] = Object.freeze([
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "floating",
  "hover",
  "focus",
]);

/** Standardized radius aliases (px; circle uses 50%). */
export type RadiusAlias = "xs" | "sm" | "md" | "lg" | "xl" | "pill" | "circle";

export const RADIUS_ALIASES: Readonly<Record<RadiusAlias, string>> =
  Object.freeze({
    xs: "4px",
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "20px",
    pill: "9999px",
    circle: "50%",
  });

/** Standardized icon sizing (px) with consistent stroke widths. */
export type IconSizeToken = "xs" | "sm" | "md" | "lg" | "xl";

export const ICON_SIZES: Readonly<Record<IconSizeToken, number>> =
  Object.freeze({
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
  });

/** Lucide stroke widths: slightly heavier for small glyph legibility. */
export const ICON_STROKE_WIDTHS: Readonly<Record<IconSizeToken, number>> =
  Object.freeze({
    xs: 2,
    sm: 2,
    md: 1.75,
    lg: 1.75,
    xl: 1.5,
  });
