/**
 * Centralized research / company-page numeric formatting.
 * Prevents floating-point precision artifacts and keeps institutional display consistent.
 *
 * Rules:
 * - Scores (0–100): whole numbers
 * - Percentages: max 1 decimal
 * - Ratios / multiples: max 2 decimals
 * - Prices: 2 decimals
 * - Large INR (Cr / Lakh): 1 decimal where appropriate
 */

export type ResearchNumberKind =
  | "score"
  | "percent"
  | "ratio"
  | "price"
  | "compact"
  | "auto";

/** Round with epsilon protection against 47.800000000000001-style artifacts. */
export function roundResearch(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return NaN;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Stable fixed-decimal string; strips trailing zeros after the decimal. */
export function toFixedTrimmed(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = roundResearch(value, decimals);
  if (decimals <= 0) return String(Math.round(rounded));
  let text = rounded.toFixed(decimals);
  if (text.includes(".")) {
    text = text.replace(/\.?0+$/, "");
  }
  return text === "-0" ? "0" : text;
}

/** Scores 0–100 → whole numbers (e.g. 62). */
export function formatScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return String(Math.round(value));
}

/**
 * Percentages → max 1 decimal (e.g. 47.8%).
 * Pass `signed: true` for +/− change displays.
 */
export function formatPercentValue(
  value: number | null | undefined,
  options: { signed?: boolean; suffix?: boolean } = {}
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const { signed = false, suffix = true } = options;
  const text = toFixedTrimmed(value, 1);
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${text}${suffix ? "%" : ""}`;
}

/** Ratios / multiples → max 2 decimals (e.g. 0.68x). */
export function formatRatioValue(
  value: number | null | undefined,
  suffix = "x"
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${toFixedTrimmed(value, 2)}${suffix}`;
}

/** Equity prices → 2 decimals with ₹. */
export function formatPriceValue(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  const rounded = roundResearch(value, decimals);
  return `₹${rounded.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Large INR magnitudes (Cr / Lakh) → 1 decimal when fractional. */
export function formatCompactInr(
  value: number | null | undefined,
  unit: "Cr" | "L" | "Lakh" | "" = "Cr"
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const decimals = abs >= 100 ? 0 : 1;
  const text = toFixedTrimmed(value, decimals);
  const unitLabel = unit === "Lakh" ? "L" : unit;
  return unitLabel ? `₹${text} ${unitLabel}` : `₹${text}`;
}

/**
 * Format a trend / series point using its unit hint.
 * Units: %, x, ₹, Cr, etc.
 */
export function formatByUnit(
  value: number | null | undefined,
  unit?: string | null
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const u = (unit ?? "").trim();

  if (u === "%" || u.toLowerCase() === "pct") {
    return formatPercentValue(value);
  }
  if (u === "x" || u.toLowerCase() === "ratio") {
    return formatRatioValue(value);
  }
  if (u === "₹" || u.toLowerCase() === "inr" || u.toLowerCase() === "rs") {
    return formatPriceValue(value, Math.abs(value) >= 100 ? 0 : 2);
  }
  if (u === "Cr" || u === "L" || /^lakh/i.test(u)) {
    const label = u === "Lakh" ? "L" : u;
    return `${toFixedTrimmed(value, Math.abs(value) >= 100 ? 0 : 1)} ${label}`;
  }
  if (!u) {
    return toFixedTrimmed(value, 2);
  }
  return `${toFixedTrimmed(value, 2)} ${u}`;
}

/** Parse a numeric token from a mixed metric string. */
function parseNumericToken(raw: string): number | null {
  const match = raw.replace(/,/g, "").match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i);
  if (!match) return null;
  const n = Number.parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Clean any research metric string that may embed float artifacts.
 * Examples:
 *   "80.8267716535433% ROE" → "80.8% ROE"
 *   "0.683333x D/E" → "0.68x D/E"
 *   "47.800000000000001" → "47.8"
 */
export function formatResearchMetric(
  raw: string | number | null | undefined,
  kind: ResearchNumberKind = "auto"
): string {
  if (raw == null) return "—";

  if (typeof raw === "number") {
    switch (kind) {
      case "score":
        return formatScore(raw);
      case "percent":
        return formatPercentValue(raw);
      case "ratio":
        return formatRatioValue(raw);
      case "price":
        return formatPriceValue(raw);
      case "compact":
        return formatCompactInr(raw);
      default:
        return toFixedTrimmed(raw, 2);
    }
  }

  const text = String(raw).trim();
  if (!text) return "—";

  const lower = text.toLowerCase();
  const n = parseNumericToken(text);
  if (n == null) return text;

  const inferred: ResearchNumberKind =
    kind !== "auto"
      ? kind
      : text.includes("%") || /\b(roe|roce|growth|margin|yield)\b/i.test(text)
        ? "percent"
        : /x\b/i.test(text) || /\b(d\/e|p\/e|p\/b|peg|ratio)\b/i.test(text)
          ? "ratio"
          : /₹|inr|cr\b|lakh|\bl\b/i.test(lower)
            ? "compact"
            : "auto";

  let formatted: string;
  switch (inferred) {
    case "score":
      formatted = formatScore(n);
      break;
    case "percent":
      formatted = formatPercentValue(n, { suffix: false });
      break;
    case "ratio":
    case "price":
      formatted = toFixedTrimmed(n, 2);
      break;
    case "compact":
      formatted = toFixedTrimmed(n, Math.abs(n) >= 100 ? 0 : 1);
      break;
    default:
      formatted = toFixedTrimmed(n, 2);
  }

  // Replace the first numeric token only — preserve surrounding labels.
  return text.replace(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i, formatted);
}

/** Score label with denominator (e.g. 62/100). */
export function formatScoreLabel(
  value: number | null | undefined,
  max = 100
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${formatScore(value)}/${max}`;
}
