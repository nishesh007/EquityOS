"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const CompanyCompare = dynamic(
  () =>
    import("@/components/ai/CompanyCompare").then((mod) => mod.CompanyCompare),
  {
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-text-muted">
        Loading compare workspace…
      </div>
    ),
    ssr: false,
  }
);

export function CompanyCompareLoader() {
  return (
    <ErrorBoundary title="AI Compare failed">
      <CompanyCompare />
    </ErrorBoundary>
  );
}
