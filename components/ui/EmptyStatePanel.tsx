import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

/**
 * Shared empty-state surface for dashboard / workspace cards.
 * Always shows an icon, message, expected data source, and optional action —
 * never a blank container.
 */
export function EmptyStatePanel({
  title,
  message,
  source,
  action,
  icon: Icon = Inbox,
  className = "",
}: {
  title?: string;
  message: string;
  source?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-surface-border-subtle bg-surface-overlay/30 px-4 py-6 text-center ${className}`}
      data-testid="empty-state-panel"
    >
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover/60 text-text-faint">
        <Icon className="h-4 w-4" />
      </div>
      {title ? (
        <p className="text-xs font-semibold text-text-secondary">{title}</p>
      ) : null}
      <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-text-muted">
        {message}
      </p>
      {source ? (
        <p className="mt-2 text-[10px] uppercase tracking-wider text-text-faint">
          Source · {source}
        </p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
