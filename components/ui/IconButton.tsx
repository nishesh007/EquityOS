"use client";

import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import type { ButtonHTMLAttributes } from "react";

type IconButtonSize = "sm" | "md" | "lg";

const SIZE: Record<IconButtonSize, string> = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required accessible name — icons alone are not enough. */
  label: string;
  size?: IconButtonSize;
  pressed?: boolean;
}

/**
 * Accessible icon-only control with consistent focus ring and press motion.
 */
export function IconButton({
  label,
  size = "md",
  pressed,
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-text-muted",
        "transition-[background-color,color,transform] duration-150",
        "hover:bg-surface-hover hover:text-text-primary active:scale-[0.96]",
        FOCUS_RING_CLASS,
        SIZE[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
