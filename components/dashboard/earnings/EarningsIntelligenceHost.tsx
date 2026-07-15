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
import {
  getPostEarningsEngine,
  type PostEarningsCardView,
  type PostEarningsDrawerView,
} from "@/src/core/earnings/postAnalysis";

const EarningsIntelligenceDrawer = dynamic(
  () =>
    import("@/components/dashboard/earnings/EarningsIntelligenceDrawer").then(
      (mod) => mod.EarningsIntelligenceDrawer
    ),
  { ssr: false }
);

const PostEarningsDrawer = dynamic(
  () =>
    import("@/components/dashboard/earnings/PostEarningsDrawer").then(
      (mod) => mod.PostEarningsDrawer
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
  const [postViews, setPostViews] = useState<
    Record<string, PostEarningsCardView>
  >({});
  const [preDrawer, setPreDrawer] = useState<EarningsDrawerView | null>(null);
  const [postDrawer, setPostDrawer] = useState<PostEarningsDrawerView | null>(
    null
  );

  const visibilityKey = useMemo(
    () => cards.map((card) => previewKey(card)).join("|"),
    [cards]
  );

  useEffect(() => {
    const previewEngine = getEarningsPreviewEngine();
    const postEngine = getPostEarningsEngine();
    const nextPreviews: Record<string, EarningsCardPreviewView> = {};
    const nextPost: Record<string, PostEarningsCardView> = {};

    // Precompute only for currently visible cards.
    for (const card of cards) {
      const key = previewKey(card);
      if (card.countdown.isReleased || card.countdown.isExpired) {
        nextPost[key] = postEngine.getCardView(card.ticker, new Date(), card.resultDate);
      } else {
        nextPreviews[key] = previewEngine.getCardPreviewForTicker(
          card.ticker,
          card.resultDate
        );
      }
    }

    setPreviews(nextPreviews);
    setPostViews(nextPost);
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
        {cards.map((card) => {
          const key = previewKey(card);
          const released =
            card.countdown.isReleased || card.countdown.isExpired;
          return (
            <EarningsCard
              key={card.id}
              card={card}
              compact={compact}
              preview={released ? null : previews[key] ?? null}
              postAnalysis={released ? postViews[key] ?? null : null}
              onOpenResearch={(selected) => {
                if (
                  selected.countdown.isReleased ||
                  selected.countdown.isExpired
                ) {
                  setPreDrawer(null);
                  setPostDrawer(
                    getPostEarningsEngine().getDrawerView(
                      selected.ticker,
                      new Date(),
                      selected.resultDate
                    )
                  );
                } else {
                  setPostDrawer(null);
                  setPreDrawer(
                    getEarningsPreviewEngine().getDrawerViewForTicker(
                      selected.ticker,
                      selected.resultDate
                    )
                  );
                }
              }}
            />
          );
        })}
      </div>

      {preDrawer ? (
        <EarningsIntelligenceDrawer
          view={preDrawer}
          open
          onClose={() => setPreDrawer(null)}
        />
      ) : null}

      {postDrawer ? (
        <PostEarningsDrawer
          view={postDrawer}
          open
          onClose={() => setPostDrawer(null)}
        />
      ) : null}
    </>
  );
}
