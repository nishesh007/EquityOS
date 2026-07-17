"use client";

/**
 * Sprint 10C.R7 — built-in help center.
 *
 * Modal with keyboard shortcuts, terminology, guides, FAQ and release
 * notes. Also serves as the "?" shortcut-help dialog (opens on the
 * Shortcuts tab).
 */

import { useEffect, useState } from "react";
import { GlassModal } from "../glass/GlassComponents";
import { cn } from "@/lib/utils";
import { onUiEvent } from "../command/uiBus";
import {
  FAQ,
  GLOSSARY,
  GUIDES,
  RELEASE_NOTES,
  getShortcutGroups,
} from "./helpContent";

type HelpTab = "shortcuts" | "terminology" | "guides" | "faq" | "releases";

const TABS: readonly { id: HelpTab; label: string }[] = [
  { id: "shortcuts", label: "Shortcuts" },
  { id: "terminology", label: "Terminology" },
  { id: "guides", label: "Guides" },
  { id: "faq", label: "FAQ" },
  { id: "releases", label: "Release Notes" },
];

export function HelpCenter() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<HelpTab>("shortcuts");

  useEffect(() => {
    const offShortcuts = onUiEvent("show-shortcut-help", () => {
      setTab("shortcuts");
      setOpen(true);
    });
    const offHelp = onUiEvent("show-help-center", () => {
      setTab("guides");
      setOpen(true);
    });
    return () => {
      offShortcuts();
      offHelp();
    };
  }, []);

  return (
    <GlassModal
      open={open}
      onClose={() => setOpen(false)}
      title="Help Center"
      className="max-w-2xl"
    >
      <div className="mb-3 flex flex-wrap gap-1 border-b border-surface-border-subtle pb-2">
        {TABS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setTab(option.id)}
            aria-pressed={tab === option.id}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              tab === option.id
                ? "bg-accent/15 text-accent"
                : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="max-h-[55vh] overflow-y-auto pr-1">
        {tab === "shortcuts" && (
          <div className="space-y-4">
            {getShortcutGroups().map((group) => (
              <div key={group.title}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {group.title}
                </p>
                <ul className="space-y-1">
                  {group.shortcuts.map((shortcut) => (
                    <li
                      key={shortcut.label}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs text-text-secondary hover:bg-surface-hover"
                    >
                      {shortcut.label}
                      <kbd className="rounded border border-surface-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
                        {shortcut.display}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {tab === "terminology" && (
          <dl className="space-y-3">
            {GLOSSARY.map((entry) => (
              <div key={entry.term}>
                <dt className="text-xs font-semibold text-text-primary">
                  {entry.term}
                </dt>
                <dd className="mt-0.5 text-xs leading-relaxed text-text-muted">
                  {entry.definition}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {tab === "guides" && (
          <div className="space-y-4">
            {GUIDES.map((guide) => (
              <div key={guide.id}>
                <p className="text-xs font-semibold text-text-primary">
                  {guide.title}
                </p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-xs text-text-muted">
                  {guide.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}

        {tab === "faq" && (
          <div className="space-y-3">
            {FAQ.map((entry) => (
              <div key={entry.question}>
                <p className="text-xs font-semibold text-text-primary">
                  {entry.question}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                  {entry.answer}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === "releases" && (
          <div className="space-y-4">
            {RELEASE_NOTES.map((note) => (
              <div key={note.version}>
                <p className="text-xs font-semibold text-text-primary">
                  {note.version} — {note.title}
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-text-muted">
                  {note.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </GlassModal>
  );
}
