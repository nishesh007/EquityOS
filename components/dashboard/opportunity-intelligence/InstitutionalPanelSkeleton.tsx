"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export function InstitutionalPanelSkeleton({
  title = "Loading institutional metrics…",
  cells = 8,
}: {
  title?: string;
  cells?: number;
}) {
  return (
    <div
      className="mb-4 rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="institutional-panel-skeleton"
    >
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-3.5 w-3.5 rounded-full" />
        <Skeleton className="h-3 w-48" />
      </div>
      <p className="mb-3 text-[11px] text-text-muted">{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: cells }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border border-surface-border-subtle/50 bg-surface-hover/20 px-2.5 py-2"
          >
            <Skeleton className="mb-2 h-2 w-16" />
            <Skeleton className="mb-2 h-4 w-10" />
            <Skeleton className="h-2 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
