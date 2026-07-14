"use client";

import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        aria-label="More information"
        onClick={() => setOpen((value) => !value)}
        className="rounded p-0.5 text-text-faint transition hover:bg-surface-hover hover:text-text-secondary"
      >
        <Info className="h-3 w-3" />
      </button>
      {open ? (
        <div className="absolute left-0 top-5 z-40 w-64 rounded-lg border border-surface-border bg-surface-raised p-2.5 text-[11px] leading-relaxed text-text-secondary shadow-lg">
          {text}
        </div>
      ) : null}
    </div>
  );
}
