"use client";

import { Eye, EyeOff, Lock, LockOpen, Trash2 } from "lucide-react";
import type { ChartDrawing } from "./types";

interface DrawingManagerProps {
  drawings: ChartDrawing[];
  onChange: (next: ChartDrawing[]) => void;
}

export function DrawingManager({ drawings, onChange }: DrawingManagerProps) {
  if (drawings.length === 0) {
    return (
      <p className="px-1 text-[11px] text-text-faint">
        No drawings yet — pick a tool and click the chart.
      </p>
    );
  }

  return (
    <ul className="max-h-40 space-y-1 overflow-y-auto">
      {drawings.map((drawing) => (
        <li
          key={drawing.id}
          className="flex items-center gap-1 rounded-lg border border-surface-border-subtle px-2 py-1.5"
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: drawing.color }}
          />
          <span className="min-w-0 flex-1 truncate text-[11px] capitalize text-text-secondary">
            {drawing.kind}
            {drawing.label ? ` · ${drawing.label}` : ""}
          </span>
          <button
            type="button"
            aria-label={drawing.hidden ? "Show drawing" : "Hide drawing"}
            onClick={() =>
              onChange(
                drawings.map((d) =>
                  d.id === drawing.id ? { ...d, hidden: !d.hidden } : d
                )
              )
            }
            className="rounded p-1 text-text-faint hover:text-text-primary"
          >
            {drawing.hidden ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </button>
          <button
            type="button"
            aria-label={drawing.locked ? "Unlock drawing" : "Lock drawing"}
            onClick={() =>
              onChange(
                drawings.map((d) =>
                  d.id === drawing.id ? { ...d, locked: !d.locked } : d
                )
              )
            }
            className="rounded p-1 text-text-faint hover:text-text-primary"
          >
            {drawing.locked ? (
              <Lock className="h-3 w-3" />
            ) : (
              <LockOpen className="h-3 w-3" />
            )}
          </button>
          <button
            type="button"
            aria-label="Delete drawing"
            disabled={drawing.locked}
            onClick={() => {
              if (drawing.locked) return;
              onChange(drawings.filter((d) => d.id !== drawing.id));
            }}
            className="rounded p-1 text-text-faint hover:text-loss disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}
