"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

function EventCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border-subtle bg-surface-raised/80 p-4 shadow-card",
        className
      )}
      role="status"
      aria-label="Loading event"
    >
      <div className="flex gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
          <Skeleton className="mt-2 h-7 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

interface EventSkeletonProps {
  count?: number;
  variant?: "list" | "grid" | "calendar";
}

export function EventSkeleton({
  count = 6,
  variant = "list",
}: EventSkeletonProps) {
  if (variant === "calendar") {
    return (
      <div
        className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-border-subtle"
        role="status"
        aria-label="Loading calendar"
      >
        {Array.from({ length: 35 }).map((_, index) => (
          <div
            key={index}
            className="min-h-[88px] bg-surface-raised/80 p-2"
          >
            <Skeleton className="mb-2 h-3 w-6" />
            <Skeleton className="mb-1 h-2.5 w-full" />
            <Skeleton className="h-2.5 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        role="status"
        aria-label="Loading events"
      >
        {Array.from({ length: count }).map((_, index) => (
          <EventCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3" role="status" aria-label="Loading events">
      {Array.from({ length: count }).map((_, index) => (
        <EventCardSkeleton key={index} />
      ))}
    </div>
  );
}
