import { cn } from "@/lib/utils";
import {
  SECTION_ACCENTS,
  type SectionAccent,
} from "@/lib/ui/section-accents";

interface AccentContainerProps {
  children: React.ReactNode;
  /** Section identity — tints the surface and draws a 4px left strip. */
  accent?: SectionAccent;
  /** Soft tinted background (5–8% opacity). Default true when accent set. */
  tint?: boolean;
  /** Left accent strip. Default true when accent set. */
  strip?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

const PADDING = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
} as const;

/**
 * Section / card shell with optional accent strip and tinted surface.
 * Presentation only — no data logic.
 */
export function AccentContainer({
  children,
  accent,
  tint = true,
  strip = true,
  padding = "none",
  className,
}: AccentContainerProps) {
  const tokens = accent ? SECTION_ACCENTS[accent] : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-surface-border-subtle",
        "bg-surface-raised shadow-card transition-[box-shadow,border-color] duration-200 hover:shadow-lg",
        tokens && tint && tokens.tintBg,
        tokens && tint && tokens.tintBorder,
        PADDING[padding],
        className
      )}
    >
      {tokens && strip ? (
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
