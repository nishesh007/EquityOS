import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-surface-overlay/60",
        className
      )}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("glass-card p-5", className)}>
      <Skeleton className="mb-4 h-4 w-1/3" />
      <SkeletonText lines={4} />
    </div>
  );
}
