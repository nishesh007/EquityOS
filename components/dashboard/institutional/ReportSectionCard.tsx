"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Copy, Printer } from "lucide-react";

export function ReportSectionCard({
  id,
  heading,
  locked = false,
  premium = false,
  defaultExpanded = true,
  children,
}: {
  id: string;
  heading: string;
  locked?: boolean;
  premium?: boolean;
  defaultExpanded?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const copySection = useCallback(async () => {
    const el = document.getElementById(`report-section-${id}`);
    const text = el?.innerText ?? heading;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }, [heading, id]);

  const printSection = useCallback(() => {
    const el = document.getElementById(`report-section-${id}`);
    if (!el) return;
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><title>${heading}</title></head><body>${el.innerHTML}</body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  }, [heading, id]);

  return (
    <section
      id={`report-section-${id}`}
      data-section-id={id}
      data-testid={`report-section-${id}`}
      className={`scroll-mt-4 rounded-lg border border-surface-border-subtle/80 bg-surface-hover/10 ${
        locked ? "relative overflow-hidden" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-border-subtle/60 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-left"
          aria-expanded={expanded}
          data-testid={`report-section-toggle-${id}`}
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-text-faint" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-text-faint" />
          )}
          <span className="text-xs font-semibold text-text-primary">{heading}</span>
          {premium ? (
            <span className="rounded border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
              Premium
            </span>
          ) : null}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copySection}
            className="rounded p-1 text-text-faint hover:bg-surface-hover hover:text-text-secondary"
            title="Copy section"
            data-testid={`report-section-copy-${id}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={printSection}
            className="rounded p-1 text-text-faint hover:bg-surface-hover hover:text-text-secondary"
            title="Print section"
            data-testid={`report-section-print-${id}`}
          >
            <Printer className="h-3.5 w-3.5" />
          </button>
          {copied ? (
            <span className="text-[9px] text-accent">Copied</span>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="relative px-3 py-3">
          <div className={locked ? "select-none blur-sm pointer-events-none" : ""}>
            {children}
          </div>
          {locked ? (
            <div
              className="absolute inset-0 flex items-center justify-center bg-surface-raised/70 backdrop-blur-[2px]"
              data-testid={`report-section-upgrade-${id}`}
            >
              <div className="rounded-md border border-amber-500/30 bg-surface-raised px-4 py-3 text-center shadow-sm">
                <p className="text-xs font-semibold text-text-primary">
                  Upgrade Required
                </p>
                <p className="mt-1 text-[11px] text-text-muted">
                  Premium section — available for subscribers.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
