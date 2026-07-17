"use client";

/**
 * Sprint 10C.R7 — premium tooltip.
 *
 * Rich content: title, description, optional keyboard hint. Used for
 * metric explanations, research definitions and indicator help.
 */

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { GLASS_CLASSES } from "../glass/glassTokens";

export interface RichTooltipProps {
  title: string;
  description?: string;
  /** Keyboard hint, e.g. "Ctrl+K". */
  kbd?: string;
  children: React.ReactNode;
  className?: string;
}

export function RichTooltip({
  title,
  description,
  kbd,
  children,
  className,
}: RichTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? tooltipId : undefined}
    >
      {children}
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            GLASS_CLASSES.tooltip,
            "absolute bottom-full left-1/2 z-40 mb-1.5 w-56 -translate-x-1/2 px-3 py-2 text-left animate-fade-in",
            className
          )}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-text-primary">
              {title}
            </span>
            {kbd && (
              <kbd className="rounded border border-surface-border bg-surface px-1 py-0.5 text-[10px] text-text-muted">
                {kbd}
              </kbd>
            )}
          </span>
          {description && (
            <span className="mt-1 block text-[11px] leading-relaxed text-text-secondary">
              {description}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
