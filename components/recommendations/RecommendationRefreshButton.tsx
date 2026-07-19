"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RecommendationRefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh(): Promise<void> {
    setRefreshing(true);
    try {
      const response = await fetch("/api/opportunities/scan", {
        method: "POST",
      });
      if (response.ok) router.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void refresh()}
      disabled={refreshing}
      className="inline-flex items-center gap-2 rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs text-text-muted transition hover:text-text-primary disabled:opacity-60"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
      {refreshing ? "Refreshing" : "Refresh Strategy Scan"}
    </button>
  );
}
