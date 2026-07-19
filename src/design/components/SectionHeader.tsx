import { cn } from "@/lib/utils";
import {
  SECTION_ACCENTS,
  type SectionAccent,
} from "@/lib/ui/section-accents";
import { SectionDivider } from "./SectionDivider";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Right-aligned slot for actions (buttons, filters, badges). */
  actions?: React.ReactNode;
  /** Section identity — colors icon chip, heading, divider and tint panel. */
  accent?: SectionAccent;
  /** Optional section icon rendered inside an accent chip. */
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Premium section heading — accent chip, large title, subtitle, divider.
 * Users should instantly distinguish sections while scrolling.
 */
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
    <div
      className={cn(
        "mb-5 rounded-xl border border-transparent px-3 py-3 sm:px-4",
        tokens && cn(tokens.tintBg, tokens.tintBorder, "border"),
        className
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <span
              aria-hidden
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                tokens
                  ? cn(tokens.chipBg, tokens.text)
                  : "bg-surface-overlay text-text-muted"
              )}
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2
              className={cn(
                "text-lg font-semibold tracking-tight",
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
      <SectionDivider accent={accent} className="mt-3" />
    </div>
  );
}
