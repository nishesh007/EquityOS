"use client";

import { EventBadges } from "@/components/events/EventBadges";
import { EventIntelligencePanel } from "@/components/events/EventIntelligencePanel";
import { EventStarButton } from "@/components/events/EventStarButton";
import { toEventDrawerView } from "@/src/core/events/EventDrawerPresenter";
import { cn } from "@/lib/utils";
import type { EventIntelligenceEvent } from "@/types/event";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

interface EventDetailDrawerProps {
  event: EventIntelligenceEvent | null;
  today: string;
  open: boolean;
  onClose: () => void;
  relatedEvents?: readonly EventIntelligenceEvent[];
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-primary">
        {title}
      </p>
      <div>{children}</div>
    </section>
  );
}

function MetricGrid({
  rows,
}: {
  rows: Array<{ label: string; value: string }>;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-[11px] text-text-secondary">No data available for this event.</p>
    );
  }
  return (
    <dl className="grid grid-cols-2 gap-2">
      {rows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2"
        >
          <dt className="text-[10px] text-text-muted">{row.label}</dt>
          <dd className="mt-0.5 text-xs font-medium text-text-primary">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ChipRow({
  items,
  tone,
}: {
  items: string[];
  tone: "positive" | "negative" | "neutral";
}) {
  if (items.length === 0) {
    return <p className="text-[11px] text-text-secondary">None listed.</p>;
  }
  const toneClass =
    tone === "positive"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
      : tone === "negative"
        ? "border-red-500/25 bg-red-500/10 text-red-300"
        : "border-surface-border-subtle bg-surface/40 text-text-secondary";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium",
            toneClass
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ComparisonBars({
  forecast,
  actual,
  previous,
  unit,
}: {
  forecast: number | null;
  actual: number | null;
  previous: number | null;
  unit: string;
}) {
  const values = [forecast, actual, previous].filter(
    (v): v is number => v != null && Number.isFinite(v)
  );
  if (values.length === 0) {
    return (
      <p className="text-[11px] text-text-secondary">Awaiting print / consensus.</p>
    );
  }
  const max = Math.max(...values.map(Math.abs), 0.01);
  const rows = [
    { label: "Forecast", value: forecast },
    { label: "Actual", value: actual },
    { label: "Previous", value: previous },
  ];
  return (
    <div className="space-y-2" data-testid="macro-forecast-vs-actual">
      {rows.map((row) => {
        const width =
          row.value == null
            ? 0
            : Math.max(8, (Math.abs(row.value) / max) * 100);
        return (
          <div key={row.label} className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-text-secondary">{row.label}</span>
              <span className="font-mono text-text-secondary">
                {row.value == null
                  ? "—"
                  : `${row.value.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })} ${unit}`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-overlay">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  row.label === "Actual"
                    ? "bg-accent"
                    : row.label === "Forecast"
                      ? "bg-sky-500/70"
                      : "bg-slate-500/60"
                )}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReadingsTrend({
  readings,
}: {
  readings: Array<{ label: string; actual: number; date: string }>;
}) {
  if (readings.length === 0) {
    return (
      <p className="text-[11px] text-text-secondary">No historical readings.</p>
    );
  }
  const values = readings.map((r) => r.actual);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.01);
  return (
    <div className="space-y-2" data-testid="macro-readings-trend">
      <div className="flex h-16 items-end gap-1">
        {readings.map((reading) => {
          const height = 20 + ((reading.actual - min) / span) * 80;
          return (
            <div
              key={`${reading.date}-${reading.label}`}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${reading.date}: ${reading.actual}`}
            >
              <div
                className="w-full max-w-[14px] rounded-t-sm bg-orange-400/70"
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] text-text-muted">
        <span>{readings[0]?.date}</span>
        <span>{readings[readings.length - 1]?.date}</span>
      </div>
    </div>
  );
}

export function EventDetailDrawer({
  event,
  today,
  open,
  onClose,
  relatedEvents = [],
}: EventDetailDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const view = useMemo(
    () => (event ? toEventDrawerView(event, today) : null),
    [event, today]
  );

  const historicalPeers = useMemo(() => {
    if (!view) return [];
    return relatedEvents
      .filter(
        (item) =>
          item.id !== view.event.id &&
          item.ticker &&
          item.ticker === view.event.ticker
      )
      .slice(0, 4);
  }, [relatedEvents, view]);

  const relatedMacro = useMemo(() => {
    if (!view) return [];
    return relatedEvents
      .filter(
        (item) =>
          item.id !== view.event.id &&
          item.macroDetail &&
          view.event.macroDetail &&
          (item.macroDetail.theme === view.event.macroDetail.theme ||
            item.macroDetail.region === view.event.macroDetail.region)
      )
      .slice(0, 5);
  }, [relatedEvents, view]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open || !view) return null;

  const macro = view.macro;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]"
      data-testid="event-detail-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Event details"
    >
      <button
        type="button"
        aria-label="Close event details"
        className="h-full flex-1 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />
      <aside
        ref={panelRef}
        className="flex h-full w-full max-w-xl flex-col border-l border-surface-border bg-surface-raised shadow-card animate-slide-in"
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-border-subtle px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
              {view.title}
            </p>
            <h2 className="truncate text-sm font-semibold text-text-primary">
              {view.event.title}
            </h2>
            <p className="mt-0.5 text-[11px] text-text-secondary">{view.subtitle}</p>
            <EventBadges badges={view.badges} className="mt-2" />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <EventStarButton eventId={view.event.id} />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className={cn(
                "rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary",
                FOCUS_RING_CLASS
              )}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <Section title="Event Summary">
            <p className="text-xs leading-relaxed text-text-primary">
              {view.summary}
            </p>
          </Section>

          <EventIntelligencePanel intelligence={view.intelligence} />

          <Section title="Timeline">
            <MetricGrid rows={view.timeline} />
          </Section>

          {macro ? (
            <Section title="Overview">
              <MetricGrid rows={macro.overview} />
            </Section>
          ) : (
            <Section title="Company Snapshot">
              <MetricGrid rows={view.companySnapshot} />
            </Section>
          )}

          <Section title="Upcoming Dates">
            <MetricGrid rows={view.upcomingDates} />
          </Section>

          {macro ? (
            <>
              <Section title="Economic Data">
                <MetricGrid rows={macro.economicData} />
                <div className="mt-3 rounded-lg border border-surface-border-subtle/80 bg-surface/30 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                    Forecast vs Actual
                  </p>
                  <ComparisonBars {...macro.forecastVsActual} />
                </div>
              </Section>

              <Section title="Historical Readings">
                <ReadingsTrend readings={macro.historicalReadings} />
                <div className="mt-3 overflow-x-auto rounded-lg border border-surface-border-subtle">
                  <table className="w-full min-w-[320px] text-left text-[11px]">
                    <thead className="bg-surface-overlay/70 text-text-secondary">
                      <tr>
                        <th className="px-2 py-1.5 font-semibold">Label</th>
                        <th className="px-2 py-1.5 font-semibold">Date</th>
                        <th className="px-2 py-1.5 font-semibold">Actual</th>
                        <th className="px-2 py-1.5 font-semibold">Forecast</th>
                      </tr>
                    </thead>
                    <tbody>
                      {macro.historicalReadings.map((row) => (
                        <tr
                          key={`${row.date}-${row.label}`}
                          className="border-t border-surface-border-subtle/80 text-text-primary transition-colors hover:bg-surface-hover/40"
                        >
                          <td className="px-2 py-1.5">{row.label}</td>
                          <td className="px-2 py-1.5">{row.date}</td>
                          <td className="px-2 py-1.5 font-mono">{row.actual}</td>
                          <td className="px-2 py-1.5 font-mono">
                            {row.forecast ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="Sector Impact">
                <p className="mb-1 text-[10px] text-text-muted">
                  Likely Beneficiaries
                </p>
                <ChipRow items={macro.sectorPositive} tone="positive" />
                <p className="mb-1 mt-3 text-[10px] text-text-muted">
                  Likely Negatively Impacted
                </p>
                <ChipRow items={macro.sectorNegative} tone="negative" />
                {macro.sectorNote ? (
                  <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
                    {macro.sectorNote}
                  </p>
                ) : null}
              </Section>

              <Section title="Market Impact">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize",
                      macro.direction === "bullish"
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                        : macro.direction === "bearish"
                          ? "border-red-500/25 bg-red-500/10 text-red-300"
                          : "border-zinc-400/40 bg-zinc-500/20 text-zinc-200"
                    )}
                  >
                    {macro.direction}
                  </span>
                  <span className="inline-flex rounded-md border border-amber-400/45 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold capitalize text-amber-200">
                    Vol: {macro.volatility}
                  </span>
                  <ChipRow items={macro.affectedIndices} tone="neutral" />
                </div>
                <MetricGrid rows={macro.marketImpact} />
              </Section>

              {macro.historicalReaction ? (
                <Section title="Historical Reaction">
                  <p className="mb-2 text-[11px] text-text-secondary">
                    {macro.historicalReaction.seriesLabel}
                  </p>
                  <MetricGrid rows={macro.reactionAverages} />
                  <div className="mt-3 overflow-x-auto rounded-lg border border-surface-border-subtle">
                    <table className="w-full min-w-[400px] text-left text-[11px]">
                      <thead className="bg-surface-overlay/70 text-text-secondary">
                        <tr>
                          <th className="px-2 py-1.5 font-semibold">Meeting</th>
                          <th className="px-2 py-1.5 font-semibold">NIFTY</th>
                          <th className="px-2 py-1.5 font-semibold">BANKNIFTY</th>
                          <th className="px-2 py-1.5 font-semibold">INR</th>
                          <th className="px-2 py-1.5 font-semibold">Yield</th>
                        </tr>
                      </thead>
                      <tbody>
                        {macro.historicalReaction.meetings.map((m) => (
                          <tr
                            key={`${m.date}-${m.label}`}
                            className="border-t border-surface-border-subtle/80 font-mono text-text-primary transition-colors hover:bg-surface-hover/40"
                          >
                            <td className="px-2 py-1.5 font-sans">{m.label}</td>
                            <td className="px-2 py-1.5">
                              {m.niftyMovePct != null
                                ? `${m.niftyMovePct > 0 ? "+" : ""}${m.niftyMovePct}%`
                                : "—"}
                            </td>
                            <td className="px-2 py-1.5">
                              {m.bankNiftyMovePct != null
                                ? `${m.bankNiftyMovePct > 0 ? "+" : ""}${m.bankNiftyMovePct}%`
                                : "—"}
                            </td>
                            <td className="px-2 py-1.5">
                              {m.inrMovePct != null
                                ? `${m.inrMovePct > 0 ? "+" : ""}${m.inrMovePct}%`
                                : "—"}
                            </td>
                            <td className="px-2 py-1.5">
                              {m.bondYieldMoveBps != null
                                ? `${m.bondYieldMoveBps > 0 ? "+" : ""}${m.bondYieldMoveBps} bps`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              ) : null}

              <Section title="Related Macro Events">
                {relatedMacro.length === 0 ? (
                  <p className="text-[11px] text-text-secondary">
                    No related macro events in the current catalog window.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {relatedMacro.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-md border border-surface-border-subtle/80 px-2.5 py-2 text-xs text-text-secondary"
                      >
                        {item.title}
                        <span className="mt-0.5 block text-[10px] text-text-muted">
                          {item.date}
                          {item.time ? ` · ${item.time}` : ""}
                          {item.macroDetail
                            ? ` · ${item.macroDetail.theme.replace(/_/g, " ")}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="AI Macro Interpretation">
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["Summary", macro.aiPlaceholder?.summary],
                      ["Bull Case", macro.aiPlaceholder?.bullCase],
                      ["Bear Case", macro.aiPlaceholder?.bearCase],
                      ["Base Case", macro.aiPlaceholder?.baseCase],
                      [
                        "Market Expectations",
                        macro.aiPlaceholder?.marketExpectations,
                      ],
                    ] as const
                  ).map(([label, body]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-dashed border-surface-border-subtle px-3 py-3"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                        {label}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                        {body ?? "Placeholder pending AI module."}
                      </p>
                    </div>
                  ))}
                </div>
                {macro.aiPlaceholder?.keyRisks?.length ? (
                  <div className="mt-2 rounded-lg border border-dashed border-surface-border-subtle px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
                      Key Risks
                    </p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-text-secondary">
                      {macro.aiPlaceholder.keyRisks.map((risk) => (
                        <li key={risk}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Section>
            </>
          ) : null}

          {view.financialSummary.length > 0 ? (
            <Section title="Financial Summary / Earnings Preview">
              <MetricGrid rows={view.financialSummary} />
            </Section>
          ) : null}

          {view.corporateActionRows.length > 0 ? (
            <Section title="Corporate Action Details">
              <MetricGrid rows={view.corporateActionRows} />
            </Section>
          ) : null}

          {view.historicalRows.length > 0 ? (
            <Section title="Historical Performance">
              <MetricGrid rows={view.historicalRows} />
              {view.historicalQuarters.length > 0 ? (
                <div className="mt-3 overflow-x-auto rounded-lg border border-surface-border-subtle">
                  <table className="w-full min-w-[360px] text-left text-[11px]">
                    <thead className="bg-surface-overlay/70 text-text-secondary">
                      <tr>
                        <th className="px-2 py-1.5 font-semibold">Quarter</th>
                        <th className="px-2 py-1.5 font-semibold">Revenue</th>
                        <th className="px-2 py-1.5 font-semibold">EPS</th>
                        <th className="px-2 py-1.5 font-semibold">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {view.historicalQuarters.map((row) => (
                        <tr
                          key={row.label}
                          className="border-t border-surface-border-subtle/80 text-text-primary transition-colors hover:bg-surface-hover/40"
                        >
                          <td className="px-2 py-1.5">{row.label}</td>
                          <td className="px-2 py-1.5 font-mono">{row.revenue}</td>
                          <td className="px-2 py-1.5 font-mono">{row.eps}</td>
                          <td className="px-2 py-1.5 capitalize">{row.result}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </Section>
          ) : null}

          {!macro ? (
            <Section title="Historical Events">
              {historicalPeers.length === 0 ? (
                <p className="text-[11px] text-text-secondary">
                  No additional linked events for this ticker in the catalog.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {historicalPeers.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-md border border-surface-border-subtle/80 px-2.5 py-2 text-xs text-text-secondary"
                    >
                      {item.title}
                      <span className="mt-0.5 block text-[10px] text-text-muted">
                        {item.date}
                        {item.time ? ` · ${item.time}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          ) : null}

          <Section title="Related News">
            <p className="rounded-lg border border-dashed border-surface-border-subtle px-3 py-4 text-[11px] text-text-secondary">
              {view.relatedNewsPlaceholder}
            </p>
          </Section>

          {!macro ? (
            <Section title="AI Preview">
              <p className="rounded-lg border border-dashed border-surface-border-subtle px-3 py-4 text-[11px] text-text-secondary">
                {view.aiPreviewPlaceholder}
              </p>
            </Section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
