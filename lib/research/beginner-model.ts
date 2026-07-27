/**
 * Beginner-friendly research presentation model.
 * Maps existing engines — never recalculates scores.
 */

import type {
  EquityIntelligence,
  CompanyProfile,
  InvestmentVerdict,
  RedFlag,
  SeverityLevel,
} from "@/types";
import type { SharedRecommendation } from "@/lib/recommendations";

export type BeginnerVerdict = "BUY" | "HOLD" | "SELL";
export type Tone = "good" | "ok" | "bad";
export type BeginnerTabId =
  | "health"
  | "business"
  | "valuation"
  | "technical"
  | "risk";

export interface ScoreCard {
  id: string;
  title: string;
  stars: number; // 1–5
  tone: Tone;
  explanation: string;
}

export interface QualityCard {
  id: string;
  title: string;
  label: string;
  tone: Tone;
}

export interface RiskCard {
  id: string;
  title: string;
  severity: SeverityLevel;
  explanation: string;
  impact: string;
}

export interface TimelineStep {
  id: string;
  label: string;
  when: string;
}

export interface BeginnerResearchModel {
  empty: boolean;
  emptyMessage: string;
  companyName: string;
  symbol: string;
  sector: string;
  price: number | null;
  changePercent: number | null;
  priceLabel: string;
  changeLabel: string;
  verdict: BeginnerVerdict;
  confidence: number;
  confidenceLabel: string;
  lastUpdated: string;
  reasons: string[];
  risks: string[];
  financialCards: ScoreCard[];
  businessCards: QualityCard[];
  valuation: {
    currentPrice: number | null;
    fairValue: number | null;
    stance: "Undervalued" | "Fair" | "Expensive" | "Unavailable";
    marginOfSafety: number | null;
    explanation: string;
  };
  technical: {
    trend: string;
    support: string;
    resistance: string;
    momentum: string;
    risk: string;
  };
  riskCards: RiskCard[];
  decision: {
    answer: "YES" | "NO" | "WAIT";
    buyZone: string;
    target: string;
    stopLoss: string;
    holdingPeriod: string;
    suitableFor: Array<"Beginner" | "Swing" | "Long Term">;
  };
  timeline: TimelineStep[];
  companyHref: string;
}

function clampStars(score0to100: number): number {
  if (!Number.isFinite(score0to100) || score0to100 <= 0) return 1;
  return Math.max(1, Math.min(5, Math.round(score0to100 / 20)));
}

function toneFromStars(stars: number): Tone {
  if (stars >= 4) return "good";
  if (stars >= 3) return "ok";
  return "bad";
}

function toneFromLabel(label: string): Tone {
  const t = label.toLowerCase();
  if (
    /strong|high|excellent|good|wide|buy|bullish|undervalued/.test(t)
  ) {
    return "good";
  }
  if (/moderate|fair|average|hold|neutral|medium/.test(t)) return "ok";
  return "bad";
}

function mapVerdict(
  intelligence: EquityIntelligence | null,
  recommendation: SharedRecommendation | null
): BeginnerVerdict {
  const v =
    intelligence?.decision?.verdict ??
    intelligence?.summary?.verdict ??
    null;
  if (v === "BUY") return "BUY";
  if (v === "SELL") return "SELL";
  if (v === "HOLD" || v === "WATCH") return "HOLD";

  const action = recommendation?.action;
  if (action === "BUY") return "BUY";
  if (action === "SELL") return "SELL";
  return "HOLD";
}

