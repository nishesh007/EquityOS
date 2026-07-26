"use client";

import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { BarChart3 } from "lucide-react";

export function ChartFrame({
  title,
  subtitle,
  loading,
  empty,
  emptyMessage = "No chart data available.",
  legend,
  children,
  className,
  height = 220,
}: {
  title?: string;
  subtitle?: string;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  legend?: ReactNode;
  children: ReactNode;
  className?: string;
  height?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-4",
        className
      )}
      data-testid="analytics-chart-frame"
    >
      {(title || subtitle || legend) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title ? (
              <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 text-[11px] text-text-muted">{subtitle}</p>
            ) : null}
          </div>
          {legend}
        </div>
      )}
      {loading ? (
        <div style={{ height }} className="w-full">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      ) : empty ? (
        <EmptyStatePanel
          icon={BarChart3}
          message={emptyMessage}
          source="Analytics Charts"
          className="py-6"
        />
      ) : (
        <div style={{ minHeight: height }}>{children}</div>
      )}
    </div>
  );
}
