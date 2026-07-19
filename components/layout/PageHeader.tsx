import { cn } from "@/lib/utils";
import {
  SECTION_ACCENTS,
  type SectionAccent,
} from "@/lib/ui/section-accents";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** R4 premium accent — colors the icon chip and adds a divider. */
  accent?: SectionAccent;
  /** Optional page icon rendered inside an accent chip. */
  icon?: React.ReactNode;
}

export function PageHeader({ title, subtitle, accent, icon }: PageHeaderProps) {
  const tokens = accent ? SECTION_ACCENTS[accent] : null;

  return (
    <div className="mb-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
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
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>
          )}
        </div>
      </div>
      {tokens ? (
        <div
          aria-hidden
          className={cn("mt-4 h-px w-full bg-gradient-to-r", tokens.divider)}
        />
      ) : null}
    </div>
  );
}