function mapDecisionAnswer(verdict: BeginnerVerdict): "YES" | "NO" | "WAIT" {
  if (verdict === "BUY") return "YES";
  if (verdict === "SELL") return "NO";
  return "WAIT";
}

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "Not available yet";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function plainReason(text: string): string {
  return text
    .replace(/\bindicate adequate capital efficiency\.?/gi, "show the company uses money reasonably well.")
    .replace(/\bcapital efficiency\b/gi, "how well money is put to work")
    .replace(/\bFree cash flow positive\b/gi, "The business is generating leftover cash")
    .replace(/\bfree cash flow\b/gi, "leftover cash")
    .replace(/\bPE\b/gi, "price vs earnings")
    .replace(/\bP\/E\b/gi, "price vs earnings")
    .replace(/\bROE\b/gi, "return on equity")
    .replace(/\bROCE\b/gi, "return on capital")
    .replace(/\bDCF\b/gi, "estimated fair value")
    .replace(/\bMACD\b/gi, "momentum signal")
    .replace(/\bRSI\b/gi, "momentum")
    .replace(/\bEMA\b/gi, "trend average")
    .replace(/\bYoY\b/gi, "year over year")
    .replace(/\bCAGR\b/gi, "yearly growth rate")
    .replace(/\bintrinsic value\b/gi, "fair value estimate")
    .replace(/\bmargin of safety\b/gi, "safety cushion")
    .replace(/\boperating leverage\b/gi, "profits rising with sales")
    .replace(/\bBlended\b/gi, "Combined")
    .replace(/\bvaluation models\b/gi, "price checks")
    .replace(/\bupside potential\b/gi, "room to rise")
    .replace(/\bEPS\b/g, "earnings per share")
    .replace(/\bper-share earnings compounding\b/gi, "earnings growing per share")
    .replace(/\bOperating margin\b/gi, "Profit from operations")
    .replace(/\bNet margin\b/gi, "Overall profit margin")
    .replace(/\s+/g, " ")
    .trim();
}

function friendlyTimelineLabel(kind: string, fallback: string): string {
  const map: Record<string, string> = {
    research_created: "Research Started",
    validation_updated: "Financial Analysis Completed",
    trust_updated: "AI Review Completed",
    decision_recorded: "Final Recommendation Generated",
    conclusion_recorded: "Final Recommendation Generated",
    note_saved: "Notes Saved",
    observation_recorded: "Observation Added",
    earnings_released: "Company Results Released",
    opportunity_detected: "Opportunity Spotted",
    report_exported: "Report Saved",
  };
  return map[kind] ?? fallback.replace(/_/g, " ");
}

function valuationStance(
  verdict: string | undefined,
  upside: number | null
): "Undervalued" | "Fair" | "Expensive" | "Unavailable" {
  if (!verdict && upside == null) return "Unavailable";
  const v = (verdict ?? "").toLowerCase();
  if (v.includes("under")) return "Undervalued";
  if (v.includes("over")) return "Expensive";
  if (v.includes("fair")) return "Fair";
  if (upside != null) {
    if (upside >= 10) return "Undervalued";
    if (upside <= -10) return "Expensive";
    return "Fair";
  }
  return "Unavailable";
}

