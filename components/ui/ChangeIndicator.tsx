import { cn, formatPercent } from "@/lib/utils";

interface ChangeIndicatorProps {
  value: number;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export function ChangeIndicator({
  value,
  showIcon = true,
  size = "md",
  className,
}: ChangeIndicatorProps) {
  const isGain = value >= 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono font-medium tabular-nums",
        isGain ? "text-gain" : "text-loss",
        sizeStyles[size],
        className
      )}
    >
      {showIcon && (
        <span className="text-[0.7em]">{isGain ? "▲" : "▼"}</span>
      )}
      {formatPercent(value)}
    </span>
  );
}
