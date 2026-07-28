"use client";

/**
 * Sprint 10C.1 — Institutional recommendation cards (presentation only).
 * Neutral surface · strategy accent strip · compressed height · 44px CTA.
 */

import { useOptionalRecommendationDetailDrawer } from "@/components/recommendations/detail-drawer";
import {
  NO_RECOMMENDATION_AVAILABLE_MESSAGE,
  type InstitutionalStrategyId,
  type InstitutionalStrategySlot,
} from "@/lib/recommendations";
import { HORIZON_COLORS } from "@/lib/recommendations/horizons/colors";
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

function formatUpside(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
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

const ICON_CLASS = "h-4 w-4 stroke-[1.75]";

const HORIZON_ICONS: Record<InstitutionalStrategyId, ReactNode> = {
  scalping: <Target className={ICON_CLASS} aria-hidden />,
  intraday: <Zap className={ICON_CLASS} aria-hidden />,
  btst: <Moon className={ICON_CLASS} aria-hidden />,
  swing: <TrendingUp className={ICON_CLASS} aria-hidden />,
  short_term: <Hourglass className={ICON_CLASS} aria-hidden />,
  medium_term: <Rocket className={ICON_CLASS} aria-hidden />,
  long_term: <Trophy className={ICON_CLASS} aria-hidden />,
};

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-micro font-medium uppercase tracking-[0.04em] text-text-muted">
        {label}
      </p>
      <p
        className={`mt-1 break-words text-body font-semibold tabular-nums leading-[1.3] ${
          emphasize ? "text-emerald-400" : "text-text-primary"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function CardRefreshScan() {
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
      className="eos-btn w-full bg-white/10 text-text-primary hover:bg-white/15"
    >
      <RefreshCw
        className={`h-4 w-4 stroke-[1.75] ${refreshing ? "animate-spin" : ""}`}
        aria-hidden
      />
      {refreshing ? "Refreshing…" : "Refresh Scan"}
    </button>
  );
}

function StrategyCard({ slot }: { slot: InstitutionalStrategySlot }) {
  const colors = HORIZON_COLORS[slot.strategyId] ?? HORIZON_COLORS.intraday;
  const pick = slot.pick;
  const drawer = useOptionalRecommendationDetailDrawer();
  const hasRecommendations =
    (slot.recommendationCount ?? 0) > 0 || pick != null;
  const icon = HORIZON_ICONS[slot.strategyId] ?? HORIZON_ICONS.intraday;

  function openPickDrawer(): void {
    if (!pick || !drawer) return;
    drawer.openFromStrategyPick(pick, "dashboard");
  }

  return (
    <article className="group relative flex h-full min-h-[256px] w-full flex-col overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-raised transition-[border-color] duration-150 hover:border-surface-border">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: colors.hex }}
      />

      <header className="relative flex items-center gap-2 px-4 pb-0 pt-3 pl-5">
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-micro font-semibold"
          style={{
            backgroundColor: `rgba(${colors.rgb}, 0.14)`,
            color: colors.hex,
          }}
        >
          {icon}
          {slot.label}
        </span>
      </header>

      <div className="relative flex flex-1 flex-col gap-3 px-4 py-3 pl-5">
        {pick ? (
          <>
            <button
              type="button"
              onClick={openPickDrawer}
              className="min-w-0 rounded-lg text-left transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={`Open research for ${pick.company}`}
            >
              <p className="line-clamp-2 text-card-title font-semibold text-text-primary">
                {pick.company}
              </p>
              <p className="mt-1 text-caption font-medium text-text-muted">
                {pick.symbol}
              </p>
            </button>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <Stat
                label="AI Conviction"
                value={`${Math.round(pick.conviction)}`}
                emphasize
              />
              <Stat
                label="Consensus"
                value={
                  typeof pick.consensusScore === "number"
                    ? pick.consensusScore.toFixed(1)
                    : "—"
                }
              />
              <Stat
                label="Hist. Confidence"
                value={
                  typeof pick.historicalConfidence === "number"
                    ? `${Math.round(pick.historicalConfidence)}`
                    : "—"
                }
              />
              <Stat
                label="Expected Upside"
                value={formatUpside(pick.expectedUpsidePercent)}
                emphasize
              />
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-surface-border-subtle pt-3">
              <Stat label="Entry" value={formatEntry(pick)} />
              <Stat label="Stop" value="—" />
              <Stat
                label="Target"
                value={formatPrice(pick.primaryTarget ?? null)}
                emphasize
              />
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col justify-center gap-2 py-2">
            <p className="text-caption font-semibold text-text-secondary">
              {NO_RECOMMENDATION_AVAILABLE_MESSAGE}
            </p>
            <p className="text-micro text-text-muted">
              No validated idea for this horizon yet.
            </p>
          </div>
        )}
      </div>

      <footer className="relative mt-auto px-4 pb-3 pl-5 pt-1">
        {hasRecommendations ? (
          <Link
            href={slot.href}
            className="eos-btn w-full bg-emerald-600 text-white hover:bg-emerald-500"
          >
            View Research
          </Link>
        ) : (
          <CardRefreshScan />
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
      className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-4 xl:grid-cols-7"
      role="list"
      aria-label="EquityOS Recommendations"
    >
      {slots.map((slot) => (
        <div
          key={slot.strategyId}
          role="listitem"
          className="flex min-h-0 min-w-0"
        >
          <StrategyCard slot={slot} />
        </div>
      ))}
    </div>
  );
}
