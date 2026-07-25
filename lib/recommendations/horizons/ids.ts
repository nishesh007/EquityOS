/**
 * Sprint 9F.2 — Canonical horizon ids (shared, no circular imports).
 */

export type InstitutionalStrategyId =
  | "intraday"
  | "swing"
  | "btst"
  | "scalping"
  | "short_term"
  | "medium_term"
  | "long_term";

export const INSTITUTIONAL_STRATEGY_IDS: readonly InstitutionalStrategyId[] =
  Object.freeze([
    "intraday",
    "swing",
    "btst",
    "scalping",
    "short_term",
    "medium_term",
    "long_term",
  ]);

export const INSTITUTIONAL_STRATEGY_META: Record<
  InstitutionalStrategyId,
  {
    label: string;
    emoji: string;
    href: string;
  }
> = {
  intraday: {
    label: "Intraday",
    emoji: "⚡",
    href: "/ai?strategy=intraday",
  },
  swing: {
    label: "Swing",
    emoji: "📈",
    href: "/ai?strategy=swing",
  },
  btst: {
    label: "BTST",
    emoji: "🌙",
    href: "/ai?strategy=btst",
  },
  scalping: {
    label: "Scalping",
    emoji: "🎯",
    href: "/ai?strategy=scalping",
  },
  short_term: {
    label: "Short Term",
    emoji: "⏳",
    href: "/ai?strategy=short_term",
  },
  medium_term: {
    label: "Medium Term",
    emoji: "🚀",
    href: "/ai?strategy=medium_term",
  },
  long_term: {
    label: "Long Term",
    emoji: "🏆",
    href: "/ai?strategy=long_term",
  },
};
