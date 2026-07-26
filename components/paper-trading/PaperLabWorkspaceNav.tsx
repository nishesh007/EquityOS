"use client";

import { cn } from "@/lib/utils";
import {
  PAPER_LAB_MODULES,
  type PaperLabModuleId,
} from "@/components/paper-trading/labModules";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";

interface PaperLabWorkspaceNavProps {
  active: PaperLabModuleId;
  onChange: (id: PaperLabModuleId) => void;
  counts?: Partial<Record<PaperLabModuleId, number>>;
}

/**
 * Internal workspace navigation — no page reload.
 * ARIA tablist for keyboard + screen-reader support.
 */
export function PaperLabWorkspaceNav({
  active,
  onChange,
  counts,
}: PaperLabWorkspaceNavProps) {
  return (
    <nav
      aria-label="Paper Trading Lab modules"
      className="overflow-x-auto rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-1"
    >
      <div role="tablist" className="flex min-w-max gap-0.5">
        {PAPER_LAB_MODULES.map((module) => {
          const isActive = module.id === active;
          const count = counts?.[module.id];
          return (
            <button
              key={module.id}
              type="button"
              role="tab"
              id={`paper-lab-tab-${module.id}`}
              aria-selected={isActive}
              aria-controls={`paper-lab-panel-${module.id}`}
              tabIndex={isActive ? 0 : -1}
              title={module.description}
              onClick={() => onChange(module.id)}
              onKeyDown={(event) => {
                const ids = PAPER_LAB_MODULES.map((m) => m.id);
                const index = ids.indexOf(module.id);
                let next: PaperLabModuleId | null = null;
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  next = ids[(index + 1) % ids.length];
                } else if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  next = ids[(index - 1 + ids.length) % ids.length];
                } else if (event.key === "Home") {
                  event.preventDefault();
                  next = ids[0];
                } else if (event.key === "End") {
                  event.preventDefault();
                  next = ids[ids.length - 1];
                }
                if (next) {
                  onChange(next);
                  requestAnimationFrame(() => {
                    document.getElementById(`paper-lab-tab-${next}`)?.focus();
                  });
                }
              }}
              className={cn(
                "interactive-press rounded-lg px-3 py-2 text-left transition-all duration-200",
                FOCUS_RING_CLASS,
                isActive
                  ? "bg-accent/15 text-accent shadow-glow"
                  : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
              )}
            >
              <span className="block text-xs font-semibold">{module.label}</span>
              {typeof count === "number" ? (
                <span className="mt-0.5 block text-[10px] tabular-nums opacity-80">
                  {count}
                </span>
              ) : (
                <span className="mt-0.5 block text-[10px] opacity-70 line-clamp-1">
                  {module.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
