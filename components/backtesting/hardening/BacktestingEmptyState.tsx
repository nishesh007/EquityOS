"use client";

import Link from "next/link";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import {
  FileBarChart,
  FilterX,
  History,
  Scale,
  type LucideIcon,
} from "lucide-react";

export type BacktestingEmptyKind =
  | "no_sessions"
  | "no_validation"
  | "no_reports"
  | "filter_empty"
  | "corrupt_session"
  | "missing_dataset";

const COPY: Record<
  BacktestingEmptyKind,
  {
    title: string;
    message: string;
    source: string;
    icon: LucideIcon;
    href?: string;
    actionLabel?: string;
  }
> = {
  no_sessions: {
    title: "No Backtest Sessions",
    message:
      "Completed historical sessions will appear here. Open Strategy Validation or Reports after a session finishes, or select a demo session when available.",
    source: "Replay Center",
    icon: History,
    href: "/backtesting/validation",
    actionLabel: "Open Strategy Validation",
  },
  no_validation: {
    title: "No Validation Results",
    message:
      "Validation requires closed trades from completed backtest sessions. Ensure sessions include exited positions, then refresh this view.",
    source: "Strategy Validation",
    icon: Scale,
    href: "/backtesting",
    actionLabel: "Open Replay Center",
  },
  no_reports: {
    title: "No Reports",
    message:
      "Institutional reports assemble from historical validation results. Widen filters or switch templates once trade data is available.",
    source: "Report Center",
    icon: FileBarChart,
    href: "/backtesting/validation",
    actionLabel: "Review Validation",
  },
  filter_empty: {
    title: "Filter returned no data",
    message:
      "No historical trades match the current date range, strategy, sector, symbol, universe, or market regime filters. Reset filters to broaden the sample.",
    source: "Historical Backtesting",
    icon: FilterX,
  },
  corrupt_session: {
    title: "Session unavailable",
    message:
      "This session could not be loaded (missing bundle or corrupt snapshot). Choose another session from Session Explorer.",
    source: "Replay Center",
    icon: History,
  },
  missing_dataset: {
    title: "Dataset missing",
    message:
      "Required historical dataset slices are unavailable for this view. Retry after datasets are restored, or select a different session.",
    source: "Historical Backtesting",
    icon: History,
  },
};

export function BacktestingEmptyState({
  kind,
  className,
  onResetFilters,
}: {
  kind: BacktestingEmptyKind;
  className?: string;
  onResetFilters?: () => void;
}) {
  const copy = COPY[kind];
  const action =
    kind === "filter_empty" && onResetFilters ? (
      <button
        type="button"
        onClick={onResetFilters}
        className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        Reset filters
      </button>
    ) : copy.href ? (
      <Link
        href={copy.href}
        className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        {copy.actionLabel}
      </Link>
    ) : undefined;

  return (
    <EmptyStatePanel
      icon={copy.icon}
      title={copy.title}
      message={copy.message}
      source={copy.source}
      action={action}
      className={className}
    />
  );
}
