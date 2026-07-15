/**
 * Earnings Alert Engine — incremental generation + cache (Sprint 9B.R6).
 * Compatible with Sprint 9C PlatformAlert aggregation.
 */

import {
  buildEarningsCountdown,
  getEarningsCalendarService,
  getIstDateKey,
  type EarningsCalendarEvent,
} from "@/src/core/earnings/calendar";
import {
  getEarningsDashboardEngine,
  type EarningsScorecard,
  type RankedEarningsItem,
} from "@/src/core/earnings/dashboard";
import { getPostEarningsAnalysis } from "@/src/core/earnings/postAnalysis";
import { getAlertHistoryStore } from "./AlertHistory";
import { evaluateAlertKinds } from "./EarningsAlertRules";
import { buildEarningsAlert } from "./EarningsAlertPresenter";
import type { EarningsAlert, EarningsAlertKind } from "./EarningsAlertModels";

const PRIORITY_RANK: Record<EarningsAlert["priority"], number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

function eventKey(event: EarningsCalendarEvent): string {
  return `${event.ticker}::${event.resultDate}`;
}

function cacheKey(event: EarningsCalendarEvent, now: Date): string {
  return `${eventKey(event)}::${getIstDateKey(now)}`;
}

function resolvePostSignals(event: EarningsCalendarEvent, now: Date): {
  postOutcome: string | null;
  guidanceChange: string | null;
} {
  const countdown = buildEarningsCountdown(
    event.resultDate,
    event.resultTime,
    now
  );
  if (!countdown.isReleased && !countdown.isExpired) {
    return { postOutcome: null, guidanceChange: null };
  }
  try {
    const analysis = getPostEarningsAnalysis(event);
    return {
      postOutcome: analysis.comparison.available
        ? analysis.comparison.overallOutcome
        : null,
      guidanceChange: analysis.guidance.available
        ? analysis.guidance.change
        : null,
    };
  } catch {
    return { postOutcome: null, guidanceChange: null };
  }
}

function sortAlerts(alerts: EarningsAlert[]): EarningsAlert[] {
  return [...alerts].sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    return a.ticker.localeCompare(b.ticker);
  });
}

export class EarningsAlertEngine {
  private readonly cache = new Map<string, EarningsAlert[]>();
  private evaluations = 0;

  clearCache(): void {
    this.cache.clear();
    this.evaluations = 0;
  }

  getEvaluationCount(): number {
    return this.evaluations;
  }

  /** Candidate set: upcoming + recently released (for results/transcript alerts). */
  resolveCandidateEvents(now = new Date()): EarningsCalendarEvent[] {
    const calendar = getEarningsCalendarService();
    const upcoming = calendar.getUpcomingEarnings({ now });
    const all = calendar.getAllEvents(now);
    const recentReleased = all.filter((event) => {
      const countdown = buildEarningsCountdown(
        event.resultDate,
        event.resultTime,
        now
      );
      if (!countdown.isReleased && !countdown.isExpired) return false;
      const days = countdown.daysRemaining;
      return days != null && days >= -14 && days <= 0;
    });
    const byKey = new Map<string, EarningsCalendarEvent>();
    for (const event of [...upcoming, ...recentReleased]) {
      byKey.set(eventKey(event), event);
    }
    return [...byKey.values()];
  }

  /** Incrementally evaluate only visible / provided companies. */
  generateForEvents(
    events: readonly EarningsCalendarEvent[],
    now = new Date()
  ): EarningsAlert[] {
    const dashboard = getEarningsDashboardEngine();
    dashboard.precomputeVisible(events, now);
    const history = getAlertHistoryStore();
    const alerts: EarningsAlert[] = [];

    for (const event of events) {
      const key = cacheKey(event, now);
      const cached = this.cache.get(key);
      if (cached) {
        alerts.push(...this.applyHistory(cached, now));
        continue;
      }

      this.evaluations += 1;
      const scored = dashboard.scoreEvent(event, now);
      const generated = this.generateForScored(scored, now);
      this.cache.set(key, generated);
      alerts.push(...this.applyHistory(generated, now));
    }

    return sortAlerts(alerts);
  }

