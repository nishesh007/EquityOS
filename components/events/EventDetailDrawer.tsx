"use client";

import { EventBadges } from "@/components/events/EventBadges";
import { toEventDrawerView } from "@/src/core/events/EventDrawerPresenter";
import type { EventIntelligenceEvent } from "@/types/event";
import { X } from "lucide-react";
import { useEffect, useMemo } from "react";

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
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-faint">
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
      <p className="text-[11px] text-text-muted">No data available for this event.</p>
    );
  }
  return (
    <dl className="grid grid-cols-2 gap-2">
      {rows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2"
        >
          <dt className="text-[10px] text-text-faint">{row.label}</dt>
          <dd className="mt-0.5 text-xs font-medium text-text-secondary">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function EventDetailDrawer({
  event,
  today,
  open,
  onClose,
  relatedEvents = [],
}: EventDetailDrawerProps) {
  const view = useMemo(
    () => (event ? toEventDrawerView(event, today) : null),
    [event, today]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !view) return null;

  const historicalPeers = relatedEvents
    .filter(
      (item) =>
        item.id !== view.event.id &&
        item.ticker &&
        item.ticker === view.event.ticker
    )
    .slice(0, 4);

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
      />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-surface-border bg-surface-raised shadow-card animate-slide-in">
        <div className="flex items-start justify-between gap-3 border-b border-surface-border-subtle px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
              {view.title}
            </p>
            <h2 className="truncate text-sm font-semibold text-text-primary">
              {view.event.title}
            </h2>
            <p className="mt-0.5 text-[11px] text-text-muted">{view.subtitle}</p>
            <EventBadges badges={view.badges} className="mt-2" />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="rounded p-1 text-text-faint transition-colors hover:bg-surface-hover hover:text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <Section title="Event Summary">
            <p className="text-xs leading-relaxed text-text-secondary">
              {view.summary}
            </p>
          </Section>

          <Section title="Timeline">
            <MetricGrid rows={view.timeline} />
          </Section>

          <Section title="Company Snapshot">
            <MetricGrid rows={view.companySnapshot} />
          </Section>

          <Section title="Upcoming Dates">
            <MetricGrid rows={view.upcomingDates} />
          </Section>

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
                    <thead className="bg-surface-overlay/50 text-text-faint">
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
                          className="border-t border-surface-border-subtle/70 text-text-secondary"
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

          <Section title="Historical Events">
            {historicalPeers.length === 0 ? (
              <p className="text-[11px] text-text-muted">
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
                    <span className="mt-0.5 block text-[10px] text-text-faint">
                      {item.date}
                      {item.time ? ` · ${item.time}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Related News">
            <p className="rounded-lg border border-dashed border-surface-border-subtle px-3 py-4 text-[11px] text-text-muted">
              {view.relatedNewsPlaceholder}
            </p>
          </Section>

          <Section title="AI Preview">
            <p className="rounded-lg border border-dashed border-surface-border-subtle px-3 py-4 text-[11px] text-text-muted">
              {view.aiPreviewPlaceholder}
            </p>
          </Section>
        </div>
      </aside>
    </div>
  );
}
