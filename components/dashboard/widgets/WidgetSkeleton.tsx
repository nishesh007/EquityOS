import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/** Per-widget Suspense fallback — keeps layout while an async SC resolves. */
export function WidgetSkeleton({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label={label ? `Loading ${label}` : "Loading widget"}
    >
      <Card padding="lg" className={cn("animate-pulse", className)}>
        {label ? (
          <p className="mb-4 text-xs font-medium text-text-muted">{label}</p>
        ) : null}
        <div className="space-y-3">
          <div className="h-4 w-1/3 rounded bg-surface-hover" />
          <div className="h-4 w-full rounded bg-surface-hover" />
          <div className="h-4 w-2/3 rounded bg-surface-hover" />
          <div className="h-24 w-full rounded bg-surface-hover" />
        </div>
      </Card>
    </div>
  );
}
