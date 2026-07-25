"use client";

import { cn } from "@/lib/utils";
import { MOTION_CLASSES } from "@/src/design/motion/motionPresets";
import { useEffect, useRef, useState } from "react";
import { DrawerStatusBanner } from "./DrawerStates";
import { RecommendationDrawerHeader } from "./RecommendationDrawerHeader";
import { RecommendationDrawerSections } from "./RecommendationDrawerSections";
import { RecommendationDrawerSidebar } from "./RecommendationDrawerSidebar";
import type { RecommendationDetailContext } from "./types";
import { useEnrichedRecommendationContext } from "./useEnrichedRecommendationContext";

const CLOSE_MS = 240;

interface RecommendationDetailDrawerProps {
  context: RecommendationDetailContext | null;
  open: boolean;
  onClose: () => void;
  onExited?: () => void;
}

/**
 * Institutional Recommendation Detail Drawer — Sprint 11A.5 production shell.
 * Slides in from the right; width adapts from full (mobile) to 90% (desktop).
 */
export function RecommendationDetailDrawer({
  context,
  open,
  onClose,
  onExited,
}: RecommendationDetailDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [exiting, setExiting] = useState(false);
  const enriched = useEnrichedRecommendationContext(
    mounted ? context : null
  );

  useEffect(() => {
    if (open) {
      setMounted(true);
      setExiting(false);
      return;
    }
    if (!mounted) return;
    setExiting(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setExiting(false);
      onExited?.();
    }, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted, onExited]);

  useEffect(() => {
    if (!open || !mounted) return;

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
  }, [open, mounted, onClose]);

  if (!mounted || !enriched) return null;

  const animClass = exiting ? MOTION_CLASSES.slideOut : MOTION_CLASSES.slide;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px] transition-opacity duration-200",
        exiting && "opacity-0"
      )}
      data-testid="recommendation-detail-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recommendation-drawer-title"
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
          "flex h-full w-full max-w-full flex-col border-l border-surface-border bg-surface-raised shadow-overlay",
          "sm:w-[94%] sm:max-w-[94vw] md:w-[90%] md:max-w-[90vw]",
          animClass
        )}
      >
        <RecommendationDrawerHeader
          context={enriched}
          onClose={onClose}
          closeButtonRef={closeButtonRef}
        />

        {enriched.statusMessage ? (
          <DrawerStatusBanner message={enriched.statusMessage} />
        ) : null}

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
