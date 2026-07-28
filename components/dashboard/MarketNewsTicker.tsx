"use client";

/**
 * AI-powered institutional news ticker for the executive dashboard.
 * Presentation only — cycles verified headlines with manual controls.
 */

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import type { MarketNews } from "@/types";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pause,
  Play,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface MarketNewsTickerProps {
  news: MarketNews[];
  /** Auto-cycle interval in ms. */
  intervalMs?: number;
}

export function MarketNewsTicker({
  news,
  intervalMs = 5000,
}: MarketNewsTickerProps) {
  const [index, setIndex] = useState(0);
  const [manualPaused, setManualPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [slide, setSlide] = useState<"idle" | "out" | "in">("idle");
  const animatingRef = useRef(false);

  const paused = manualPaused || hoverPaused;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (news.length === 0 || animatingRef.current) return;
      const normalized = ((nextIndex % news.length) + news.length) % news.length;
      if (normalized === index) return;
      animatingRef.current = true;
      setSlide("out");
      window.setTimeout(() => {
        setIndex(normalized);
        setSlide("in");
        window.setTimeout(() => {
          setSlide("idle");
          animatingRef.current = false;
        }, 280);
      }, 280);
    },
    [index, news.length]
  );

  useEffect(() => {
    if (paused || news.length <= 1) return;
    const timer = window.setInterval(() => {
      goTo(index + 1);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [paused, news.length, intervalMs, goTo, index]);

  if (news.length === 0) {
    return (
      <div className="h-full">
        <Card padding="md" className="flex h-full flex-col">
          <CardHeader
            title="AI News"
            subtitle="Approved institutional sources"
            action={
              <Link
                href="/news"
                className="text-caption font-semibold text-accent transition-opacity duration-150 hover:opacity-80"
              >
                View All →
              </Link>
            }
          />
          <div className="flex flex-1 items-center justify-center rounded-lg border border-surface-border-subtle px-4 py-6 text-center">
            <div>
              <p className="text-sm font-medium text-text-secondary">
                Verified headlines are temporarily unavailable
              </p>
              <p className="mt-1 text-xs text-text-muted">
                The live source feed will retry on the next refresh.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const item = news[index] ?? news[0];
  const translate =
    slide === "out"
      ? "-translate-y-3 opacity-0"
      : slide === "in"
        ? "translate-y-3 opacity-0"
        : "translate-y-0 opacity-100";

  const statusLabel = manualPaused
    ? "Paused"
    : hoverPaused
      ? "Paused · hover"
      : `${news.length} headlines · auto 5s`;

  return (
    <div
      className="h-full"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <Card padding="md" className="flex h-full flex-col">
        <CardHeader
          title="AI News"
          subtitle={statusLabel}
          action={
            <Link
              href="/news"
              className="text-caption font-semibold text-accent transition-opacity duration-150 hover:opacity-80"
            >
              View All →
            </Link>
          }
        />

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`group relative flex min-h-[7rem] flex-1 flex-col justify-center overflow-hidden rounded-xl border border-surface-border-subtle bg-white/[0.03] px-4 py-3 transition-[opacity,transform] duration-150 ease-out ${translate}`}
          aria-live="polite"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              variant={
                item.sentiment === "Positive"
                  ? "gain"
                  : item.sentiment === "Negative"
                    ? "loss"
                    : "neutral"
              }
              size="sm"
            >
              {item.sentiment}
            </Badge>
            <span className="text-micro text-text-muted">{item.category}</span>
            <span className="text-micro text-text-muted">{item.timestamp}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-micro text-text-muted">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              {item.source}
            </span>
          </div>
          <p className="text-card-title font-semibold leading-[1.3] text-text-primary transition-colors duration-150 group-hover:text-accent">
            {item.title}
          </p>
          {item.summary ? (
            <p className="mt-2 text-caption text-text-secondary">
              {item.summary}
            </p>
          ) : null}
          <span className="mt-2 inline-flex items-center gap-1 text-micro font-semibold uppercase tracking-[0.04em] text-accent opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            Open article
            <ExternalLink className="h-4 w-4" />
          </span>
        </a>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              aria-label="Previous headline"
              className="rounded-md border border-surface-border-subtle p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setManualPaused((current) => !current)}
              aria-label={manualPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
              className="rounded-md border border-surface-border-subtle p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              {manualPaused ? (
                <Play className="h-3.5 w-3.5" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              aria-label="Next headline"
              className="rounded-md border border-surface-border-subtle p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <span className="data-timestamp tabular-nums">
            {index + 1}/{news.length}
          </span>
        </div>
      </Card>
    </div>
  );
}
