"use client";

import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

/** Premium loading skeleton — preserves layout to avoid CLS. */
export function PaperLabModuleSkeleton({
  variant = "dashboard",
  className,
}: {
  variant?: "dashboard" | "table" | "cards";
  className?: string;
}) {
  return (
    <div
      className={cn("animate-fade-in space-y-4", className)}
      role="status"
      aria-busy="true"
      aria-label="Loading Paper Trading Lab module"
    >
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>

      {(variant === "dashboard" || variant === "cards") && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-20" />
          ))}
        </div>
      )}

      {(variant === "dashboard" || variant === "table") && (
        <div className="space-y-2 rounded-xl border border-surface-border-subtle p-3">
          <Skeleton className="h-4 w-40" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      )}

      <span className="sr-only">Loading module content…</span>
    </div>
  );
}
