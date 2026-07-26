"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PaperLabModuleId } from "@/components/paper-trading/labModules";

interface PaperLabModulePanelProps {
  id: PaperLabModuleId;
  active: boolean;
  children: ReactNode;
  className?: string;
}

/** Accessible tab panel wrapper with enter transition. */
export function PaperLabModulePanel({
  id,
  active,
  children,
  className,
}: PaperLabModulePanelProps) {
  if (!active) return null;

  return (
    <div
      role="tabpanel"
      id={`paper-lab-panel-${id}`}
      aria-labelledby={`paper-lab-tab-${id}`}
      tabIndex={0}
      className={cn(
        "animate-fade-in-up outline-none focus-visible:ring-1 focus-visible:ring-accent/40",
        className
      )}
    >
      {children}
    </div>
  );
}
