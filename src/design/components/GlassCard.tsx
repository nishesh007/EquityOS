import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

const PADDING_CLASSES = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
} as const;

/** Translucent elevated surface for overlays and hero panels. */
export function GlassCard({ children, padding = "md", className }: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-surface-border-subtle bg-surface-raised/80 shadow-glass backdrop-blur-xl",
        PADDING_CLASSES[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}
