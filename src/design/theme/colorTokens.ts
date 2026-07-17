/**
 * Color token contracts and color math for the EquityOS design system.
 *
 * Every theme supplies one `ThemeColors` palette. Components never reference
 * raw hex values — they consume semantic tokens through CSS variables that
 * the ThemeEngine writes to the document root.
 */

/** Semantic color slots every theme must provide. */
export interface ThemeColors {
  /** Brand primary — main interactive color. */
  primary: string;
  /** Brand secondary — complementary interactive color. */
  secondary: string;
  /** Accent — highlights, links, focus rings. */
  accent: string;
  /** Muted variant of accent for pressed/active states. */
  accentMuted: string;
  /** Positive state (gains, success). */
  success: string;
  /** Muted variant of success. */
  successMuted: string;
  /** Cautionary state. */
  warning: string;
  /** Negative state (losses, errors). */
  danger: string;
  /** Muted variant of danger. */
  dangerMuted: string;
  /** Informational state. */
  info: string;
  /** App background (deepest layer). */
  background: string;
  /** Raised surface (panels, sidebars). */
  surface: string;
  /** Card layer (above surface). */
  card: string;
  /** Hover state for surfaces. */
  surfaceHover: string;
  /** Standard border. */
  border: string;
  /** Subtle border for nested separators. */
  borderSubtle: string;
  /** Muted neutral fill (disabled, skeleton bases). */
  muted: string;
  /** Highest-emphasis text. */
  textPrimary: string;
  /** Medium-emphasis text. */
  textSecondary: string;
  /** Low-emphasis text. */
  textMuted: string;
  /** Faintest text (placeholders, decorative). */
  textFaint: string;
}

export type ColorTokenName = keyof ThemeColors;

/** Ordered list of every semantic color slot (used for validation). */
export const COLOR_TOKEN_NAMES: readonly ColorTokenName[] = Object.freeze([
  "primary",
  "secondary",
  "accent",
  "accentMuted",
  "success",
  "successMuted",
  "warning",
  "danger",
  "dangerMuted",
  "info",
  "background",
  "surface",
  "card",
  "surfaceHover",
  "border",
  "borderSubtle",
  "muted",
  "textPrimary",
  "textSecondary",
  "textMuted",
  "textFaint",
]);

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHexColor(value: string): boolean {
  return HEX_PATTERN.test(value);
}

/** Parse `#rgb` / `#rrggbb` into 0–255 channels. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  if (!isValidHexColor(hex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  let value = hex.slice(1);
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/**
 * Convert hex to a space-separated RGB triplet ("59 130 246").
 * This is the format Tailwind consumes via `rgb(var(--token) / <alpha-value>)`,
 * which keeps opacity modifiers like `bg-accent/20` working across themes.
 */
export function hexToRgbTriplet(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r} ${g} ${b}`;
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colors (1–21). */
export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/** AA thresholds: 4.5 for normal text, 3.0 for large text / UI components. */
export function meetsContrastAA(
  foreground: string,
  background: string,
  level: "text" | "large-text" | "ui" = "text",
): boolean {
  const ratio = contrastRatio(foreground, background);
  return level === "text" ? ratio >= 4.5 : ratio >= 3;
}
