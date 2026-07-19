import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "gain" | "loss" | "neutral" | "accent";
  size?: "sm" | "md";
  className?: string;
}

const variantStyles = {
  default: "bg-surface-overlay text-text-secondary border-surface-border",
  gain: "bg-gain-bg text-gain border-gain/20",
  loss: "bg-loss-bg text-loss border-loss/20",
  neutral: "bg-surface-overlay text-text-muted border-surface-border",
  accent: "bg-accent-glow text-accent border-accent/20",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-0.5 text-xs",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium rounded-full border tracking-tight",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}
