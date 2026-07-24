"use client";

/**
 * Sprint 9A.1 — Institutional Opportunity Dashboard cards.
 * Presentation only over ranked slots from the master OE pool.
 */

import {
  INSTITUTIONAL_STRATEGY_META,
  NO_HIGH_CONVICTION_MESSAGE,
  type InstitutionalStrategyId,
  type InstitutionalStrategySlot,
} from "@/lib/recommendations";
import {
  Hourglass,
  Moon,
  Rocket,
  Target,
  Trophy,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

function formatPrice(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "—";
  }
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatScanTime(timestamp: string | null | undefined): string {
  if (!timestamp || typeof timestamp !== "string" || timestamp.startsWith("1970")) {
    return "Last scan: --";
  }
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Last scan: --";
    const formatted = date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `Last scan: ${formatted}`;
  } catch {
    return "Last scan: --";
  }
}

function formatUpside(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function EntryDisplay({
  pick,
  accentClass,
}: {
  pick: NonNullable<InstitutionalStrategySlot["pick"]>;
  accentClass: string;
}) {
  const entryLow = pick.entryLow ?? null;
  const entryHigh = pick.entryHigh ?? null;
  const entryIdeal =
    typeof pick.entry === "number" && Number.isFinite(pick.entry) && pick.entry > 0
      ? pick.entry
      : null;
  const isZone =
    pick.entryMode === "zone" &&
    entryLow != null &&
    entryHigh != null &&
    entryLow > 0 &&
    entryHigh > 0;

  return (
    <div>
      <dt className="text-white/45">
        {isZone ? "Entry Zone" : "Ideal Entry"}
      </dt>
      <dd className="font-medium text-white/90">
        {isZone
          ? `${formatPrice(entryLow)} – ${formatPrice(entryHigh)}`
          : formatPrice(entryIdeal)}
      </dd>
      {pick.entryAtMarket ? (
        <p className={`mt-0.5 text-xs font-medium ${accentClass}`}>
          Market at ideal entry
        </p>
      ) : null}
    </div>
  );
}

interface StrategyTheme {
  icon: ReactNode;
  accent: string;
  borderGlow: string;
  button: string;
  buttonHover: string;
  background: string;
  ring: string;
  progress: string;
}

const THEMES: Record<InstitutionalStrategyId, StrategyTheme> = {
  intraday: {
    icon: <Zap className="h-4 w-4" />,
    accent: "text-sky-300",
    borderGlow: "shadow-[0_0_24px_-6px_rgba(56,189,248,0.55)] border-sky-400/40",
    button: "bg-sky-500 text-slate-950",
    buttonHover: "hover:bg-sky-400",
    background:
      "bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950/80",
    ring: "stroke-sky-400",
    progress: "text-sky-300",
  },
  swing: {
    icon: <TrendingUp className="h-4 w-4" />,
    accent: "text-emerald-300",
    borderGlow:
      "shadow-[0_0_24px_-6px_rgba(52,211,153,0.55)] border-emerald-400/40",
    button: "bg-emerald-500 text-slate-950",
    buttonHover: "hover:bg-emerald-400",
    background:
      "bg-gradient-to-br from-slate-950 via-emerald-950/70 to-slate-900",
    ring: "stroke-emerald-400",
    progress: "text-emerald-300",
  },
  btst: {
    icon: <Moon className="h-4 w-4" />,
    accent: "text-violet-300",
    borderGlow:
      "shadow-[0_0_24px_-6px_rgba(167,139,250,0.55)] border-violet-400/40",
    button: "bg-violet-500 text-white",
    buttonHover: "hover:bg-violet-400",
    background:
      "bg-gradient-to-br from-slate-950 via-violet-950/80 to-slate-900",
    ring: "stroke-violet-400",
    progress: "text-violet-300",
  },
  scalping: {
    icon: <Target className="h-4 w-4" />,
    accent: "text-orange-300",
    borderGlow:
      "shadow-[0_0_24px_-6px_rgba(251,146,60,0.55)] border-orange-400/40",
    button: "bg-orange-500 text-slate-950",
    buttonHover: "hover:bg-orange-400",
    background:
      "bg-gradient-to-br from-slate-950 via-amber-950/70 to-slate-900",
    ring: "stroke-orange-400",
    progress: "text-orange-300",
  },
  short_term: {
    icon: <Hourglass className="h-4 w-4" />,
    accent: "text-cyan-300",
    borderGlow:
      "shadow-[0_0_24px_-6px_rgba(34,211,238,0.55)] border-cyan-400/40",
    button: "bg-cyan-500 text-slate-950",
    buttonHover: "hover:bg-cyan-400",
    background:
      "bg-gradient-to-br from-slate-950 via-teal-950/70 to-slate-900",
    ring: "stroke-cyan-400",
    progress: "text-cyan-300",
  },
  medium_term: {
    icon: <Rocket className="h-4 w-4" />,
    accent: "text-amber-200",
    borderGlow:
      "shadow-[0_0_24px_-6px_rgba(251,191,36,0.55)] border-amber-400/40",
    button: "bg-amber-400 text-slate-950",
    buttonHover: "hover:bg-amber-300",
    background:
      "bg-gradient-to-br from-slate-950 via-yellow-950/60 to-slate-900",
    ring: "stroke-amber-400",
    progress: "text-amber-200",
  },
  long_term: {
    icon: <Trophy className="h-4 w-4" />,
    accent: "text-rose-300",
    borderGlow:
      "shadow-[0_0_24px_-6px_rgba(244,114,182,0.55)] border-rose-400/40",
    button: "bg-rose-500 text-white",
    buttonHover: "hover:bg-rose-400",
    background:
      "bg-gradient-to-br from-slate-950 via-rose-950/70 to-slate-900",
    ring: "stroke-rose-400",
    progress: "text-rose-300",
  },
};

function ConvictionRing({
  value,
  ringClass,
  textClass,
}: {
  value: number;
  ringClass: string;
  textClass: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative h-12 w-12 shrink-0" aria-label={`Conviction ${clamped}%`}>
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44" aria-hidden>
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-white/10"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={ringClass}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold ${textClass}`}
      >
        {clamped}%
      </span>
    </div>
  );
}

const FALLBACK_THEME: StrategyTheme = THEMES.intraday;

function StrategyCard({ slot }: { slot: InstitutionalStrategySlot }) {
  const theme = THEMES[slot.strategyId] ?? FALLBACK_THEME;
  const meta = INSTITUTIONAL_STRATEGY_META[slot.strategyId];
  const pick = slot.pick;
  const upsideLabel = pick
    ? formatUpside(pick.expectedUpsidePercent ?? null)
    : null;

  return (
    <article
      className={`group flex w-full flex-col rounded-2xl border backdrop-blur-md transition duration-200 hover:-translate-y-0.5 hover:shadow-xl ${theme.background} ${theme.borderGlow}`}
    >
      <header className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <div className={`flex items-center gap-2 ${theme.accent}`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5">
            {theme.icon}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3px] text-white/80">
              {meta?.emoji ?? ""} Strategy
            </p>
            <h3 className="text-[15px] font-bold tracking-tight text-white">
              {slot.label}
            </h3>
          </div>
        </div>
        {pick ? (
          <ConvictionRing
            value={pick.conviction}
            ringClass={theme.ring}
            textClass={theme.progress}
          />
        ) : null}
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        {pick ? (
          <>
            <div>
              <p className="truncate text-sm font-semibold text-white">
                {pick.company}
              </p>
              <p className={`mt-0.5 text-xs font-medium ${theme.accent}`}>
                {pick.symbol}
              </p>
            </div>
            <dl className="data-secondary grid grid-cols-2 gap-x-3 gap-y-2">
              <div>
                <dt className="text-white/70">Current</dt>
                <dd className="font-medium text-white/90">
                  {formatPrice(pick.currentPrice)}
                </dd>
              </div>
              <EntryDisplay pick={pick} accentClass={theme.accent} />
              <div className="col-span-2">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-white/70">Primary Target</dt>
                  {upsideLabel ? (
                    <span className={`text-xs font-semibold ${theme.accent}`}>
                      Upside {upsideLabel}
                    </span>
                  ) : null}
                </div>
                <dd className="font-medium text-white/90">
                  {formatPrice(pick.primaryTarget ?? null)}
                </dd>
              </div>
            </dl>
          </>
        ) : (
          <div className="flex flex-1 items-center">
            <p className="text-[14px] font-medium leading-relaxed text-white/70">
              {NO_HIGH_CONVICTION_MESSAGE}
            </p>
          </div>
        )}

        <p className="mt-auto text-xs font-medium text-white/70">
          {formatScanTime(slot.lastScanTime)}
        </p>
      </div>

      <footer className="px-4 pb-4">
        <Link
          href={slot.href}
          className={`inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold tracking-wide transition ${theme.button} ${theme.buttonHover}`}
        >
          View More
        </Link>
      </footer>
    </article>
  );
}

export function InstitutionalOpportunityDashboard({
  slots,
}: {
  slots: InstitutionalStrategySlot[];
}) {
  return (
    <div
      className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-7 xl:overflow-x-auto"
      role="list"
      aria-label="Institutional opportunity strategies"
    >
      {slots.map((slot) => (
        <div key={slot.strategyId} role="listitem" className="flex">
          <StrategyCard slot={slot} />
        </div>
      ))}
    </div>
  );
}
