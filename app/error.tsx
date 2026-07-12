"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { AlertTriangle } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[EquityOS]", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-6">
      <Card padding="lg" className="max-w-md border-loss/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-loss" />
          <div>
            <h1 className="text-sm font-semibold text-text-primary">
              Unable to load page
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              An unexpected error occurred while rendering this view.
            </p>
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
