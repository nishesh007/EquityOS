/**
 * Alert Event Correlation Engine — correlate news/earnings/CA/transcript (Sprint 9C.R3).
 * Prevents duplicate stories across related event streams.
 */

import type { InstitutionalAlert } from "../AlertModels";
import { safeAlertText } from "../AlertModels";
import { higherPriority, moreSevere } from "../AlertRules";
import { resolveAlertConfidence } from "../AlertConfidence";
import { deduplicateAlerts } from "./AlertDeduplicationEngine";
import { rankNewsAlerts } from "./NewsRankingEngine";

export type CorrelationDimension =
  | "company"
  | "sector"
  | "market"
  | "event_family"
  | "story";

export interface CorrelatedAlertCluster {
  clusterId: string;
  dimension: CorrelationDimension;
  label: string;
  alerts: InstitutionalAlert[];
  representative: InstitutionalAlert;
  relatedEvents: string[];
  relatedCompanies: string[];
  count: number;
}

export interface CorrelationResult {
  clusters: CorrelatedAlertCluster[];
  alerts: InstitutionalAlert[];
  duplicatesRemoved: number;
  clustered: number;
}

const EVENT_FAMILY: Record<string, string> = {
  upcoming_earnings: "earnings",
  earnings_today: "earnings",
  earnings_tomorrow: "earnings",
  results_published: "earnings",
  eps_beat: "earnings_results",
  eps_miss: "earnings_results",
  revenue_beat: "earnings_results",
  revenue_miss: "earnings_results",
  guidance_raised: "guidance",
  guidance_lowered: "guidance",
  margin_expansion: "earnings_results",
  margin_compression: "earnings_results",
  management_commentary_published: "commentary",
  transcript_available: "transcript",
  conference_call_scheduled: "transcript",
  conference_call_live: "transcript",
  conference_call_summary_ready: "transcript",
  dividend: "corporate_action",
  bonus: "corporate_action",
  split: "corporate_action",
  rights_issue: "corporate_action",
  buyback: "corporate_action",
  merger: "corporate_action",
  acquisition: "corporate_action",
  demerger: "corporate_action",
  board_meeting: "corporate_action",
  agm: "corporate_action",
  shareholding_change: "corporate_action",
  promoter_activity: "corporate_action",
  breaking_news: "news",
  positive_news: "news",
  negative_news: "news",
  sector_news: "news",
  macro_news: "macro",
  policy_news: "macro",
  analyst_upgrade: "analyst",
  analyst_downgrade: "analyst",
  target_price_change: "analyst",
  large_order_win: "news",
  major_contract: "news",
  management_change: "news",
};

function eventFamily(alert: InstitutionalAlert): string {
  const kind = safeAlertText(alert.metadata.eventType, "");
  return EVENT_FAMILY[kind] ?? (kind || "other");
}

function storyKey(alert: InstitutionalAlert): string {
  const ticker = safeAlertText(alert.ticker, "MARKET").toUpperCase();
  const family = eventFamily(alert);
  const sector = safeAlertText(alert.metadata.extras.sector, "");
  if (family === "macro") return `market::macro`;
  if (!alert.ticker && sector) return `sector::${sector.toLowerCase()}::${family}`;
  return `company::${ticker}::${family}`;
}

function mergeCluster(members: InstitutionalAlert[]): InstitutionalAlert {
  let merged = {
    ...members[0]!,
    evidence: [...members[0]!.evidence],
    metadata: {
      ...members[0]!.metadata,
      tags: [...members[0]!.metadata.tags],
      extras: { ...members[0]!.metadata.extras },
    },
  };
  for (let i = 1; i < members.length; i += 1) {
    const next = members[i]!;
    merged = {
      ...merged,
      priority: higherPriority(merged.priority, next.priority),
      severity: moreSevere(merged.severity, next.severity),
      confidence: resolveAlertConfidence(
        Math.max(merged.confidence.score, next.confidence.score)
      ),
      evidence: Array.from(new Set([...merged.evidence, ...next.evidence])),
      inPortfolio: merged.inPortfolio || next.inPortfolio,
      inWatchlist: merged.inWatchlist || next.inWatchlist,
      summary:
        next.summary.length > merged.summary.length
          ? next.summary
          : merged.summary,
      metadata: {
        ...merged.metadata,
        groupedCount: merged.metadata.groupedCount + 1,
        tags: Array.from(
          new Set([...merged.metadata.tags, ...next.metadata.tags])
        ),
        extras: {
          ...merged.metadata.extras,
          ...next.metadata.extras,
          correlated: "true",
        },
      },
    };
  }
  return merged;
}

/**
 * Correlate alerts across news, earnings, guidance, corporate actions,
 * management commentary, and transcripts — dedupe duplicate stories.
 */
export function correlateAlerts(
  alerts: readonly InstitutionalAlert[],
  options?: { collapseClusters?: boolean }
): CorrelationResult {
  const deduped = deduplicateAlerts(alerts);
  const buckets = new Map<string, InstitutionalAlert[]>();

  for (const alert of deduped.alerts) {
    const key = storyKey(alert);
    const list = buckets.get(key) ?? [];
    list.push(alert);
    buckets.set(key, list);
  }

  const clusters: CorrelatedAlertCluster[] = [];
  const output: InstitutionalAlert[] = [];
  let clustered = 0;

  for (const [clusterId, members] of buckets) {
    const relatedEvents = Array.from(
      new Set(members.map((m) => m.metadata.eventType))
    );
    const relatedCompanies = Array.from(
      new Set(
        members
          .map((m) => safeAlertText(m.company, m.ticker))
          .filter(Boolean)
      )
    );
    const dimension: CorrelationDimension = clusterId.startsWith("market::")
      ? "market"
      : clusterId.startsWith("sector::")
        ? "sector"
        : clusterId.includes("::")
          ? "company"
          : "story";

    const representative = mergeCluster(members);
    clusters.push({
      clusterId,
      dimension,
      label: `${relatedCompanies[0] ?? "Market"} · ${eventFamily(members[0]!)} (${members.length})`,
      alerts: members,
      representative,
      relatedEvents,
      relatedCompanies,
      count: members.length,
    });

    if (members.length > 1) clustered += members.length;
    output.push(
      options?.collapseClusters === false ? members[0]! : representative
    );
  }

  const ranked = rankNewsAlerts(output).map((r) => r.alert);

  return {
    clusters: clusters.sort((a, b) => b.count - a.count),
    alerts: ranked,
    duplicatesRemoved: deduped.removed,
    clustered,
  };
}
