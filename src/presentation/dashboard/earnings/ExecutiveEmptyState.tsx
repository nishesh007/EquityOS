"use client";

import { EXECUTIVE_EARNINGS_EMPTY } from "@/lib/dashboard/executive-earnings-presentation";

export function ExecutiveEmptyState({
  message,
  testId = "executive-earnings-empty",
}: {
  message?: string;
  testId?: string;
}) {
  const text =
    message &&
    message !== "null" &&
    message !== "undefined" &&
    message !== "NaN"
      ? message
      : EXECUTIVE_EARNINGS_EMPTY.noUpcoming;

  return (
    <p
      className="py-6 text-center text-xs text-text-muted"
      data-testid={testId}
    >
      {text}
    </p>
  );
}
