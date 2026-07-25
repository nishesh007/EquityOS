"use client";

/**
 * Sprint 10C.5 — Final UI freeze (typography & branding).
 * Presentation only — no recommendation logic or calculation changes.
 */

import {
  NO_RECOMMENDATION_AVAILABLE_MESSAGE,
  type InstitutionalStrategyId,
  type InstitutionalStrategySlot,
} from "@/lib/recommendations";
import {
  HORIZON_COLORS,
  horizonCardSurfaceStyle,
} from "@/lib/recommendations/horizons/colors";
import {
  Hourglass,
  Moon,
  RefreshCw,
  Rocket,
  Target,
  Trophy,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

function formatPrice(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "—";
  }
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatUpside(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatEntry(
  pick: NonNullable<InstitutionalStrategySlot["pick"]>
): string {
  const entryLow = pick.entryLow ?? null;
  const entryHigh = pick.entryHigh ?? null;
  const isZone =
    pick.entryMode === "zone" &&
    entryLow != null &&
    entryHigh != null &&
    entryLow > 0 &&
    entryHigh > 0;
  if (isZone) {
    return `${formatPrice(entryLow)} – ${formatPrice(entryHigh)}`;
  }
  return formatPrice(pick.entry);
}

const ICON_CLASS = "h-3.5 w-3.5 stroke-[1.75]";

const HORIZON_ICONS: Record<InstitutionalStrategyId, ReactNode> = {
  scalping: <Target className={ICON_CLASS} aria-hidden />,
  intraday: <Zap className={ICON_CLASS} aria-hidden />,
  btst: <Moon className={ICON_CLASS} aria-hidden />,
  swing: <TrendingUp className={ICON_CLASS} aria-hidden />,
  short_term: <Hourglass className={ICON_CLASS} aria-hidden />,
  medium_term: <Rocket className={ICON_CLASS} aria-hidden />,
  long_term: <Trophy className={ICON_CLASS} aria-hidden />,
};

function ConvictionRing({
  value,
  strokeColor,
  textClass,
}: {
  value: number;
  strokeColor: string;
  textClass: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="strategy-card-ring relative h-8 w-8 shrink-0 transition-[filter] duration-[160ms] ease-out group-hover:brightness-110"
      aria-label={`Conviction ${clamped}%`}
      style={{ filter: `drop-shadow(0 0 5px ${strokeColor}55)` }}
    >
      <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36" aria-hidden>
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-white/12"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums ${textClass}`}
      >
        {clamped}
      </span>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/45">
        {label}
      </p>
      <p
        className={`mt-0.5 break-words text-[14px] font-semibold leading-snug tabular-nums ${
          valueClass ?? "text-white/90"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CardRefreshScan({ hex, rgb }: { hex: string; rgb: string }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh(): Promise<void> {
    setRefreshing(true);
    try {
      const response = await fetch("/api/opportunities/scan", {
        method: "POST",
      });
      if (response.ok) router.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void refresh()}
      disabled={refreshing}
      className="strategy-card-cta inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-medium tracking-wide text-white transition duration-[160ms] ease-out will-change-transform hover:-translate-y-px hover:scale-[1.015] disabled:opacity-60"
      style={{
        backgroundColor: hex,
        boxShadow: `0 8px 20px -10px rgba(${rgb}, 0.55)`,
      }}
    >
      <RefreshCw
        className={`h-3.5 w-3.5 stroke-[1.75] ${refreshing ? "animate-spin" : ""}`}
        aria-hidden
      />
      {refreshing ? "Refreshing…" : "Refresh Scan"}
    </button>
  );
}

function StrategyCard({ slot }: { slot: InstitutionalStrategySlot }) {
  const colors = HORIZON_COLORS[slot.strategyId] ?? HORIZON_COLORS.intraday;
  const pick = slot.pick;
  const hasRecommendations =
    (slot.recommendationCount ?? 0) > 0 || pick != null;
  const upsideLabel = pick
    ? formatUpside(pick.expectedUpsidePercent ?? null)
    : null;
  const icon = HORIZON_ICONS[slot.strategyId] ?? HORIZON_ICONS.intraday;

  return (
    <article
      style={horizonCardSurfaceStyle(slot.strategyId)}
      className="group strategy-summary-card relative flex h-full w-full flex-col overflow-hidden rounded-[1.1rem] border backdrop-blur-xl transition-[transform,box-shadow,filter] duration-[160ms] ease-out hover:-translate-y-[3px] hover:brightness-[1.04]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-0 h-12 rounded-b-full opacity-35 blur-2xl transition-opacity duration-[160ms] ease-out group-hover:opacity-60"
        style={{ backgroundColor: `rgba(${colors.rgb}, 0.35)` }}
      />

      <header className="relative flex items-start justify-between gap-2 px-3.5 pb-0 pt-3.5">
        <div className="flex min-w-0 flex-1 items-start gap-1.5">
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            style={{
              backgroundColor: `rgba(${colors.rgb}, 0.2)`,
              color: colors.hex,
            }}
          >
            {icon}
          </span>
          <h3
            className="text-[16px] font-semibold leading-snug tracking-tight"
            style={{ color: colors.hex }}
          >
            {slot.label}
          </h3>
        </div>
        {pick ? (
          <ConvictionRing
            value={pick.conviction}
            strokeColor={colors.hex}
            textClass={colors.progress}
          />
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: `rgba(${colors.rgb}, 0.15)`,
              color: colors.hex,
            }}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </header>

      <div className="relative flex flex-1 flex-col gap-2 px-3.5 py-2.5">
        {pick ? (
          <>
            <div className="min-w-0">
              <p className="line-clamp-2 text-[15px] font-bold leading-snug text-white">
                {pick.company}
              </p>
              <p
                className="mt-0.5 text-[12px] font-medium leading-normal"
                style={{ color: `rgba(${colors.rgb}, 0.95)` }}
              >
                {pick.symbol}
              </p>
            </div>

            {upsideLabel ? (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/45">
                  Upside
                </p>
                <p
                  className="mt-0.5 text-[14px] font-semibold leading-snug tabular-nums"
                  style={{ color: colors.hex }}
                >
                  {upsideLabel}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-2">
              <Metric
                label="Entry Range"
                value={formatEntry(pick)}
                valueClass="text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <Metric
                  label="Current"
                  value={formatPrice(pick.currentPrice)}
                />
                <Metric
                  label="Primary Target"
                  value={formatPrice(pick.primaryTarget ?? null)}
                  valueClass={colors.accent}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-start justify-center gap-1.5 py-1">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `rgba(${colors.rgb}, 0.16)`,
                color: colors.hex,
              }}
              aria-hidden
            >
              {icon}
            </span>
            <p
              className="text-[13px] font-semibold leading-snug"
              style={{ color: colors.hex }}
            >
              {NO_RECOMMENDATION_AVAILABLE_MESSAGE}
            </p>
            <p className="text-[11px] leading-relaxed text-white/50">
              No validated idea for this horizon yet.
            </p>
          </div>
        )}
      </div>

      <footer className="relative mt-auto px-3.5 pb-3.5 pt-3">
        {hasRecommendations ? (
          <Link
            href={slot.href}
            className="strategy-card-cta inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-[11px] font-medium tracking-wide transition duration-[160ms] ease-out will-change-transform hover:-translate-y-px hover:scale-[1.015]"
            style={{
              backgroundColor: colors.hex,
              color:
                slot.strategyId === "scalping" ||
                slot.strategyId === "intraday" ||
                slot.strategyId === "long_term"
                  ? "#ffffff"
                  : "#0b1220",
              boxShadow: `0 8px 22px -10px rgba(${colors.rgb}, 0.6)`,
            }}
          >
            View More
          </Link>
        ) : (
          <CardRefreshScan hex={colors.hex} rgb={colors.rgb} />
        )}
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
      className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-4 xl:grid-cols-7 xl:gap-3 xl:overflow-x-auto"
      role="list"
      aria-label="EquityOS Recommendations"
    >
      {slots.map((slot) => (
        <div key={slot.strategyId} role="listitem" className="flex min-h-0 min-w-0">
          <StrategyCard slot={slot} />
        </div>
      ))}
    </div>
  );
}
