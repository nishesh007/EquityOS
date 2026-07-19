import { cn } from "@/lib/utils";
import {
  SECTION_ACCENTS,
  type SectionAccent,
} from "@/lib/ui/section-accents";

interface SectionDividerProps {
  accent?: SectionAccent;
  className?: string;
}

/** Gradient hairline used under section headers. */
export function SectionDivider({ accent, className }: SectionDividerProps) {
  const tokens = accent ? SECTION_ACCENTS[accent] : null;

  return (
    <div
      aria-hidden
      className={cn(
        "h-px w-full bg-gradient-to-r",
        tokens ? tokens.divider : "from-surface-border via-surface-border/40 to-transparent",
        className
      )}
    />
  );
}
