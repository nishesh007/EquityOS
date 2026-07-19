"use client";

import type { SectionAccent } from "@/lib/ui/section-accents";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  GripVertical,
  Pin,
  PinOff,
  RotateCcw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DashboardSectionNav } from "./DashboardSectionNav";
import {
  DEFAULT_PREFERENCES,
  type DashboardPreferences,
  type DashboardSectionId,
  loadDashboardPreferences,
  resetDashboardPreferences,
  resolveSectionOrder,
  saveDashboardPreferences,
} from "./dashboardPreferences";
import { QuickActionBar } from "./QuickActionBar";
import { ScrollToTopButton } from "./ScrollToTopButton";

export interface DashboardSectionDef {
  id: DashboardSectionId;
  label: string;
  accent?: SectionAccent;
  children: ReactNode;
}

interface PersonalizedDashboardProps {
  header: ReactNode;
  sections: DashboardSectionDef[];
}

/**
 * Client shell for dashboard personalization:
 * reorder (HTML5 DnD), collapse, pin, local persistence, quick actions, anchors.
 */
export function PersonalizedDashboard({
  header,
  sections,
}: PersonalizedDashboardProps) {
  const [prefs, setPrefs] = useState<DashboardPreferences>(() => ({
    ...DEFAULT_PREFERENCES,
    order: [...DEFAULT_PREFERENCES.order],
    pinned: [...DEFAULT_PREFERENCES.pinned],
  }));
  const [hydrated, setHydrated] = useState(false);
  const [dragging, setDragging] = useState<DashboardSectionId | null>(null);
  const [activeId, setActiveId] = useState<DashboardSectionId | null>(
    "market-pulse"
  );

  useEffect(() => {
    setPrefs(loadDashboardPreferences());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible?.target.id.startsWith("section-")) return;
        const id = visible.target.id.replace(
          "section-",
          ""
        ) as DashboardSectionId;
        setActiveId(id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.15, 0.4] }
    );
    for (const section of sections) {
      const el = document.getElementById(`section-${section.id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [hydrated, sections]);

  const updatePrefs = useCallback((next: DashboardPreferences) => {
    setPrefs(next);
    saveDashboardPreferences(next);
  }, []);

  const order = resolveSectionOrder(prefs);
  const byId = new Map(sections.map((s) => [s.id, s]));

  const onDrop = (targetId: DashboardSectionId) => {
    if (!dragging || dragging === targetId) {
      setDragging(null);
      return;
    }
    const nextOrder = [...prefs.order];
    const from = nextOrder.indexOf(dragging);
    const to = nextOrder.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDragging(null);
      return;
    }
    nextOrder.splice(from, 1);
    nextOrder.splice(to, 0, dragging);
    updatePrefs({ ...prefs, order: nextOrder });
    setDragging(null);
  };

  const toggleCollapse = (id: DashboardSectionId) => {
    const collapsed = { ...prefs.collapsed };
    collapsed[id] = !collapsed[id];
    updatePrefs({ ...prefs, collapsed });
  };

  const togglePin = (id: DashboardSectionId) => {
    const pinned = prefs.pinned.includes(id)
      ? prefs.pinned.filter((p) => p !== id)
      : [...prefs.pinned, id];
    updatePrefs({ ...prefs, pinned });
  };

  const handleReset = () => {
    updatePrefs(resetDashboardPreferences());
  };

  return (
    <div className="relative">
      {header}
      <QuickActionBar />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-text-faint">
          Drag sections to reorder · pin favorites · collapse to focus
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-2.5 py-1 text-[11px] font-semibold text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <RotateCcw className="h-3 w-3" />
          Reset layout
        </button>
      </div>
      <DashboardSectionNav order={order} activeId={activeId} />

      <div className="flex flex-col gap-8 md:gap-10">
        {order.map((id) => {
          const section = byId.get(id);
          if (!section) return null;
          const collapsed = Boolean(prefs.collapsed[id]);
          const pinned = prefs.pinned.includes(id);

          return (
            <section
              key={id}
              id={`section-${id}`}
              aria-labelledby={`heading-${id}`}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={() => onDrop(id)}
              className={cn(
                "scroll-mt-24 rounded-xl transition-[box-shadow,opacity] duration-200",
                dragging === id && "opacity-60",
                dragging && dragging !== id && "ring-1 ring-accent/20"
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <button
                  type="button"
                  draggable
                  aria-label={`Drag to reorder ${section.label}`}
                  className="cursor-grab rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-text-secondary active:cursor-grabbing"
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", id);
                    setDragging(id);
                  }}
                  onDragEnd={() => setDragging(null)}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <h2 id={`heading-${id}`} className="sr-only">
                  {section.label}
                </h2>
                {pinned ? (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-400">
                    Pinned
                  </span>
                ) : null}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={
                      pinned
                        ? `Unpin ${section.label}`
                        : `Pin ${section.label}`
                    }
                    aria-pressed={pinned}
                    onClick={() => togglePin(id)}
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      pinned
                        ? "text-amber-400 hover:bg-amber-500/10"
                        : "text-text-faint hover:bg-surface-hover hover:text-text-secondary"
                    )}
                  >
                    {pinned ? (
                      <Pin className="h-3.5 w-3.5" />
                    ) : (
                      <PinOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={
                      collapsed
                        ? `Expand ${section.label}`
                        : `Collapse ${section.label}`
                    }
                    aria-expanded={!collapsed}
                    onClick={() => toggleCollapse(id)}
                    className="rounded-md p-1.5 text-text-faint transition-colors hover:bg-surface-hover hover:text-text-secondary"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        collapsed && "-rotate-90"
                      )}
                    />
                  </button>
                </div>
              </div>
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                  collapsed
                    ? "grid-rows-[0fr] opacity-0"
                    : "grid-rows-[1fr] opacity-100"
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="grid gap-5">{section.children}</div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <ScrollToTopButton />
    </div>
  );
}
