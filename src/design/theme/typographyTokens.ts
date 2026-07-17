/**
 * Institutional typography hierarchy for the EquityOS design system.
 * Font families resolve through the CSS variables registered in the
 * root layout (Inter + JetBrains Mono).
 */

export const FONT_FAMILIES = Object.freeze({
  sans: 'var(--font-inter), system-ui, sans-serif',
  mono: 'var(--font-jetbrains), ui-monospace, monospace',
} as const);

export interface TypographyStyle {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing: string;
  /** Enables tabular numerals for financial figures. */
  tabularNums?: boolean;
  textTransform?: "uppercase" | "none";
}

export type TypographyRole =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "title"
  | "subtitle"
  | "body"
  | "caption"
  | "label"
  | "numeric"
  | "table"
  | "monospace";

export const TYPOGRAPHY_ROLES: readonly TypographyRole[] = Object.freeze([
  "display",
  "h1",
  "h2",
  "h3",
  "title",
  "subtitle",
  "body",
  "caption",
  "label",
  "numeric",
  "table",
  "monospace",
]);

export const TYPOGRAPHY_SCALE: Readonly<Record<TypographyRole, TypographyStyle>> =
  Object.freeze({
    display: {
      fontFamily: FONT_FAMILIES.sans,
      fontSize: "2.5rem",
      lineHeight: "1.1",
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h1: {
      fontFamily: FONT_FAMILIES.sans,
      fontSize: "1.875rem",
      lineHeight: "1.2",
      fontWeight: 700,
      letterSpacing: "-0.015em",
    },
    h2: {
      fontFamily: FONT_FAMILIES.sans,
      fontSize: "1.5rem",
      lineHeight: "1.25",
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    h3: {
      fontFamily: FONT_FAMILIES.sans,
      fontSize: "1.25rem",
      lineHeight: "1.3",
      fontWeight: 600,
      letterSpacing: "-0.005em",
    },
    title: {
      fontFamily: FONT_FAMILIES.sans,
      fontSize: "1rem",
      lineHeight: "1.4",
      fontWeight: 600,
      letterSpacing: "0em",
    },
    subtitle: {
      fontFamily: FONT_FAMILIES.sans,
      fontSize: "0.875rem",
      lineHeight: "1.45",
      fontWeight: 500,
      letterSpacing: "0em",
    },
    body: {
      fontFamily: FONT_FAMILIES.sans,
      fontSize: "0.875rem",
      lineHeight: "1.55",
      fontWeight: 400,
      letterSpacing: "0em",
    },
    caption: {
      fontFamily: FONT_FAMILIES.sans,
      fontSize: "0.75rem",
      lineHeight: "1.4",
      fontWeight: 400,
      letterSpacing: "0.01em",
    },
    label: {
      fontFamily: FONT_FAMILIES.sans,
      fontSize: "0.6875rem",
      lineHeight: "1.3",
      fontWeight: 500,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    },
    numeric: {
      fontFamily: FONT_FAMILIES.mono,
      fontSize: "0.875rem",
      lineHeight: "1.4",
      fontWeight: 500,
      letterSpacing: "0em",
      tabularNums: true,
    },
    table: {
      fontFamily: FONT_FAMILIES.sans,
      fontSize: "0.8125rem",
      lineHeight: "1.45",
      fontWeight: 400,
      letterSpacing: "0em",
      tabularNums: true,
    },
    monospace: {
      fontFamily: FONT_FAMILIES.mono,
      fontSize: "0.8125rem",
      lineHeight: "1.5",
      fontWeight: 400,
      letterSpacing: "0em",
    },
  });
