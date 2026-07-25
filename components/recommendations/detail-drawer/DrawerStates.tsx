"use client";

import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { InstitutionalCard } from "@/src/design";

export function DrawerSectionSkeleton({
  label = "Loading section",
}: {
  label?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <InstitutionalCard padding="sm" className="animate-fade-in">
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-3 h-4 w-1/2" />
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
        <div className="mt-2">
          <SkeletonText lines={2} />
        </div>
      </InstitutionalCard>
    </div>
  );
}

export function DrawerBodySkeleton() {
  return (
    <div className="space-y-3 p-4 md:p-5" role="status" aria-label="Loading recommendation research">
      <DrawerSectionSkeleton />
      <DrawerSectionSkeleton />
      <DrawerSectionSkeleton />
    </div>
  );
}

export function DrawerEmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-lg border border-dashed border-surface-border-subtle/80 bg-surface/30 px-3 py-3"
      role="status"
    >
      <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" aria-hidden />
      <div>
        <p className="text-[11px] font-semibold text-text-primary">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted">
          {message}
        </p>
      </div>
    </div>
  );
}

export function DrawerErrorState({
  message = "We could not load this research package.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-lg border border-rose-500/25 bg-rose-500/8 px-3 py-3"
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle
          className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-rose-200">
            Something went wrong
          </p>
          <p className="mt-0.5 text-[11px] text-text-secondary">{message}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className={cn(
                "mt-2 inline-flex items-center gap-1.5 rounded-lg border border-surface-border-subtle bg-surface/40 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary",
                FOCUS_RING_CLASS
              )}
            >
              <RefreshCw className="h-3 w-3" aria-hidden />
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function DrawerStatusBanner({
  message,
}: {
  message: string;
}) {
  return (
    <div
      className="mx-4 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11.5px] text-amber-100/95 md:mx-5"
      role="status"
    >
      {message}
    </div>
  );
}
