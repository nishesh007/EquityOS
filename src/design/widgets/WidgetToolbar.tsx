"use client";

import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Download,
  Maximize2,
  Pin,
  RefreshCw,
  Settings2,
} from "lucide-react";

export interface WidgetToolbarProps {
  onRefresh?: () => void;
  onExpand?: () => void;
  onPin?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  onCollapse?: () => void;
  /** Visual states. */
  pinned?: boolean;
  collapsed?: boolean;
  refreshing?: boolean;
  className?: string;
}

const buttonClass =
  "rounded-md p-1.5 text-text-muted transition-colors duration-200 hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

/**
 * Standard widget toolbar — refresh / expand / pin / export / settings /
 * collapse. Buttons render only when a handler is provided, so every
 * widget shows a consistent subset without bespoke markup.
 */
export function WidgetToolbar({
  onRefresh,
  onExpand,
  onPin,
  onExport,
  onSettings,
  onCollapse,
  pinned = false,
  collapsed = false,
  refreshing = false,
  className,
}: WidgetToolbarProps) {
  return (
    <div role="toolbar" aria-label="Widget actions" className={cn("flex items-center gap-0.5", className)}>
      {onRefresh && (
        <button type="button" aria-label="Refresh" onClick={onRefresh} className={buttonClass}>
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        </button>
      )}
      {onExpand && (
        <button type="button" aria-label="Expand" onClick={onExpand} className={buttonClass}>
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      )}
      {onPin && (
        <button
          type="button"
          aria-label={pinned ? "Unpin" : "Pin"}
          aria-pressed={pinned}
          onClick={onPin}
          className={cn(buttonClass, pinned && "text-accent")}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
      )}
      {onExport && (
        <button type="button" aria-label="Export" onClick={onExport} className={buttonClass}>
          <Download className="h-3.5 w-3.5" />
        </button>
      )}
      {onSettings && (
        <button type="button" aria-label="Settings" onClick={onSettings} className={buttonClass}>
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      )}
      {onCollapse && (
        <button
          type="button"
          aria-label={collapsed ? "Expand section" : "Collapse section"}
          aria-expanded={!collapsed}
          onClick={onCollapse}
          className={buttonClass}
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform duration-200", collapsed && "-rotate-90")}
          />
        </button>
      )}
    </div>
  );
}
