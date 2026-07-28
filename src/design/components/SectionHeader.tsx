import { cn } from "@/lib/utils";
import {
  SECTION_ACCENTS,
  type SectionAccent,
} from "@/lib/ui/section-accents";
import { SectionDivider } from "./SectionDivider";

/** Sprint 10C.1 — three-level visual hierarchy. */
export type SectionHierarchy = 1 | 2 | 3;

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  summary?: string;
  actions?: React.ReactNode;
  accent?: SectionAccent;
  icon?: React.ReactNode;
  className?: string;
  /** 1 = page · 2 = major widget · 3 = secondary widget */
  level?: SectionHierarchy;
}

const TITLE_CLASS: Record<SectionHierarchy, string> = {
  1: "text-page-title font-bold",
  2: "text-major-section font-semibold",
  3: "text-minor-section font-semibold",
};

/**
 * Sprint 10C.1 — left-aligned section titles with hierarchy + compressed spacing.
 */
export function SectionHeader({
  title,
  subtitle,
  summary,
  actions,
  accent,
  icon,
  className,
  level = 2,
}: SectionHeaderProps) {
  const tokens = accent ? SECTION_ACCENTS[accent] : null;

  return (
    <div className={cn("mb-3 text-left", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <span
              aria-hidden
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                tokens
                  ? cn(tokens.chipBg, tokens.text)
                  : "bg-surface-overlay text-text-secondary"
              )}
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2
              className={cn(
                "leading-[1.3] tracking-[-0.01em]",
                TITLE_CLASS[level],
                tokens ? tokens.text : "text-text-primary"
              )}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-body font-medium text-text-secondary">
                {subtitle}
              </p>
            ) : null}
            {summary ? (
              <p className="mt-1 max-w-2xl text-caption text-text-secondary">
                {summary}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {level <= 2 ? <SectionDivider accent={accent} className="mt-2" /> : null}
    </div>
  );
}
