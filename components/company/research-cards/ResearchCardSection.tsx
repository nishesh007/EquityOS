import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ResearchCardSectionProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Grid columns hint — defaults to responsive dense grid. */
  dense?: boolean;
}

/**
 * Compact section chrome wrapping a research card grid.
 */
export function ResearchCardSection({
  title,
  subtitle,
  badge,
  actions,
  children,
  className,
  dense = false,
}: ResearchCardSectionProps) {
  return (
    <section className={cn("space-y-2.5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-text-primary">
              {title}
            </h2>
            {badge}
          </div>
          {subtitle ? (
            <p className="mt-0.5 text-[10px] text-text-muted">{subtitle}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div
        className={cn(
          "grid gap-2.5",
          dense
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        )}
      >
        {children}
      </div>
    </section>
  );
}
