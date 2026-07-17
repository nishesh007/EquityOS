import { cn } from "@/lib/utils";

interface InstitutionalCardProps {
  children: React.ReactNode;
  /** Interactive cards elevate on hover and expose a focus ring. */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

const PADDING_CLASSES = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
} as const;

/**
 * Base institutional surface. Every card in the terminal builds on this so
 * borders, radii, elevation and hover behavior stay consistent per theme.
 */
export function InstitutionalCard({
  children,
  interactive = false,
  padding = "md",
  className,
}: InstitutionalCardProps) {
  return (
    <div
      tabIndex={interactive ? 0 : undefined}
      className={cn(
        "rounded-xl border border-surface-border-subtle bg-surface-raised shadow-card",
        "transition-[box-shadow,border-color,background-color] duration-200",
        interactive &&
          "cursor-pointer hover:border-surface-border hover:bg-surface-hover hover:shadow-floating focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        PADDING_CLASSES[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
