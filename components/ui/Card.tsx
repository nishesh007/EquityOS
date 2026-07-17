import { cn } from "@/lib/utils";

/**
 * Shared card chrome, now backed by the R1 design system. Every panel that
 * renders <Card> inherits the institutional surface (theme-driven border,
 * radius, elevation) — no legacy glass styling remains.
 */

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
  /** Translucent glass variant for overlays and hero panels. */
  glass?: boolean;
}

const paddingMap = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  children,
  className,
  padding = "md",
  hover = false,
  glass = false,
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border-subtle shadow-card",
        glass ? "bg-surface-raised/80 backdrop-blur-xl shadow-glass" : "bg-surface-raised",
        paddingMap[padding],
        hover &&
          "transition-[background-color,border-color,box-shadow] duration-200 hover:border-surface-border hover:bg-surface-hover/60",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Optional status badge rendered next to the title. */
  badge?: React.ReactNode;
}

/** Standard widget header format: title, subtitle, badge, actions. */
export function CardHeader({
  title,
  subtitle,
  action,
  badge,
}: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-text-primary tracking-tight">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
