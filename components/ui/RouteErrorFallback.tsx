"use client";

import { Card } from "@/components/ui/Card";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

interface RouteErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
}

/**
 * Shared route-level error UI for App Router `error.tsx` files.
 * Presentation only — logs via console.error for diagnostics.
 */
export function RouteErrorFallback({
  error,
  reset,
  title = "Unable to load page",
  message = "An unexpected error occurred while rendering this view.",
}: RouteErrorFallbackProps) {
  useEffect(() => {
    console.error("[EquityOS]", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-6">
      <Card padding="lg" className="max-w-md border-loss/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-loss" />
          <div>
            <h1 className="text-sm font-semibold text-text-primary">{title}</h1>
            <p className="mt-1 text-xs text-text-muted">{message}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-lg border border-surface-border bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-hover"
            >
              Try again
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
