import { cn } from "@/lib/utils";
import {
  SECTION_ACCENTS,
  type SectionAccent,
} from "@/lib/ui/section-accents";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned slot for actions (buttons, filters, badges). */
  actions?: React.ReactNode;
  /** R4 premium accent — colors the heading, icon chip and divider. */
  accent?: SectionAccent;
  /** Optional section icon rendered inside an accent chip. */
  icon?: React.ReactNode;
  className?: string;
}

/** Institutional section heading with optional accent, icon and actions. */
export function SectionHeader({
  title,
  subtitle,
  actions,
  accent,
  icon,
  className,
}: SectionHeaderProps) {
  const tokens = accent ? SECTION_ACCENTS[accent] : null;

  return (
    <div className={cn("mb-5", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon ? (
            <span
              aria-hidden
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                tokens ? cn(tokens.chipBg, tokens.text) : "bg-surface-overlay text-text-muted"
              )}
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2
              className={cn(
                "text-base font-semibold tracking-tight",
                tokens ? tokens.text : "text-text-primary"
              )}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {tokens ? (
        <div
          aria-hidden
          className={cn("mt-3 h-px w-full bg-gradient-to-r", tokens.divider)}
        />
      ) : null}
    </div>
  );
}
