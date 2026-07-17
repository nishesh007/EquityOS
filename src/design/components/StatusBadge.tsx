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
  className?: string;
}

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "bg-gain/10 text-gain border-gain/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-loss/10 text-loss border-loss/25",
  info: "bg-info/10 text-info border-info/25",
  accent: "bg-accent/10 text-accent border-accent/25",
  neutral: "bg-surface-hover text-text-secondary border-surface-border",
};

/** Semantic status pill (e.g. BUY, HOLD, ALERT, LIVE). */
export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
