/**
 * Sprint 10C.1 — Institutional typography freeze.
 * Inter Variable ONLY. Weights 400 / 500 / 600 / 700.
 * Line height 130% everywhere. Consistent letter-spacing.
 *
 * Page Title 34 · Major Section 26 · Minor Section 22 · Card Title 18
 * Metric 32 · Large Number 40 · Body 15 · Caption 13 · Micro 11
 */

export const FONT_FAMILIES = Object.freeze({
  sans: 'var(--font-inter), system-ui, sans-serif',
  mono: 'var(--font-inter), system-ui, sans-serif',
} as const);

export interface TypographyStyle {
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing: string;
  tabularNums?: boolean;
  textTransform?: "uppercase" | "none";
}

export type TypographyRole =
  | "pageTitle"
  | "majorSection"
  | "minorSection"
  | "section"
  | "cardTitle"
  | "metric"
  | "largeNumber"
  | "body"
  | "caption"
  | "micro"
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "title"
  | "subtitle"
  | "label"
  | "numeric"
  | "table"
  | "monospace";

export const TYPOGRAPHY_ROLES: readonly TypographyRole[] = Object.freeze([
  "pageTitle",
  "majorSection",
  "minorSection",
  "section",
  "cardTitle",
  "metric",
  "largeNumber",
  "body",
  "caption",
  "micro",
  "display",
  "h1",
  "h2",
  "h3",
  "title",
  "subtitle",
  "label",
  "numeric",
  "table",
  "monospace",
]);

const inter = FONT_FAMILIES.sans;
const LH = "1.3";
const TRACK = "-0.01em";

export const TYPOGRAPHY_SCALE: Readonly<Record<TypographyRole, TypographyStyle>> =
  Object.freeze({
    pageTitle: {
      fontFamily: inter,
      fontSize: "34px",
      lineHeight: LH,
      fontWeight: 700,
      letterSpacing: TRACK,
    },
    majorSection: {
      fontFamily: inter,
      fontSize: "26px",
      lineHeight: LH,
      fontWeight: 600,
      letterSpacing: TRACK,
    },
    minorSection: {
      fontFamily: inter,
      fontSize: "22px",
      lineHeight: LH,
      fontWeight: 600,
      letterSpacing: TRACK,
    },
    section: {
      fontFamily: inter,
      fontSize: "26px",
      lineHeight: LH,
      fontWeight: 600,
      letterSpacing: TRACK,
    },
    cardTitle: {
      fontFamily: inter,
      fontSize: "18px",
      lineHeight: LH,
      fontWeight: 600,
      letterSpacing: TRACK,
    },
    metric: {
      fontFamily: inter,
      fontSize: "32px",
      lineHeight: LH,
      fontWeight: 600,
      letterSpacing: TRACK,
      tabularNums: true,
    },
    largeNumber: {
      fontFamily: inter,
      fontSize: "40px",
      lineHeight: LH,
      fontWeight: 700,
      letterSpacing: TRACK,
      tabularNums: true,
    },
    body: {
      fontFamily: inter,
      fontSize: "15px",
      lineHeight: LH,
      fontWeight: 400,
      letterSpacing: "0em",
    },
    caption: {
      fontFamily: inter,
      fontSize: "13px",
      lineHeight: LH,
      fontWeight: 500,
      letterSpacing: "0em",
    },
    micro: {
      fontFamily: inter,
      fontSize: "11px",
      lineHeight: LH,
      fontWeight: 500,
      letterSpacing: "0.02em",
    },
    display: {
      fontFamily: inter,
      fontSize: "34px",
      lineHeight: LH,
      fontWeight: 700,
      letterSpacing: TRACK,
    },
    h1: {
      fontFamily: inter,
      fontSize: "34px",
      lineHeight: LH,
      fontWeight: 700,
      letterSpacing: TRACK,
    },
    h2: {
      fontFamily: inter,
      fontSize: "26px",
      lineHeight: LH,
      fontWeight: 600,
      letterSpacing: TRACK,
    },
    h3: {
      fontFamily: inter,
      fontSize: "22px",
      lineHeight: LH,
      fontWeight: 600,
      letterSpacing: TRACK,
    },
    title: {
      fontFamily: inter,
      fontSize: "18px",
      lineHeight: LH,
      fontWeight: 600,
      letterSpacing: TRACK,
    },
    subtitle: {
      fontFamily: inter,
      fontSize: "15px",
      lineHeight: LH,
      fontWeight: 500,
      letterSpacing: "0em",
    },
    label: {
      fontFamily: inter,
      fontSize: "11px",
      lineHeight: LH,
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    },
    numeric: {
      fontFamily: inter,
      fontSize: "32px",
      lineHeight: LH,
      fontWeight: 600,
      letterSpacing: "0em",
      tabularNums: true,
    },
    table: {
      fontFamily: inter,
      fontSize: "15px",
      lineHeight: LH,
      fontWeight: 400,
      letterSpacing: "0em",
      tabularNums: true,
    },
    monospace: {
      fontFamily: inter,
      fontSize: "13px",
      lineHeight: LH,
      fontWeight: 400,
      letterSpacing: "0em",
    },
  });