  generateForScored(item: RankedEarningsItem, now = new Date()): EarningsAlert[] {
    const { event, scorecard } = item;
    const { postOutcome, guidanceChange } = resolvePostSignals(event, now);
    const kinds = evaluateAlertKinds({
      event,
      scorecard,
      now,
      postOutcome,
      guidanceChange,
    });
    return kinds.map((kind) =>
      buildEarningsAlert({ kind, event, scorecard, now })
    );
  }

  generateAll(now = new Date()): EarningsAlert[] {
    return this.generateForEvents(this.resolveCandidateEvents(now), now);
  }

  getUpcomingAlerts(now = new Date()): EarningsAlert[] {
    return this.generateAll(now).filter(
      (a) =>
        a.status === "active" &&
        a.kind !== "results_published" &&
        a.kind !== "transcript_available" &&
        a.kind !== "guidance_raised" &&
        a.kind !== "guidance_cut" &&
        a.kind !== "major_beat" &&
        a.kind !== "major_miss"
    );
  }

  getPortfolioAlerts(now = new Date()): EarningsAlert[] {
    return this.generateAll(now).filter(
      (a) => a.status === "active" && a.inPortfolio
    );
  }

  getWatchlistAlerts(now = new Date()): EarningsAlert[] {
    return this.generateAll(now).filter(
      (a) => a.status === "active" && a.inWatchlist
    );
  }

  dismissAlert(id: string): EarningsAlert | null {
    getAlertHistoryStore().dismiss(id);
    return this.findAlert(id);
  }

  markAlertRead(id: string): EarningsAlert | null {
    getAlertHistoryStore().markRead(id);
    return this.findAlert(id);
  }

  snoozeAlert(id: string, until: Date): EarningsAlert | null {
    getAlertHistoryStore().snooze(id, until);
    return this.findAlert(id);
  }

  completeAlert(id: string): EarningsAlert | null {
    getAlertHistoryStore().complete(id);
    return this.findAlert(id);
  }

  findAlert(id: string, now = new Date()): EarningsAlert | null {
    const all = this.generateAll(now);
    const withHistory = all.find((a) => a.id === id);
    if (withHistory) return withHistory;

    // Dismissed/completed may be suppressed from active generation — rebuild shell.
    const [kind, ticker, resultDate] = id.split("::") as [
      EarningsAlertKind,
      string,
      string,
    ];
    if (!kind || !ticker || !resultDate) return null;
    const event = this.resolveCandidateEvents(now).find(
      (e) => e.ticker === ticker && e.resultDate === resultDate
    );
    if (!event) return null;
    const scored = getEarningsDashboardEngine().scoreEvent(event, now);
    const alert = buildEarningsAlert({
      kind,
      event,
      scorecard: scored.scorecard,
      now,
    });
    return this.applyHistory([alert], now)[0] ?? null;
  }

  private applyHistory(
    alerts: readonly EarningsAlert[],
    now: Date
  ): EarningsAlert[] {
    const history = getAlertHistoryStore();
    return alerts.map((alert) => {
      const status = history.applyStatus(alert.id, alert.status);
      const record = history.get(alert.id);
      return {
        ...alert,
        status,
        read: record?.read ?? alert.read,
        snoozeUntil: record?.snoozeUntil ?? alert.snoozeUntil,
      };
    });
  }
}

let singleton: EarningsAlertEngine | null = null;

export function getEarningsAlertEngine(): EarningsAlertEngine {
  if (!singleton) singleton = new EarningsAlertEngine();
  return singleton;
}

export function resetEarningsAlertEngine(): void {
  singleton?.clearCache();
  singleton = null;
}

/** Public API */
export function getUpcomingAlerts(now = new Date()): EarningsAlert[] {
  return getEarningsAlertEngine().getUpcomingAlerts(now);
}

export function getPortfolioAlerts(now = new Date()): EarningsAlert[] {
  return getEarningsAlertEngine().getPortfolioAlerts(now);
}

export function getWatchlistAlerts(now = new Date()): EarningsAlert[] {
  return getEarningsAlertEngine().getWatchlistAlerts(now);
}

export function dismissAlert(id: string): EarningsAlert | null {
  return getEarningsAlertEngine().dismissAlert(id);
}

export function markAlertRead(id: string): EarningsAlert | null {
  return getEarningsAlertEngine().markAlertRead(id);
}

export type { EarningsScorecard };
