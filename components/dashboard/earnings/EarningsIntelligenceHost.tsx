"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { EarningsCard } from "@/components/dashboard/earnings/EarningsCard";
import type { EarningsCardView } from "@/src/core/earnings/calendar";
import {
  getEarningsPreviewEngine,
  type EarningsCardPreviewView,
  type EarningsDrawerView,
} from "@/src/core/earnings/intelligence";

const EarningsIntelligenceDrawer = dynamic(
  () =>
    import("@/components/dashboard/earnings/EarningsIntelligenceDrawer").then(
      (mod) => mod.EarningsIntelligenceDrawer
    ),
  { ssr: false }
);

interface EarningsIntelligenceHostProps {
  cards: EarningsCardView[];
  compact?: boolean;
  emptyMessage?: string;
}

function previewKey(card: EarningsCardView): string {
  return `${card.ticker}::${card.resultDate}`;
}

export function EarningsIntelligenceHost({
  cards,
  compact = true,
  emptyMessage,
}: EarningsIntelligenceHostProps) {
  const [previews, setPreviews] = useState<
    Record<string, EarningsCardPreviewView>
  >({});
  const [drawer, setDrawer] = useState<EarningsDrawerView | null>(null);

  const visibilityKey = useMemo(
    () => cards.map((card) => previewKey(card)).join("|"),
    [cards]
  );

  useEffect(() => {
    const engine = getEarningsPreviewEngine();
    const next: Record<string, EarningsCardPreviewView> = {};

    // Precompute AI previews only for currently visible earnings cards.
    for (const card of cards) {
      next[previewKey(card)] = engine.getCardPreviewForTicker(
        card.ticker,
        card.resultDate
      );
    }

    setPreviews(next);
  }, [visibilityKey, cards]);

  if (cards.length === 0) {
    return (
      <p className="text-xs text-text-muted">
        {emptyMessage || "No Upcoming Earnings"}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {cards.map((card) => (
          <EarningsCard
            key={card.id}
            card={card}
            compact={compact}
            preview={previews[previewKey(card)] ?? null}
            onOpenResearch={(selected) => {
              const engine = getEarningsPreviewEngine();
              setDrawer(
                engine.getDrawerViewForTicker(
                  selected.ticker,
                  selected.resultDate
                )
              );
            }}
          />
        ))}
      </div>

      {drawer ? (
        <EarningsIntelligenceDrawer
          view={drawer}
          open
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </>
  );
}
