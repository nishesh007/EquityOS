import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

/**
 * Institutional loading skeleton for Historical Backtesting routes.
 */
export function BacktestingSkeleton({
  variant = "workspace",
}: {
  variant?: "workspace" | "replay" | "reports";
}) {
  return (
    <div
      className="space-y-4 animate-fade-in"
      role="status"
      aria-busy="true"
      aria-label="Loading Historical Backtesting"
      data-testid="backtesting-skeleton"
    >
      <Skeleton className="h-11 w-full max-w-xl rounded-xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      {variant === "replay" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <SkeletonCard className="xl:col-span-2" />
          <SkeletonCard />
        </div>
      ) : null}
      {variant === "reports" ? (
        <>
          <Skeleton className="h-28 w-full rounded-xl" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </>
      ) : null}
      {variant === "workspace" ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : null}
      <span className="sr-only">Loading Historical Backtesting module…</span>
    </div>
  );
}
