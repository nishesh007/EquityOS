/**
 * Sprint 10C.1 — normalized button system (UI only).
 * All buttons: 44px height · one radius · one hover · one focus.
 */

import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

export type EosButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type EosButtonSize = "sm" | "md" | "lg";

/** All sizes resolve to the institutional 44px control height. */
const sizeClass: Record<EosButtonSize, string> = {
  sm: "h-11 px-3 text-body gap-2",
  md: "h-11 px-4 text-body gap-2",
  lg: "h-11 px-6 text-body gap-2",
};

const variantClass: Record<EosButtonVariant, string> = {
  primary:
    "bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-400",
  secondary:
    "bg-white/5 text-text-primary border border-surface-border-subtle hover:bg-white/10 focus-visible:ring-blue-400",
  ghost:
    "bg-transparent text-text-secondary hover:bg-white/5 hover:text-text-primary focus-visible:ring-white/30",
  danger:
    "bg-red-600/90 text-white hover:bg-red-500 focus-visible:ring-red-400",
};

export interface EosButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: EosButtonVariant;
  size?: EosButtonSize;
}

export const EosButton = forwardRef<HTMLButtonElement, EosButtonProps>(
  function EosButton(
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          "disabled:pointer-events-none disabled:opacity-50",
          sizeClass[size],
          variantClass[variant],
          className
        )}
        {...props}
      />
    );
  }
);
