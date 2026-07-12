import { cn } from "@/lib/utils";
import type { Signal } from "@/types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SignalBadgeProps {
  signal: Signal;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

const signalConfig: Record<
  Signal,
  { label: string; styles: string; Icon: typeof TrendingUp }
> = {
  bullish: {
    label: "Bullish",
    styles: "bg-gain-bg text-gain border-gain/25",
    Icon: TrendingUp,
  },
  neutral: {
    label: "Neutral",
    styles: "bg-surface-overlay text-text-muted border-surface-border",
    Icon: Minus,
  },
  bearish: {
    label: "Bearish",
    styles: "bg-loss-bg text-loss border-loss/25",
    Icon: TrendingDown,
  },
};

const sizeStyles = {
  sm: "px-1.5 py-0.5 text-[10px] gap-0.5",
  md: "px-2 py-0.5 text-xs gap-1",
};

export function SignalBadge({
  signal,
  size = "md",
  showIcon = true,
  className,
}: SignalBadgeProps) {
  const { label, styles, Icon } = signalConfig[signal];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        styles,
        sizeStyles[size],
        className
      )}
    >
      {showIcon && <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />}
      {label}
    </span>
  );
}
