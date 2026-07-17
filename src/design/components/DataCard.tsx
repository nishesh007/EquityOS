import { cn } from "@/lib/utils";
import { InstitutionalCard } from "./InstitutionalCard";

interface DataCardProps {
  title: string;
  subtitle?: string;
  /** Right-aligned header slot (badges, actions). */
  headerAccessory?: React.ReactNode;
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

/** Titled card for tables, charts and dense data content. */
export function DataCard({
  title,
  subtitle,
  headerAccessory,
  children,
  padding = "md",
  className,
}: DataCardProps) {
  return (
    <InstitutionalCard padding={padding} className={cn("flex flex-col", className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-text-secondary">{subtitle}</p>
          )}
        </div>
        {headerAccessory && <div className="shrink-0">{headerAccessory}</div>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </InstitutionalCard>
  );
}
