"use client";

import { cn } from "@/lib/utils";
import { MOTION_CLASSES } from "@/src/design/motion/motionPresets";
import { useEffect, useRef } from "react";
import { RecommendationDrawerHeader } from "./RecommendationDrawerHeader";
import { RecommendationDrawerSections } from "./RecommendationDrawerSections";
import { RecommendationDrawerSidebar } from "./RecommendationDrawerSidebar";
import type { RecommendationDetailContext } from "./types";
import { useEnrichedRecommendationContext } from "./useEnrichedRecommendationContext";

interface RecommendationDetailDrawerProps {
  context: RecommendationDetailContext | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Institutional Recommendation Detail Drawer — Sprint 11A.2 Executive Decision Layer.
 * Slides in from the right at 90% width / 100% height. Does not replace
 * the Company Details page; decision workspace only.
 */
export function RecommendationDetailDrawer({
  context,
  open,
  onClose,
}: RecommendationDetailDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const enriched = useEnrichedRecommendationContext(open ? context : null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open || !enriched) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      data-testid="recommendation-detail-drawer"
      role="dialog"
      aria-modal="true"
      aria-label={`Recommendation details for ${enriched.company}`}
    >
      <button
        type="button"
        aria-label="Close recommendation details"
        className="h-full min-w-0 flex-1 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />
      <aside
        ref={panelRef}
        className={cn(
          "flex h-full w-[90%] max-w-[90vw] flex-col border-l border-surface-border bg-surface-raised shadow-overlay",
          MOTION_CLASSES.slide
        )}
      >
        <RecommendationDrawerHeader
          context={enriched}
          onClose={onClose}
          closeButtonRef={closeButtonRef}
        />

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="order-2 min-h-0 flex-1 overflow-y-auto lg:order-1 lg:w-[70%]">
            <RecommendationDrawerSections context={enriched} />
          </div>
          <div className="order-1 max-h-[40vh] shrink-0 overflow-y-auto border-b border-surface-border-subtle lg:order-2 lg:max-h-none lg:w-[30%] lg:border-b-0 lg:border-l lg:border-surface-border-subtle">
            <RecommendationDrawerSidebar context={enriched} />
          </div>
        </div>
      </aside>
    </div>
  );
}
