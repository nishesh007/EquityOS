import { cn } from "@/lib/utils";

export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "neutral";

interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: StatusTone;
  /** Filled pill (default) vs outline. */
  variant?: "filled" | "outline";
  size?: "sm" | "md";
  className?: string;
}

const FILLED: Record<StatusTone, string> = {
  success: "bg-gain/15 text-gain border-gain/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-loss/15 text-loss border-loss/30",
  info: "bg-info/15 text-info border-info/30",
  accent: "bg-accent/15 text-accent border-accent/30",
  neutral: "bg-surface-overlay text-text-secondary border-surface-border",
};

const OUTLINE: Record<StatusTone, string> = {
  success: "bg-transparent text-gain border-gain/40",
  warning: "bg-transparent text-warning border-warning/40",
  danger: "bg-transparent text-loss border-loss/40",
  info: "bg-transparent text-info border-info/40",
  accent: "bg-transparent text-accent border-accent/40",
  neutral: "bg-transparent text-text-secondary border-surface-border",
};

const SIZE: Record<"sm" | "md", string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-0.5 text-[11px]",
};

/**
 * Map common market / strategy labels to a semantic tone.
 * Presentation helper only — does not interpret recommendation logic.
 */
export function statusToneFromLabel(label: string): StatusTone {
  const n = label.toLowerCase();
  if (
    n.includes("strong bull") ||
    n.includes("extremely bull") ||
    n.includes("bullish") ||
    n.includes("high confidence") ||
    n.includes("ai verified") ||
    n.includes("strategy active") ||
    n.includes("pass")
  ) {
    return "success";
  }
  if (
    n.includes("extremely bear") ||
    n.includes("bear") ||
    n.includes("fail") ||
    n.includes("critical") ||
    n.includes("high risk")
  ) {
    return "danger";
  }
  if (
    n.includes("watch") ||
    n.includes("caution") ||
    n.includes("warning") ||
    n.includes("market closed") ||
    n.includes("insufficient")
  ) {
    return "warning";
  }
  if (n.includes("neutral") || n.includes("unknown")) {
    return "neutral";
  }
  return "accent";
}

/** Premium filled status pill (Strong Bull, AI Verified, High Confidence, …). */
export function StatusBadge({
  children,
  tone = "neutral",
  variant = "filled",
  size = "md",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold tracking-tight",
        variant === "filled" ? FILLED[tone] : OUTLINE[tone],
        SIZE[size],
        className
      )}
    >
      {children}
    </span>
  );
}
