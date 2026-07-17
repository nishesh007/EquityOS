import { cn } from "@/lib/utils";

interface WidgetSkeletonProps {
  rows?: number;
  /** Matches the widget's resolved min content height — no layout jump. */
  minHeight?: number;
  className?: string;
}

/** Loading placeholder sized to the widget so the layout never shifts. */
export function WidgetSkeleton({ rows = 4, minHeight, className }: WidgetSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("space-y-3", className)}
      style={minHeight ? { minHeight: `${minHeight}px` } : undefined}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-4 animate-pulse rounded-md bg-surface-hover",
            index === 0 && "w-1/3",
            index === rows - 1 && "w-2/3",
          )}
        />
      ))}
    </div>
  );
}
