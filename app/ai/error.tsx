"use client";

import { Card } from "@/components/ui/Card";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function AIErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-6">
      <Card padding="lg" className="max-w-lg border-loss/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-loss" />
          <div>
            <h1 className="text-lg font-semibold text-text-primary">
              AI workspace error
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              {error.message || "An unexpected error occurred in the AI workspace."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent/90"
              >
                Retry
              </button>
              <Link
                href="/ai"
                className="rounded-lg border border-surface-border-subtle px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-surface-hover"
              >
                Back to AI hub
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
