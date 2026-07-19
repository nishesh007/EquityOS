import { cn } from "@/lib/utils";
import {
  SECTION_ACCENTS,
  type SectionAccent,
} from "@/lib/ui/section-accents";

/**
 * Shared card chrome with premium elevation, spacing and optional accent strip.
 * Presentation only — Sprint 10C.1.
 */

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  hover?: boolean;
  /** Translucent glass variant for overlays and hero panels. */
  glass?: boolean;
  /** Optional 4px left accent strip. */
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
  hover = true,
  glass = false,
  accent,
}: CardProps) {
  const tokens = accent ? SECTION_ACCENTS[accent] : null;

  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border-subtle",
        "shadow-[var(--eos-shadow-card)]",
        "transition-[box-shadow,border-color,transform] duration-300 ease-out",
        hover &&
          "hover:-translate-y-0.5 hover:border-surface-border hover:shadow-[var(--eos-shadow-floating)]",
        glass
          ? "bg-surface-raised/80 backdrop-blur-xl shadow-glass"
          : "bg-surface-raised",
        paddingMap[padding],
        tokens && "relative overflow-hidden pl-5 sm:pl-6",
        className
      )}
    >
      {tokens ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-1 rounded-r-full transition-colors duration-300",
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

/** Standard widget header: icon, larger title, muted subtitle, timestamp, actions. */
export function CardHeader({
  title,
  subtitle,
  action,
  badge,
  icon,
  timestamp,
}: CardHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {icon ? (
            <span className="text-text-muted" aria-hidden>
              {icon}
            </span>
          ) : null}
          <h2 className="text-base font-semibold tracking-tight text-text-primary sm:text-lg">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            {subtitle}
          </p>
        )}
        {timestamp ? (
          <p className="mt-1.5 text-[10px] uppercase tracking-wider text-text-faint">
            {timestamp}
          </p>
        ) : null}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

/** Optional footer strip for source / refresh / secondary actions. */
export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={cn(
        "mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-surface-border-subtle pt-3 text-[10px] text-text-faint",
        className
      )}
    >
      {children}
    </div>
  );
}
