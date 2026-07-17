"use client";

/**
 * Widget — the standard dashboard section container.
 *
 * Every dashboard section renders inside a Widget so header format,
 * spacing, badges, collapse/refresh/fullscreen affordances and
 * loading/empty/error states are identical everywhere.
 */

import { useCallback, useState } from "react";
import { ChevronDown, Maximize2, Minimize2, RefreshCw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, type StatusTone } from "../components/StatusBadge";
import { WidgetEmptyState } from "./WidgetEmptyState";
import { WidgetSkeleton } from "./WidgetSkeleton";
import { resolveWidgetSize, type WidgetSize } from "./widgetSizes";

export interface WidgetProps {
  title: string;
  subtitle?: string;
  /** Status badge text, rendered next to the title. */
  badge?: string;
  badgeTone?: StatusTone;
  /** Right-aligned custom actions (buttons, filters). */
  actions?: React.ReactNode;
  /** Preferred size — drives skeleton height; grid span is resolved by the page. */
  size?: WidgetSize;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  /** Shows a refresh button; the handler owns the actual reload. */
  onRefresh?: () => void | Promise<void>;
  /** Enables the fullscreen (expand) toggle. */
  fullscreenEnabled?: boolean;
  /** Loading state — renders a fixed-height skeleton. */
  loading?: boolean;
  /** Empty state — shown when true and not loading/error. */
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Error state — shown above all except loading. */
  error?: string | null;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function Widget({
  title,
  subtitle,
  badge,
  badgeTone = "neutral",
  actions,
  size = "m",
  collapsible = false,
  defaultCollapsed = false,
  onRefresh,
  fullscreenEnabled = false,
  loading = false,
  empty = false,
  emptyTitle = "No Data",
  emptyDescription,
  error = null,
  children,
  className,
  contentClassName,
}: WidgetProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [fullscreen, setFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const spec = resolveWidgetSize(size);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, refreshing]);

  const iconButton =
    "rounded-md p-1.5 text-text-muted transition-colors duration-200 hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <section
      aria-label={title}
      className={cn(
        "flex flex-col rounded-xl border border-surface-border-subtle bg-surface-raised shadow-card",
        fullscreen &&
          "fixed inset-4 z-[1200] overflow-auto bg-surface shadow-overlay md:inset-10",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 px-4 pb-0 pt-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold tracking-tight text-text-primary">
              {title}
            </h2>
            {badge && <StatusBadge tone={badgeTone}>{badge}</StatusBadge>}
          </div>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-text-muted">{subtitle}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          {onRefresh && (
            <button
              type="button"
              aria-label={`Refresh ${title}`}
              onClick={handleRefresh}
              className={iconButton}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </button>
          )}
          {fullscreenEnabled && (
            <button
              type="button"
              aria-label={fullscreen ? `Exit fullscreen ${title}` : `Fullscreen ${title}`}
              onClick={() => setFullscreen((value) => !value)}
              className={iconButton}
            >
              {fullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {collapsible && (
            <button
              type="button"
              aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
              className={iconButton}
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  collapsed && "-rotate-90",
                )}
              />
            </button>
          )}
        </div>
      </header>

      {!collapsed && (
        <div className={cn("min-w-0 flex-1 p-4", contentClassName)}>
          {loading ? (
            <WidgetSkeleton rows={spec.skeletonRows} minHeight={spec.minContentHeight} />
          ) : error ? (
            <div
              role="alert"
              className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border border-loss/25 bg-loss/10 p-6 text-center"
            >
              <TriangleAlert className="h-6 w-6 text-loss" />
              <p className="text-sm font-medium text-loss">Failed to load</p>
              <p className="max-w-xs text-xs text-text-muted">{error}</p>
            </div>
          ) : empty ? (
            <WidgetEmptyState title={emptyTitle} description={emptyDescription} />
          ) : (
            children
          )}
        </div>
      )}
    </section>
  );
}
