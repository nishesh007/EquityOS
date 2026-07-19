import { cn } from "@/lib/utils";
import {
  SECTION_ACCENTS,
  type SectionAccent,
} from "@/lib/ui/section-accents";

/**
 * Shared card chrome, now backed by the R1 design system. Every panel that
 * renders <Card> inherits the institutional surface (theme-driven border,
 * radius, elevation) — no legacy glass styling remains.
 * R4 adds an optional section accent strip and hover elevation.
 */

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
  /** Translucent glass variant for overlays and hero panels. */
  glass?: boolean;
  /** R4 premium accent — renders a 4px strip along the card's left edge. */
  accent?: SectionAccent;
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
  accent,
}: CardProps) {
  const tokens = accent ? SECTION_ACCENTS[accent] : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border-subtle shadow-card",
        "transition-[box-shadow,border-color,transform] duration-200 hover:shadow-lg",
        glass ? "bg-surface-raised/80 backdrop-blur-xl shadow-glass" : "bg-surface-raised",
        paddingMap[padding],
        tokens && "relative overflow-hidden",
        hover &&
          "transition-[background-color,border-color,box-shadow] duration-200 hover:border-surface-border hover:bg-surface-hover/60",
        className
      )}
    >
      {tokens ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-1 rounded-r-full",
            tokens.strip
          )}
        />
      ) : null}
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
  /** Lucide (or other) icon shown before the title. */
  icon?: React.ReactNode;
  /** Optional timestamp / as-of label. */
  timestamp?: string;
}

/** Standard widget header format: icon, title, subtitle, badge, timestamp, actions. */
export function CardHeader({
  title,
  subtitle,
  action,
  badge,
  icon,
  timestamp,
}: CardHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {icon ? (
            <span className="text-text-muted" aria-hidden>
              {icon}
            </span>
          ) : null}
          <h2 className="text-base font-semibold tracking-tight text-text-primary">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
        )}
        {timestamp ? (
          <p className="mt-1 text-[10px] uppercase tracking-wider text-text-faint">
            {timestamp}
          </p>
        ) : null}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
