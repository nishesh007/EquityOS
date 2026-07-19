"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import { cn } from "@/lib/utils";

/**
 * Accessible info tooltip — keyboard + Escape + aria relationships.
 */
export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        aria-label="More information"
        aria-expanded={open}
        aria-controls={tipId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "rounded-md p-1 text-text-faint transition-colors hover:bg-surface-hover hover:text-text-secondary",
          FOCUS_RING_CLASS
        )}
      >
        <Info className="h-3 w-3" aria-hidden />
      </button>
      {open ? (
        <div
          id={tipId}
          role="tooltip"
          className="absolute left-0 top-6 z-40 w-64 animate-fade-in rounded-lg border border-surface-border bg-surface-raised p-2.5 text-[11px] leading-relaxed text-text-secondary shadow-floating"
        >
          {text}
        </div>
      ) : null}
    </div>
  );
}
