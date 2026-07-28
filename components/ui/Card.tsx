import { cn } from "@/lib/utils";
import {
  SECTION_ACCENTS,
  type SectionAccent,
} from "@/lib/ui/section-accents";

/**
 * Shared card chrome — Sprint 10C institutional polish.
 * Four sizes only: small | medium | large | full.
 */

export type CardSize = "small" | "medium" | "large" | "full";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  /** Institutional card size system (equal radius/padding language). */
  size?: CardSize;
  hover?: boolean;
  /** Optional 4px left accent strip. */
  accent?: SectionAccent;
  "data-testid"?: string;
}

const paddingMap = {
  sm: "p-4",
  md: "p-4",
  lg: "p-6",
} as const;

/** Equal min-heights — no custom widget heights outside this system. */
const sizeMap: Record<CardSize, string> = {
  small: "min-h-[160px]",
  medium: "min-h-[240px]",
  large: "min-h-[320px]",
  full: "min-h-0 w-full",
};

export function Card({
  children,
  className,
  padding = "md",
  size = "full",
  hover = true,
  accent,
  "data-testid": dataTestId,
}: CardProps) {
  const tokens = accent ? SECTION_ACCENTS[accent] : null;

  return (
    <div
      data-testid={dataTestId}
      className={cn(
        "rounded-xl border border-surface-border-subtle",
        "shadow-[var(--eos-shadow-card)]",
        "transition-[box-shadow,border-color] duration-200 ease-out",
        hover && "hover:border-surface-border hover:shadow-[var(--eos-shadow-floating)]",
        "bg-surface-raised",
        paddingMap[padding],
        sizeMap[size],
        tokens && "relative overflow-hidden pl-5",
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
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  timestamp?: string;
}

/** Standard widget header — frozen typography (Card Title 22 / Caption 13). */
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
      <div className="min-w-0 text-left">
        <div className="flex flex-wrap items-center gap-2">
          {icon ? (
            <span className="text-text-secondary" aria-hidden>
              {icon}
            </span>
          ) : null}
          <h2 className="text-card-title font-semibold leading-[1.3] tracking-[-0.01em] text-text-primary">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle ? (
          <p className="mt-1 text-body font-medium leading-relaxed text-text-secondary">
            {subtitle}
          </p>
        ) : null}
        {timestamp ? (
          <p className="mt-2 text-caption font-medium text-text-secondary">
            {timestamp}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={cn(
        "mt-4 flex items-center justify-end gap-2 border-t border-surface-border-subtle pt-4",
        className
      )}
    >
      {children}
    </div>
  );
}
