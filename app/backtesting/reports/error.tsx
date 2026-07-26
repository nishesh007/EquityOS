"use client";

import { RouteErrorFallback } from "@/components/ui/RouteErrorFallback";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      error={error}
      reset={reset}
      title="Unable to load Institutional Report Center"
    />
  );
}
