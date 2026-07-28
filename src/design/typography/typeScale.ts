/**
 * Sprint 10C.1 — professional typography scale on frozen px sizes.
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
    displayXl: TYPOGRAPHY_SCALE.largeNumber,
    displayL: TYPOGRAPHY_SCALE.pageTitle,
    h1: TYPOGRAPHY_SCALE.pageTitle,
    h2: TYPOGRAPHY_SCALE.majorSection,
    h3: TYPOGRAPHY_SCALE.minorSection,
    body: TYPOGRAPHY_SCALE.body,
    bodySmall: TYPOGRAPHY_SCALE.caption,
    caption: TYPOGRAPHY_SCALE.caption,
    label: TYPOGRAPHY_SCALE.label,
    metric: TYPOGRAPHY_SCALE.metric,
    numeric: TYPOGRAPHY_SCALE.numeric,
    mono: TYPOGRAPHY_SCALE.monospace,
  });

export const TYPE_CLASSES: Readonly<Record<TypeVariant, string>> =
  Object.freeze({
    displayXl: "font-sans text-large-number text-text-primary",
    displayL: "font-sans text-page-title text-text-primary",
    h1: "font-sans text-page-title text-text-primary",
    h2: "font-sans text-major-section text-text-primary",
    h3: "font-sans text-minor-section text-text-primary",
    body: "font-sans text-body text-text-secondary",
    bodySmall: "font-sans text-caption text-text-secondary",
    caption: "font-sans text-caption text-text-secondary",
    label:
      "font-sans text-micro font-semibold uppercase tracking-[0.04em] text-text-secondary",
    metric: "font-sans text-metric tabular-nums text-text-primary",
    numeric: "font-sans text-metric tabular-nums text-text-primary",
    mono: "font-sans text-caption text-text-secondary",
  });
