"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import type { AnalyticsTrendDirection } from "@/lib/analytics/types";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type AnalyticsKpiSize = "sm" | "md" | "lg";
export type AnalyticsKpiTone = "neutral" | "positive" | "negative" | "accent";

export interface AnalyticsKpiProps {
  label: string;
  value: ReactNode;
  secondary?: ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  trend?: AnalyticsTrendDirection;
  icon?: LucideIcon;
  tone?: AnalyticsKpiTone;
  size?: AnalyticsKpiSize;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
}

const SIZE_VALUE: Record<AnalyticsKpiSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
};

const TONE_ICON: Record<AnalyticsKpiTone, string> = {
  neutral: "text-text-secondary",
  positive: "text-gain",
  negative: "text-loss",
  accent: "text-accent",
};

function TrendIcon({
  trend,
}: {
  trend: AnalyticsTrendDirection;
}) {
  if (trend === "up") return <ArrowUpRight className="h-3.5 w-3.5 text-gain" />;
  if (trend === "down")
    return <ArrowDownRight className="h-3.5 w-3.5 text-loss" />;
  return <ArrowRight className="h-3.5 w-3.5 text-text-faint" />;
}

/**
 * Base analytics KPI shell — used by Primary / Secondary / typed KPI variants.
 */
export function AnalyticsKpi({
  label,
  value,
  secondary,
  delta,
  deltaLabel,
  trend,
  icon: Icon,
  tone = "neutral",
  size = "md",
  loading = false,
  empty = false,
  emptyMessage = "No data",
  className,
}: AnalyticsKpiProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-4",
          className
        )}
        role="status"
        aria-label={`Loading ${label}`}
      >
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-7 w-28" />
        <Skeleton className="mt-2 h-3 w-16" />
      </div>
    );
  }

  if (empty) {
    return (
      <EmptyStatePanel
        title={label}
        message={emptyMessage}
        source="Analytics"
        className={cn("py-5", className)}
      />
    );
  }

  const deltaTone =
    delta == null
      ? "text-text-faint"
      : delta > 0
        ? "text-gain"
        : delta < 0
          ? "text-loss"
          : "text-text-faint";

  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-4 transition-colors hover:bg-surface-overlay/60",
        className
      )}
      data-testid="analytics-kpi"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="data-label">{label}</p>
        {Icon ? (
          <Icon
            className={cn("h-4 w-4 shrink-0", TONE_ICON[tone])}
            aria-hidden
          />
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 font-mono font-semibold tabular-nums text-text-primary",
          SIZE_VALUE[size]
        )}
      >
        {value}
      </p>
      {(delta != null || secondary || trend || deltaLabel) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {trend ? <TrendIcon trend={trend} /> : null}
          {delta != null ? (
            <span className={cn("font-mono text-[11px] tabular-nums", deltaTone)}>
              {formatPercent(delta)}
            </span>
          ) : null}
          {deltaLabel ? (
            <span className="text-[10px] text-text-faint">{deltaLabel}</span>
          ) : null}
          {secondary ? (
            <span className="text-[10px] text-text-faint">{secondary}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function PrimaryKpi(props: AnalyticsKpiProps) {
  return <AnalyticsKpi {...props} size={props.size ?? "lg"} />;
}

export function SecondaryKpi(props: AnalyticsKpiProps) {
  return <AnalyticsKpi {...props} size={props.size ?? "sm"} />;
}

export function PercentageKpi({
  value,
  ...props
}: Omit<AnalyticsKpiProps, "value"> & { value: number | null }) {
  return (
    <AnalyticsKpi
      {...props}
      empty={props.empty ?? value == null}
      value={value == null ? "—" : formatPercent(value, false)}
    />
  );
}

export function CurrencyKpi({
  value,
  compact = false,
  ...props
}: Omit<AnalyticsKpiProps, "value"> & {
  value: number | null;
  compact?: boolean;
}) {
  return (
    <AnalyticsKpi
      {...props}
      empty={props.empty ?? value == null}
      value={value == null ? "—" : formatCurrency(value, compact)}
    />
  );
}

export function ComparisonKpi({
  value,
  compareValue,
  compareLabel = "vs prior",
  ...props
}: Omit<AnalyticsKpiProps, "value" | "secondary"> & {
  value: ReactNode;
  compareValue: ReactNode;
  compareLabel?: string;
}) {
  return (
    <AnalyticsKpi
      {...props}
      value={value}
      secondary={
        <span>
          {compareLabel}:{" "}
          <span className="font-mono text-text-secondary">{compareValue}</span>
        </span>
      }
    />
  );
}

export function TrendKpi({
  sparkline,
  ...props
}: AnalyticsKpiProps & { sparkline?: ReactNode }) {
  return (
    <div className="relative">
      <AnalyticsKpi {...props} />
      {sparkline ? (
        <div className="pointer-events-none absolute bottom-3 right-3 opacity-80">
          {sparkline}
        </div>
      ) : null}
    </div>
  );
}
