"use client";

import { RichTooltip } from "@/src/design";
import { HelpCircle } from "lucide-react";
import { INTERNALS_COPY, type MetricExplainCopy } from "./metricCopy";

export function MetricExplain({
  metricKey,
  copy,
}: {
  metricKey?: keyof typeof INTERNALS_COPY;
  copy?: MetricExplainCopy;
}) {
  const resolved = copy ?? (metricKey ? INTERNALS_COPY[metricKey] : null);
  if (!resolved) return null;

  return (
    <RichTooltip title={resolved.title} description={resolved.description}>
      <button
        type="button"
        className="inline-flex rounded-sm text-text-faint transition-colors hover:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`Explain ${resolved.title}`}
      >
        <HelpCircle className="h-3 w-3" />
      </button>
    </RichTooltip>
  );
}
