/**
 * Sprint 10C.R5 — professional skeleton loaders.
 * Variants for cards, tables, charts and text so loading states share one
 * institutional look. Pulse animation is suppressed under reduced motion.
 */

import { cn } from "@/lib/utils";

export type SkeletonVariant = "text" | "card" | "table" | "chart" | "widget";

interface SkeletonProps {
  variant?: SkeletonVariant;
  /** Row count for text/table variants. */
  rows?: number;
  className?: string;
}

const BLOCK = "animate-pulse rounded-md bg-surface-hover";

export function Skeleton({ variant = "text", rows = 3, className }: SkeletonProps) {
  if (variant === "card") {
    return (
      <div aria-hidden="true" className={cn("space-y-3 rounded-xl border border-surface-border-subtle bg-surface-raised p-4", className)}>
        <div className={cn(BLOCK, "h-4 w-1/3")} />
        <div className={cn(BLOCK, "h-7 w-1/2")} />
        <div className={cn(BLOCK, "h-3 w-2/3")} />
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div aria-hidden="true" className={cn("space-y-2", className)}>
        <div className={cn(BLOCK, "h-8 w-full opacity-70")} />
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className={cn(BLOCK, "h-6 w-full")} />
        ))}
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div aria-hidden="true" className={cn("flex h-40 items-end gap-2", className)}>
        {[55, 80, 40, 95, 65, 75, 50, 85].map((height, index) => (
          <div
            key={index}
            className={cn(BLOCK, "flex-1")}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    );
  }

  if (variant === "widget") {
    return (
      <div aria-hidden="true" className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between">
          <div className={cn(BLOCK, "h-4 w-1/4")} />
          <div className={cn(BLOCK, "h-6 w-6 rounded-full")} />
        </div>
        <div className={cn(BLOCK, "h-24 w-full")} />
        <div className={cn(BLOCK, "h-3 w-1/2")} />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={cn("space-y-2.5", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn(BLOCK, "h-4", index === rows - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}
