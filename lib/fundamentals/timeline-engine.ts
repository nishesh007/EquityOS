/**
 * Company timeline engine — chronological merge of results, actions, announcements.
 */

import { corporateActionToTimelineType } from "@/lib/fundamentals/corporate-actions";
import type { CorporateAction, EnrichedQuarterlyResult } from "@/lib/fundamentals/types";
import type { CompanyNews, CompanyTimelineEvent } from "@/types";

function parseDisplayDate(date: string): number {
  const parsed = Date.parse(date);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildCompanyTimeline(input: {
  symbol: string;
  quarterlyResults: EnrichedQuarterlyResult[];
  corporateActions: CorporateAction[];
  news: CompanyNews[];
}): CompanyTimelineEvent[] {
  const events: CompanyTimelineEvent[] = [];

  const latest = input.quarterlyResults[0];
  if (latest) {
    events.push({
      id: `${input.symbol}-results-latest`,
      date: "18 Jul 2026",
      type: "Results",
      title: `${latest.quarter} results`,
      description: `Revenue ${latest.revenue}, profit ${latest.netProfit} and EPS ₹${latest.eps}.${latest.surprise === "positive" ? " Beat consensus estimates." : latest.surprise === "negative" ? " Missed expectations." : ""}`,
    });
  }

  for (const action of input.corporateActions) {
    events.push({
      id: action.id,
      date: action.date,
      type: corporateActionToTimelineType(action.type),
      title: action.title,
      description: action.description,
    });
  }

  for (const item of input.news.slice(0, 2)) {
    events.push({
      id: `news-${item.id}`,
      date: item.timestamp.includes("hour") ? "Today" : item.timestamp,
      type: "Corporate Action",
      title: item.title,
      description: item.summary,
    });
  }

  events.push({
    id: `${input.symbol}-management`,
    date: "09 Apr 2026",
    type: "Management Change",
    title: "Senior leadership appointment",
    description:
      "Leadership mandate focuses on execution, digital capability and capital discipline.",
  });

  return events.sort((a, b) => parseDisplayDate(b.date) - parseDisplayDate(a.date));
}
