"use client";

/**
 * Sprint 10C.R5 — glassmorphism component set.
 * Subtle blur, restrained transparency; all surfaces resolve through theme
 * tokens so every theme and accent recolors them automatically.
 */

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GLASS_CLASSES } from "./glassTokens";

interface BaseProps {
  children: React.ReactNode;
  className?: string;
}

/** Large translucent section container. */
export function GlassPanel({ children, className }: BaseProps) {
  return <section className={cn(GLASS_CLASSES.panel, "p-5", className)}>{children}</section>;
}

/** Horizontal action strip (filters, controls) on a glass surface. */
export function GlassToolbar({ children, className }: BaseProps) {
  return (
    <div
      role="toolbar"
      className={cn(GLASS_CLASSES.toolbar, "flex flex-wrap items-center gap-2 px-3 py-2", className)}
    >
      {children}
    </div>
  );
}

interface GlassModalProps extends BaseProps {
  open: boolean;
  onClose: () => void;
  title?: string;
}

/** Centered modal dialog on a blurred backdrop. Escape closes. */
export function GlassModal({ open, onClose, title, children, className }: GlassModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        onClick={(event) => event.stopPropagation()}
        className={cn(GLASS_CLASSES.modal, "w-full max-w-lg p-5 animate-scale-in", className)}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && (
            <h2 id={titleId} className="text-sm font-semibold tracking-tight text-text-primary">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="ml-auto rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface GlassDropdownProps extends BaseProps {
  open: boolean;
  /** Alignment relative to the trigger container. */
  align?: "left" | "right";
}

/** Anchored dropdown surface — parent must be `relative`. */
export function GlassDropdown({ open, align = "right", children, className }: GlassDropdownProps) {
  if (!open) return null;
  return (
    <div
      role="menu"
      className={cn(
        GLASS_CLASSES.dropdown,
        "absolute z-30 mt-1 min-w-[180px] p-2 animate-scale-in origin-top",
        align === "right" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Vertical glass rail for side navigation / context panels. */
export function GlassSidebar({ children, className }: BaseProps) {
  return (
    <aside className={cn(GLASS_CLASSES.sidebar, "flex h-full flex-col p-4", className)}>
      {children}
    </aside>
  );
}

interface GlassTooltipProps extends BaseProps {
  content: React.ReactNode;
}

/** Hover/focus tooltip on a glass surface. */
export function GlassTooltip({ content, children, className }: GlassTooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            GLASS_CLASSES.tooltip,
            "absolute bottom-full left-1/2 z-40 mb-1.5 -translate-x-1/2 whitespace-nowrap px-2 py-1 text-[11px] text-text-secondary animate-fade-in",
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

/** Compact translucent pill badge. */
export function GlassBadge({ children, className }: BaseProps) {
  return (
    <span
      className={cn(
        GLASS_CLASSES.badge,
        "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-text-secondary",
        className
      )}
    >
      {children}
    </span>
  );
}
