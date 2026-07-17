import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface WidgetEmptyStateProps {
  /** Short professional headline, e.g. "No Recommendations". */
  title: string;
  /** One-line explanation or next step. */
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Standard empty state — replaces ad-hoc "no data" text across widgets. */
export function WidgetEmptyState({
  title,
  description,
  icon,
  action,
  className,
}: WidgetEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-surface-border bg-surface-hover/30 p-6 text-center",
        className,
      )}
    >
      <span className="text-text-faint">{icon ?? <Inbox className="h-6 w-6" />}</span>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      {description && <p className="max-w-xs text-xs text-text-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
