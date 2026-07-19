"use client";

import { cn } from "@/lib/utils";
import {
  Camera,
  Crosshair,
  MousePointer2,
  MoveHorizontal,
  MoveVertical,
  Ruler,
  Square,
  TrendingUp,
  Type,
  Waypoints,
} from "lucide-react";
import type { ChartToolId } from "./types";

const TOOLS: readonly {
  id: ChartToolId;
  label: string;
  icon: typeof Crosshair;
}[] = [
  { id: "cursor", label: "Cursor", icon: MousePointer2 },
  { id: "crosshair", label: "Crosshair", icon: Crosshair },
  { id: "trend", label: "Trend Line", icon: TrendingUp },
  { id: "horizontal", label: "Horizontal Line", icon: MoveHorizontal },
  { id: "vertical", label: "Vertical Line", icon: MoveVertical },
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "fibonacci", label: "Fibonacci", icon: Waypoints },
  { id: "text", label: "Text", icon: Type },
  { id: "measure", label: "Measure", icon: Ruler },
  { id: "screenshot", label: "Screenshot", icon: Camera },
];

interface ChartToolbarProps {
  tool: ChartToolId;
  onToolChange: (tool: ChartToolId) => void;
  onScreenshot: () => void;
}

export function ChartToolbar({
  tool,
  onToolChange,
  onScreenshot,
}: ChartToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Chart drawing tools"
      className="pointer-events-auto flex flex-col gap-0.5 rounded-xl border border-surface-border bg-card/95 p-1 shadow-dropdown backdrop-blur-md"
    >
      {TOOLS.map((item) => {
        const Icon = item.icon;
        const active = tool === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={active}
            onClick={() => {
              if (item.id === "screenshot") {
                onScreenshot();
                return;
              }
              onToolChange(item.id);
            }}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
              active
                ? "bg-accent/15 text-accent"
                : "text-text-muted hover:bg-surface-hover hover:text-text-primary"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
