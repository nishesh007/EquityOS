"use client";

/**
 * Sprint 10C.R7 — first-time onboarding tour.
 *
 * Stepped welcome dialog shown once per browser: dashboard tour,
 * workspace, research workflow, themes and shortcuts. Dismissible
 * permanently at any step.
 */

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassModal } from "../glass/GlassComponents";
import {
  ONBOARDING_STEPS,
  dismissOnboarding,
  shouldShowOnboarding,
} from "./onboarding";

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Defer to after hydration so SSR markup matches.
  useEffect(() => {
    if (shouldShowOnboarding()) setOpen(true);
  }, []);

  const finish = () => {
    dismissOnboarding();
    setOpen(false);
  };

  const current = ONBOARDING_STEPS[step];
  const last = step === ONBOARDING_STEPS.length - 1;

  return (
    <GlassModal open={open} onClose={finish} title="Welcome to EquityOS">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-text-primary">
            {current.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            {current.body}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${ONBOARDING_STEPS.length}`}>
          {ONBOARDING_STEPS.map((s, index) => (
            <span
              key={s.id}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === step ? "w-5 bg-accent" : "w-1.5 bg-surface-hover"
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={finish}
            className="rounded-md px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            Skip tour
          </button>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              aria-label="Previous step"
              className="rounded-md border border-surface-border p-1.5 text-text-secondary transition-colors hover:bg-surface-hover"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? finish() : setStep((s) => s + 1))}
            className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            {last ? "Get started" : "Next"}
            {!last && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </GlassModal>
  );
}
