import { cn } from "@/lib/utils";
import {
  GRID_COLUMN_CLASSES,
  GRID_GAP_CLASSES,
  GRID_SPAN_CLASSES,
  MAIN_GRID_SPLIT,
  type GridColumns,
  type GridGap,
} from "./gridSystem";

interface DashboardGridProps {
  children: React.ReactNode;
  /** Track count — responsive collapse is handled by the grid system. */
  columns?: GridColumns;
  gap?: GridGap;
  className?: string;
}

/** The one grid every dashboard page uses. No page rolls its own. */
export function DashboardGrid({
  children,
  columns = 2,
  gap = "spacious",
  className,
}: DashboardGridProps) {
  return (
    <div className={cn("grid", GRID_COLUMN_CLASSES[columns], GRID_GAP_CLASSES[gap], className)}>
      {children}
    </div>
  );
}

interface GridItemProps {
  children: React.ReactNode;
  /** How many tracks this item spans. */
  span?: GridColumns;
  className?: string;
}

export function GridItem({ children, span = 1, className }: GridItemProps) {
  return <div className={cn(GRID_SPAN_CLASSES[span], "min-w-0", className)}>{children}</div>;
}

interface MainGridProps {
  /** Primary work column (70%). */
  primary: React.ReactNode;
  /** Context rail (30%). */
  secondary: React.ReactNode;
  gap?: GridGap;
  className?: string;
}

/** Institutional 70/30 split: primary work column + context rail. */
export function MainGrid({ primary, secondary, gap = "spacious", className }: MainGridProps) {
  return (
    <div className={cn(MAIN_GRID_SPLIT.container, GRID_GAP_CLASSES[gap], className)}>
      <div className={cn(MAIN_GRID_SPLIT.primaryClass, "space-y-6")}>{primary}</div>
      <div className={cn(MAIN_GRID_SPLIT.secondaryClass, "space-y-6")}>{secondary}</div>
    </div>
  );
}
