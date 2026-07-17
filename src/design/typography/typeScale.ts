/**
 * Sprint 10C.R5 — professional typography scale.
 *
 * Twelve named variants layered over the R1 typography tokens; every
 * variant carries both a style object (for inline/SVG use) and a Tailwind
 * class string (for components). Sizes are rem-based, so the global font
 * size preference (fontScale.ts) rescales everything proportionally.
 */

import {
  FONT_FAMILIES,
  TYPOGRAPHY_SCALE,
  type TypographyStyle,
} from "../theme/typographyTokens";

export type TypeVariant =
  | "displayXl"
  | "displayL"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodySmall"
  | "caption"
  | "label"
  | "metric"
  | "numeric"
  | "mono";

export const TYPE_VARIANTS: readonly TypeVariant[] = Object.freeze([
  "displayXl",
  "displayL",
  "h1",
  "h2",
  "h3",
  "body",
  "bodySmall",
  "caption",
  "label",
  "metric",
  "numeric",
  "mono",
]);

export const TYPE_SCALE: Readonly<Record<TypeVariant, TypographyStyle>> =
  Object.freeze({
    displayXl: {
      fontFamily: FONT_FAMILIES.sans,
      fontSize: "3rem",
      lineHeight: "1.05",
      fontWeight: 700,
      letterSpacing: "-0.025em",
    },
    displayL: TYPOGRAPHY_SCALE.display,
    h1: TYPOGRAPHY_SCALE.h1,
    h2: TYPOGRAPHY_SCALE.h2,
    h3: TYPOGRAPHY_SCALE.h3,
    body: TYPOGRAPHY_SCALE.body,
    bodySmall: {
      fontFamily: FONT_FAMILIES.sans,
      fontSize: "0.8125rem",
      lineHeight: "1.5",
      fontWeight: 400,
      letterSpacing: "0em",
    },
    caption: TYPOGRAPHY_SCALE.caption,
    label: TYPOGRAPHY_SCALE.label,
    metric: {
      fontFamily: FONT_FAMILIES.sans,
      fontSize: "1.375rem",
      lineHeight: "1.2",
      fontWeight: 600,
      letterSpacing: "-0.01em",
      tabularNums: true,
    },
    numeric: TYPOGRAPHY_SCALE.numeric,
    mono: TYPOGRAPHY_SCALE.monospace,
  });

/** Tailwind class strings per variant (for JSX consumers). */
export const TYPE_CLASSES: Readonly<Record<TypeVariant, string>> =
  Object.freeze({
    displayXl:
      "font-sans text-5xl font-bold leading-none tracking-tight text-text-primary",
    displayL:
      "font-sans text-4xl font-bold leading-tight tracking-tight text-text-primary",
    h1: "font-sans text-3xl font-bold leading-tight tracking-tight text-text-primary",
    h2: "font-sans text-2xl font-semibold leading-snug tracking-tight text-text-primary",
    h3: "font-sans text-xl font-semibold leading-snug text-text-primary",
    body: "font-sans text-sm leading-relaxed text-text-secondary",
    bodySmall: "font-sans text-[13px] leading-normal text-text-secondary",
    caption: "font-sans text-xs leading-snug text-text-muted",
    label:
      "font-sans text-[11px] font-medium uppercase tracking-wider text-text-muted",
    metric:
      "font-sans text-[22px] font-semibold tracking-tight tabular-nums text-text-primary",
    numeric: "font-mono text-sm font-medium tabular-nums text-text-primary",
    mono: "font-mono text-[13px] text-text-secondary",
  });
