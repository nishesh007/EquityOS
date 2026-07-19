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
  comingSoon,
  className = "",
}: {
  title?: string;
  message: string;
  source?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  /** When true, appends Sprint 10D notice. */
  comingSoon?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-border-subtle bg-surface-overlay/30 px-5 py-8 text-center animate-fade-in ${className}`}
      data-testid="empty-state-panel"
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-hover/60 text-text-faint ring-1 ring-surface-border-subtle">
        <Icon className="h-5 w-5" />
      </div>
      {title ? (
        <p className="text-sm font-semibold text-text-secondary">{title}</p>
      ) : null}
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-text-muted">
        {message}
      </p>
      {comingSoon ? (
        <p className="mt-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
          Coming in Sprint 10D
        </p>
      ) : null}
      {source ? (
        <p className="mt-2 text-[10px] uppercase tracking-wider text-text-faint">
          Source · {source}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
