/**
 * R4 presentation tokens — section accent palette.
 * Pure styling map (Tailwind literal classes); no business logic.
 *
 * Market Pulse → emerald · AI Opportunities → blue · Portfolio → amber
 * Watchlist → cyan · Research → violet · Market Intelligence → indigo
 * Economic Calendar → orange · Investment Intelligence → purple
 */

export type SectionAccent =
  | "emerald"
  | "blue"
  | "amber"
  | "cyan"
  | "violet"
  | "indigo"
  | "orange"
  | "purple";

export interface SectionAccentTokens {
  /** Heading / icon foreground. */
  text: string;
  /** Icon chip background (subtle tint). */
  chipBg: string;
  /** 4px card accent strip. */
  strip: string;
  /** Section divider gradient. */
  divider: string;
  /** Subtle tinted card background (5–8% opacity). */
  tintBg: string;
  /** Tinted border. */
  tintBorder: string;
}

export const SECTION_ACCENTS: Record<SectionAccent, SectionAccentTokens> = {
  emerald: {
    text: "text-emerald-400",
    chipBg: "bg-emerald-500/10",
    strip: "bg-emerald-500/70",
    divider: "from-emerald-500/60 via-emerald-500/20 to-transparent",
    tintBg: "bg-emerald-500/5",
    tintBorder: "border-emerald-500/15",
  },
  blue: {
    text: "text-sky-400",
    chipBg: "bg-sky-500/10",
    strip: "bg-sky-500/70",
    divider: "from-sky-500/60 via-sky-500/20 to-transparent",
    tintBg: "bg-sky-500/5",
    tintBorder: "border-sky-500/15",
  },
  amber: {
    text: "text-amber-400",
    chipBg: "bg-amber-500/10",
    strip: "bg-amber-500/70",
    divider: "from-amber-500/60 via-amber-500/20 to-transparent",
    tintBg: "bg-amber-500/5",
    tintBorder: "border-amber-500/15",
  },
  cyan: {
    text: "text-cyan-400",
    chipBg: "bg-cyan-500/10",
    strip: "bg-cyan-500/70",
    divider: "from-cyan-500/60 via-cyan-500/20 to-transparent",
    tintBg: "bg-cyan-500/5",
    tintBorder: "border-cyan-500/15",
  },
  violet: {
    text: "text-violet-400",
    chipBg: "bg-violet-500/10",
    strip: "bg-violet-500/70",
    divider: "from-violet-500/60 via-violet-500/20 to-transparent",
    tintBg: "bg-violet-500/5",
    tintBorder: "border-violet-500/15",
  },
  indigo: {
    text: "text-indigo-400",
    chipBg: "bg-indigo-500/10",
    strip: "bg-indigo-500/70",
    divider: "from-indigo-500/60 via-indigo-500/20 to-transparent",
    tintBg: "bg-indigo-500/5",
    tintBorder: "border-indigo-500/15",
  },
  orange: {
    text: "text-orange-400",
    chipBg: "bg-orange-500/10",
    strip: "bg-orange-500/70",
    divider: "from-orange-500/60 via-orange-500/20 to-transparent",
    tintBg: "bg-orange-500/5",
    tintBorder: "border-orange-500/15",
  },
  purple: {
    text: "text-purple-400",
    chipBg: "bg-purple-500/10",
    strip: "bg-purple-500/70",
    divider: "from-purple-500/60 via-purple-500/20 to-transparent",
    tintBg: "bg-purple-500/5",
    tintBorder: "border-purple-500/15",
  },
};
