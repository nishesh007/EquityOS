"use client";

import { ConfidenceBar } from "@/components/ui/ConfidenceBar";
import { ActionBadge } from "@/components/ui/ActionBadge";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import {
  FileText,
  RefreshCw,
  Star,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatInr } from "./SectionChrome";
import type {
  RecommendationDetailContext,
} from "./types";

function formatPrice(value: number | null): string {
  return formatInr(value);
}

function formatChange(
  absolute: number | null,
  percent: number | null
): { label: string; tone: "gain" | "loss" | "neutral" } {
  if (percent == null && absolute == null) {
    return { label: "—", tone: "neutral" };
  }
  const pct = percent ?? 0;
  const abs = absolute;
  const sign = pct > 0 || (abs != null && abs > 0) ? "+" : "";
  const parts: string[] = [];
  if (abs != null && Number.isFinite(abs)) {
    parts.push(`${sign}${abs.toFixed(2)}`);
  }
  if (percent != null && Number.isFinite(percent)) {
    parts.push(`${sign}${percent.toFixed(2)}%`);
  }
  const tone =
    pct > 0 || (abs != null && abs > 0)
      ? "gain"
      : pct < 0 || (abs != null && abs < 0)
        ? "loss"
        : "neutral";
  return { label: parts.join(" · ") || "—", tone };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso || "—";
  }
}

function HeaderButton({
  children,
  onClick,
  disabled,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-surface-border-subtle bg-surface/40 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50",
        FOCUS_RING_CLASS,
        className
      )}
    >
      {children}
    </button>
  );
}

export function RecommendationDrawerHeader({
  context,
  onClose,
  closeButtonRef,
}: {
  context: RecommendationDetailContext;
  onClose: () => void;
  closeButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [watchlistAdded, setWatchlistAdded] = useState(false);
  const watchlistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const change = formatChange(context.changeAbsolute, context.changePercent);

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

  function addToWatchlist(): void {
    if (watchlistTimer.current) clearTimeout(watchlistTimer.current);
    setWatchlistAdded(true);
    watchlistTimer.current = setTimeout(() => setWatchlistAdded(false), 1500);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-surface-border-subtle bg-surface-raised/95 px-4 py-3 backdrop-blur-md md:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="recommendation-drawer-title"
              className="truncate text-base font-semibold tracking-tight text-text-primary md:text-lg"
            >
              {context.company}
            </h2>
            <ActionBadge action={context.action} />
          </div>
          <p className="mt-0.5 font-mono text-xs text-text-muted">
            {context.symbol}
            <span className="text-text-faint"> · NSE/BSE</span>
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
            <div>
              <span className="text-text-faint">Price </span>
              <span className="font-mono font-semibold tabular-nums text-text-primary">
                {formatPrice(context.currentPrice)}
              </span>
            </div>
            <div>
              <span className="text-text-faint">Today </span>
              <span
                className={cn(
                  "font-mono font-semibold tabular-nums",
                  change.tone === "gain" && "text-gain",
                  change.tone === "loss" && "text-loss",
                  change.tone === "neutral" && "text-text-secondary"
                )}
              >
                {change.label}
              </span>
            </div>
            <div className="flex min-w-[8rem] items-center gap-2">
              <span className="shrink-0 text-text-faint">Confidence</span>
              <ConfidenceBar value={context.confidence} size="sm" />
            </div>
            <div>
              <span className="text-text-faint">Date </span>
              <span className="text-text-secondary">
                {formatDate(context.recommendationDate)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <HeaderButton
            onClick={() => void refresh()}
            disabled={refreshing}
            title="Refresh strategy scan"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
            />
            <span className="hidden sm:inline">
              {refreshing ? "Refreshing" : "Refresh"}
            </span>
          </HeaderButton>
          <HeaderButton
            onClick={addToWatchlist}
            title="Add to watchlist"
            className={
              watchlistAdded
                ? "border-accent/40 bg-accent/15 text-accent"
                : undefined
            }
          >
            <Star className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {watchlistAdded ? "Added" : "Watchlist"}
            </span>
          </HeaderButton>
          <HeaderButton title="Generate PDF — coming soon" disabled>
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PDF</span>
          </HeaderButton>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close recommendation drawer"
            className={cn(
              "rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary",
              FOCUS_RING_CLASS
            )}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