export function buildBeginnerResearchModel(input: {
  profile: CompanyProfile | null;
  intelligence: EquityIntelligence | null;
  recommendation: SharedRecommendation | null;
  timelineEntries?: Array<{ id: string; kind: string; label: string; at?: string }>;
  lastUpdated?: string;
}): BeginnerResearchModel {
  const { profile, intelligence, recommendation } = input;

  if (!profile) {
    return {
      empty: true,
      emptyMessage:
        "Pick a company to see a simple research summary — whether it looks good to buy, why, and at what price.",
      companyName: "",
      symbol: "",
      sector: "",
      price: null,
      changePercent: null,
      priceLabel: "—",
      changeLabel: "—",
      verdict: "HOLD",
      confidence: 0,
      confidenceLabel: "—",
      lastUpdated: "—",
      reasons: [],
      risks: [],
      financialCards: [],
      businessCards: [],
      valuation: {
        currentPrice: null,
        fairValue: null,
        stance: "Unavailable",
        marginOfSafety: null,
        explanation: "Open a company to see if the price looks high or low.",
      },
      technical: {
        trend: "—",
        support: "—",
        resistance: "—",
        momentum: "—",
        risk: "—",
      },
      riskCards: [],
      decision: {
        answer: "WAIT",
        buyZone: "—",
        target: "—",
        stopLoss: "—",
        holdingPeriod: "—",
        suitableFor: ["Beginner"],
      },
      timeline: [],
      companyHref: "/watchlist",
    };
  }

  const price =
    profile.quote?.price && profile.quote.price > 0
      ? profile.quote.price
      : profile.price > 0
        ? profile.price
        : null;
  const changePercent =
    profile.quote?.changePercent ??
    (Number.isFinite(profile.changePercent) ? profile.changePercent : null);

  const verdict = mapVerdict(intelligence, recommendation);
  const confidence = Math.round(
    recommendation?.confidence ??
      intelligence?.decision?.conviction?.confidence ??
      intelligence?.thesis?.confidence ??
      intelligence?.score?.overall ??
      0
  );

  const reasons = (
    intelligence?.decision?.aiSummary?.whyBuy?.length
      ? intelligence.decision.aiSummary.whyBuy
      : intelligence?.summary?.reasons?.length
        ? intelligence.summary.reasons
        : recommendation?.reasons?.length
          ? recommendation.reasons
          : intelligence?.thesis?.keyCatalysts ?? []
  )
    .map(plainReason)
    .filter((r) => !/overvalued|expensive|negative safety|limited safety/i.test(r))
    .slice(0, 3);

  const riskLines = (
    intelligence?.decision?.aiSummary?.majorRisks?.length
      ? intelligence.decision.aiSummary.majorRisks
      : intelligence?.thesis?.keyRisks?.length
        ? intelligence.thesis.keyRisks
        : intelligence?.redFlags?.map((f) => f.description) ?? []
  )
    .map(plainReason)
    .slice(0, 2);

  const fq = intelligence?.financialQuality?.scores ?? [];
  const financialCards: ScoreCard[] = (
    fq.length > 0
      ? fq.slice(0, 5).map((s) => {
          const stars = clampStars(s.score);
          return {
            id: s.key,
            title: s.label
              .replace(/ROE/i, "Return on Equity")
              .replace(/Operating Margin Trend/i, "Profit Margins")
              .replace(/Net Margin Trend/i, "Bottom-Line Margins")
              .replace(/EPS Growth/i, "Earnings Per Share Growth")
              .replace(/Growth/i, "Growth"),
            stars,
            tone: toneFromStars(stars),
            explanation: plainReason(s.explanation),
          };
        })
      : [
          {
            id: "revenue",
            title: "Revenue Growth",
            stars: clampStars(
              50 + Math.min(40, Math.max(-40, profile.financials.revenueGrowth))
            ),
            tone: "ok",
            explanation:
              profile.financials.revenueGrowth > 10
                ? "Sales have been growing at a healthy pace."
                : profile.financials.revenueGrowth > 0
                  ? "Sales are growing, but slowly."
                  : "Sales growth looks weak right now.",
          },
          {
            id: "profit",
            title: "Profit Growth",
            stars: clampStars(
              50 +
                Math.min(40, Math.max(-40, profile.financials.netProfitGrowth))
            ),
            tone: "ok",
            explanation:
              profile.financials.netProfitGrowth > 10
                ? "Profits are rising along with the business."
                : "Profit growth needs a closer look.",
          },
          {
            id: "debt",
            title: "Debt",
            stars: clampStars(
              Math.max(
                10,
                100 - Math.min(100, profile.financials.debtToEquity * 40)
              )
            ),
            tone: "ok",
            explanation:
              profile.financials.debtToEquity < 0.5
                ? "The company does not carry heavy debt."
                : profile.financials.debtToEquity < 1
                  ? "Debt looks manageable."
                  : "Debt is high — this can add risk.",
          },
          {
            id: "cash",
            title: "Cash Flow",
            // CompanyFinancials has no cash-flow field — approximate from
            // profit growth, ROCE, and debt (healthier combo ≈ stronger cash).
            stars: clampStars(
              Math.min(
                100,
                (profile.financials.netProfitGrowth > 5 ? 35 : 10) +
                  Math.min(35, Math.max(0, profile.financials.roce * 1.5)) +
                  (profile.financials.debtToEquity < 0.8 ? 30 : 10)
              )
            ),
            tone: "ok",
            explanation:
              profile.financials.roce >= 15 &&
              profile.financials.netProfitGrowth > 0
                ? "Profits and capital returns suggest cash is being generated."
                : "Cash generation looks mixed — dig deeper before buying.",
          },
          {
            id: "roe",
            title: "Return on Equity",
            stars: clampStars(Math.min(100, profile.financials.roe * 4)),
            tone: "ok",
            explanation:
              profile.financials.roe >= 15
                ? "The company uses shareholder money efficiently."
                : "Returns on equity are modest.",
          },
        ]
  ).map((c) => ({ ...c, tone: toneFromStars(c.stars) }));

  const thesis = intelligence?.thesis;
  const overallScore = intelligence?.score?.overall ?? 0;
  const businessCards: QualityCard[] = [
    {
      id: "model",
      title: "Business Model",
      label:
        overallScore >= 70
          ? "Strong"
          : overallScore >= 50
            ? "Good"
            : "Needs care",
      tone: toneFromStars(clampStars(overallScore || 40)),
    },
    {
      id: "mgmt",
      title: "Management",
      label: thesis?.managementQuality || "Not rated yet",
      tone: toneFromLabel(thesis?.managementQuality || ""),
    },
    {
      id: "moat",
      title: "Competitive Edge",
      label: thesis?.moat || "Not rated yet",
      tone: toneFromLabel(thesis?.moat || ""),
    },
    {
      id: "growth",
      title: "Future Growth",
      label:
        (thesis?.expectedCagr ?? 0) >= 12
          ? "High"
          : (thesis?.expectedCagr ?? 0) >= 6
            ? "Moderate"
            : "Low",
      tone:
        (thesis?.expectedCagr ?? 0) >= 12
          ? "good"
          : (thesis?.expectedCagr ?? 0) >= 6
            ? "ok"
            : "bad",
    },
  ];

  const val = intelligence?.valuation;
  const fairValue =
    val?.estimatedFairValue ||
    val?.intrinsicValue ||
    thesis?.fairValue ||
    null;
  const mos = val?.marginOfSafety ?? null;
  const stance = valuationStance(val?.overallVerdict, val?.upsidePercent ?? null);

  const tech = intelligence?.decision?.technical;
  const trendRaw =
    tech?.metrics?.find((m) => /trend/i.test(m.label))?.value ||
    (tech?.overallScore != null && tech.overallScore >= 55
      ? "Bullish"
      : tech?.overallScore != null && tech.overallScore < 45
        ? "Bearish"
        : "Sideways");

  const redFlags: RedFlag[] = intelligence?.redFlags?.slice(0, 5) ?? [];
  const riskCards: RiskCard[] =
    redFlags.length > 0
      ? redFlags.map((f) => ({
          id: f.key,
          title: f.label,
          severity: f.severity,
          explanation: plainReason(f.description),
          impact:
            f.severity === "High"
              ? "Could hurt returns or increase losses."
              : f.severity === "Medium"
                ? "May slow growth or add volatility."
                : "Worth watching, but not urgent.",
        }))
      : riskLines.map((r, i) => ({
          id: `risk-${i}`,
          title: `Risk ${i + 1}`,
          severity: "Medium" as SeverityLevel,
          explanation: r,
          impact: "Could affect your returns if things go wrong.",
        }));

  const entry = recommendation?.entry;
  const entryLow = recommendation?.entryLow;
  const entryHigh = recommendation?.entryHigh;
  const buyZone =
    entryLow && entryHigh
      ? `${money(entryLow)} – ${money(entryHigh)}`
      : entry
        ? money(entry)
        : intelligence?.decision?.entry?.idealBuyZone || "Wait for a clearer price";

  const target =
    recommendation?.targets?.[0] != null
      ? money(recommendation.targets[0])
      : intelligence?.decision?.targets?.target1
        ? money(intelligence.decision.targets.target1)
        : "Not set yet";

  const stopLoss =
    recommendation?.stopLoss != null && recommendation.stopLoss > 0
      ? money(recommendation.stopLoss)
      : intelligence?.decision?.targets?.stopLoss
        ? money(intelligence.decision.targets.stopLoss)
        : "Not set yet";

  const holdingPeriod =
    recommendation?.holdingPeriod ||
    intelligence?.decision?.timeline?.[0]?.horizon ||
    "A few months to a few years";

  const suitableFor: Array<"Beginner" | "Swing" | "Long Term"> = ["Beginner"];
  if (/swing|week|day/i.test(holdingPeriod)) suitableFor.push("Swing");
  else suitableFor.push("Long Term");

  const timeline = (input.timelineEntries ?? [])
    .slice(0, 6)
    .map((e) => ({
      id: e.id,
      label: friendlyTimelineLabel(e.kind, e.label),
      when: e.at
        ? new Date(e.at).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
    }));

  // Ensure we always show a simple default timeline for beginners.
  const defaultTimeline: TimelineStep[] =
    timeline.length > 0
      ? timeline
      : [
          { id: "1", label: "Research Started", when: "" },
          { id: "2", label: "Financial Analysis Completed", when: "" },
          { id: "3", label: "AI Review Completed", when: "" },
          { id: "4", label: "Final Recommendation Generated", when: "" },
        ];

  const lastUpdated =
    input.lastUpdated ||
    profile.quote?.lastUpdatedIST?.replace("\n", " ") ||
    intelligence?.dataTransparency?.lastUpdated ||
    new Date().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return {
    empty: false,
    emptyMessage: "",
    companyName: profile.name,
    symbol: profile.symbol,
    sector: profile.sector || profile.industry || "—",
    price,
    changePercent,
    priceLabel: money(price),
    changeLabel:
      changePercent == null
        ? "—"
        : `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}% today`,
    verdict,
    confidence,
    confidenceLabel: `${confidence}% confident`,
    lastUpdated,
    reasons:
      reasons.length > 0
        ? reasons
        : [
            "The business is being reviewed with available company data.",
            "Check the tabs below for finances, value, and risks.",
            "Use the decision box for a simple yes / no / wait answer.",
          ],
    risks: (
      riskLines.length > 0
        ? [
            ...riskLines,
            "All stocks can fall — only invest money you can leave invested.",
            "Company results or market mood can change the outlook.",
          ]
        : [
            "All stocks can fall — only invest money you can leave invested.",
            "Company results or market mood can change the outlook.",
          ]
    ).slice(0, 2),
    financialCards,
    businessCards,
    valuation: {
      currentPrice: price,
      fairValue: fairValue && fairValue > 0 ? fairValue : null,
      stance,
      marginOfSafety: mos,
      explanation:
        stance === "Undervalued"
          ? "The price looks lower than our simple fair-value estimate."
          : stance === "Expensive"
            ? "The price looks higher than our simple fair-value estimate."
            : stance === "Fair"
              ? "The price looks roughly in line with fair value."
              : "We do not have enough data yet to judge the price.",
    },
    technical: {
      trend: /bull/i.test(trendRaw)
        ? "Bullish"
        : /bear/i.test(trendRaw)
          ? "Bearish"
          : "Sideways",
      support: tech?.support ? money(tech.support) : "Not available yet",
      resistance: tech?.resistance
        ? money(tech.resistance)
        : "Not available yet",
      momentum:
        (tech?.overallScore ?? 50) >= 55
          ? "Improving"
          : (tech?.overallScore ?? 50) <= 45
            ? "Weakening"
            : "Steady",
      risk:
        (intelligence?.decision?.risk?.overallRiskMeter ?? 50) >= 65
          ? "Higher"
          : (intelligence?.decision?.risk?.overallRiskMeter ?? 50) <= 35
            ? "Lower"
            : "Moderate",
    },
    riskCards,
    decision: {
      answer: mapDecisionAnswer(verdict),
      buyZone,
      target,
      stopLoss,
      holdingPeriod,
      suitableFor: [...new Set(suitableFor)],
    },
    timeline: defaultTimeline,
    companyHref: `/company/${profile.symbol}`,
  };
}
