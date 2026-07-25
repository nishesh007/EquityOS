/**
 * Sprint 11A.2 — Executive Decision Layer presenter.
 * Presentation-only mapping of SharedRecommendation fields.
 * Never recalculates scores, trade levels, or engine outputs.
 */

import type {
  RecommendationAction,
  SharedRecommendation,
} from "@/lib/recommendations/shared-recommendation";

export type DecisionAction = "BUY" | "SELL" | "HOLD";
export type ConvictionBand = "High" | "Medium" | "Low";
export type CommitteeVerdict = "BUY" | "HOLD" | "SELL";

export type OverallCommitteeLabel =
  | "Strong Buy"
  | "Buy"
  | "Hold"
  | "Sell"
  | "Strong Sell"
  | "Insufficient Data";

export interface ExecutiveSummaryView {
  action: DecisionAction;
  convictionBand: ConvictionBand;
  confidence: number | null;
  holdingPeriod: string;
  narrative: string;
  available: boolean;
}

export interface CommitteeMemberView {
  role: string;
  verdict: CommitteeVerdict;
  confidence: number | null;
  rationale: string;
}

export interface CommitteeVerdictView {
  members: CommitteeMemberView[];
  overallLabel: OverallCommitteeLabel;
  /** 0–100 consensus strength from engine agreementPercent when available. */
  consensusPercent: number | null;
  available: boolean;
}

export interface TradePlanView {
  entry: number | null;
  entryLow: number | null;
  entryHigh: number | null;
  stopLoss: number | null;
  target1: number | null;
  target2: number | null;
  target3: number | null;
  riskReward: number | null;
  positionSize: string;
  holdingPeriod: string;
  expiryLabel: string;
  available: boolean;
}

export interface ConvictionScoreRow {
  id: string;
  label: string;
  score: number | null;
  explanation: string;
  tone: "positive" | "neutral" | "negative" | "ai" | "info";
}

export interface AiConvictionView {
  rows: ConvictionScoreRow[];
  overall: number | null;
  available: boolean;
}

export interface ExecutiveDecisionView {
  executiveSummary: ExecutiveSummaryView;
  committee: CommitteeVerdictView;
  tradePlan: TradePlanView;
  aiConviction: AiConvictionView;
}

/** Partial drawer context when a full SharedRecommendation is not yet loaded. */
export interface ExecutiveDecisionInput {
  action: DecisionAction;
  confidence: number;
  currentPrice?: number | null;
  tradeHints?: {
    entry: number | null;
    entryLow: number | null;
    entryHigh: number | null;
    primaryTarget: number | null;
  };
  source: SharedRecommendation | null;
}

const PLACEHOLDER = "Awaiting research output for this recommendation.";

function clamp01(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function toDecisionAction(action: RecommendationAction): DecisionAction {
  if (action === "SELL") return "SELL";
  if (action === "WATCHLIST") return "HOLD";
  return "BUY";
}

export function convictionBandFromScore(
  score: number | null | undefined
): ConvictionBand {
  if (score == null || !Number.isFinite(score)) return "Low";
  if (score >= 75) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

function firstLine(items: string[], fallback: string): string {
  const hit = items.find((item) => item.trim().length > 0);
  return hit?.trim() || fallback;
}

function joinSentence(parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function frameworkStrength(items: string[]): number {
  if (items.length === 0) return 0;
  return clamp01(45 + items.length * 12);
}

function memberVerdictFromFramework(
  items: string[],
  overall: DecisionAction,
  opposingHint: boolean,
  baseConfidence: number
): { verdict: CommitteeVerdict; confidence: number } {
  if (items.length === 0 && opposingHint) {
    return {
      verdict: overall === "SELL" ? "SELL" : "HOLD",
      confidence: clamp01(baseConfidence * 0.7),
    };
  }
  if (items.length === 0) {
    return { verdict: "HOLD", confidence: clamp01(baseConfidence * 0.65) };
  }
  if (opposingHint && items.length <= 1) {
    return { verdict: "HOLD", confidence: clamp01(baseConfidence * 0.8) };
  }
  if (overall === "SELL") {
    return { verdict: "SELL", confidence: clamp01(baseConfidence) };
  }
  if (overall === "HOLD") {
    return { verdict: "HOLD", confidence: clamp01(baseConfidence * 0.9) };
  }
  return { verdict: "BUY", confidence: clamp01(baseConfidence) };
}

function overallCommitteeLabel(
  action: DecisionAction,
  agreementPercent: number | null,
  conviction: number | null
): OverallCommitteeLabel {
  if (agreementPercent == null && conviction == null) return "Insufficient Data";
  const agreement = agreementPercent ?? 50;
  const conv = conviction ?? 50;

  if (action === "SELL") {
    if (agreement >= 70 && conv >= 70) return "Strong Sell";
    return "Sell";
  }
  if (action === "HOLD") return "Hold";
  if (agreement >= 75 && conv >= 75) return "Strong Buy";
  if (agreement >= 55 || conv >= 60) return "Buy";
  return "Hold";
}

function positionSizeLabel(
  conviction: number | null,
  riskMode: string | null | undefined
): string {
  const mode = (riskMode ?? "").toLowerCase();
  if (mode.includes("defensive") || mode.includes("low")) {
    return "Reduced sleeve (defensive risk mode)";
  }
  if (mode.includes("aggressive") || mode.includes("high")) {
    return conviction != null && conviction >= 75
      ? "Full sleeve (elevated risk mode)"
      : "Standard sleeve with tight risk";
  }
  const band = convictionBandFromScore(conviction);
  if (band === "High") return "Standard institutional sleeve";
  if (band === "Medium") return "Reduced sleeve";
  return "Pilot size / watch allocation";
}

function expiryFromHolding(holdingPeriod: string, timestamp: string): string {
  if (!holdingPeriod || holdingPeriod === "Unavailable") {
    return "Aligned to strategy horizon (pending)";
  }
  try {
    const date = new Date(timestamp);
    if (!Number.isFinite(date.getTime())) {
      return `Review within ${holdingPeriod}`;
    }
    return `Review within ${holdingPeriod} · issued ${date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  } catch {
    return `Review within ${holdingPeriod}`;
  }
}

function buildNarrative(rec: SharedRecommendation): string {
  const action = toDecisionAction(rec.action);
  const tech = firstLine(
    rec.matchedFrameworks.technical,
    rec.marketContext && rec.marketContext !== "Unknown"
      ? `Technical backdrop: ${rec.marketContext}.`
      : "Technical structure is mixed pending clearer confirmation."
  );
  const fund = firstLine(
    rec.matchedFrameworks.fundamental.length > 0
      ? rec.matchedFrameworks.fundamental
      : rec.matchedFrameworks.growth,
    "Fundamental quality signals are limited in the current package."
  );
  const val = firstLine(
    rec.matchedFrameworks.valuation,
    "Valuation sits near a neutral read versus the published framework set."
  );
  const risk =
    rec.riskMode && rec.riskMode !== "Unknown"
      ? `Risk posture is ${rec.riskMode.toLowerCase()} with R:R ${rec.riskReward.toFixed(2)}.`
      : `Downside is framed by the published stop with R:R ${rec.riskReward.toFixed(2)}.`;
  const macro =
    rec.marketRegime && rec.marketRegime !== "Unknown"
      ? `Macro/regime context: ${rec.marketRegime}.`
      : firstLine(
          [rec.marketContext].filter((v) => v && v !== "Unknown") as string[],
          "Event/macro context is neutral pending fresh intelligence."
        );
  const thesis = firstLine(
    rec.reasons,
    firstLine(
      rec.evidence,
      `${rec.company} (${rec.symbol}) carries a ${action} stance from ${rec.primaryStrategy}.`
    )
  );

  return joinSentence([
    `${action} — ${thesis}${/[.!?]$/.test(thesis) ? "" : "."}`,
    tech.endsWith(".") ? tech : `${tech}.`,
    fund.endsWith(".") ? fund : `${fund}.`,
    val.endsWith(".") ? val : `${val}.`,
    risk,
    macro.endsWith(".") ? macro : `${macro}.`,
  ]);
}

function scoreOrNull(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return clamp01(Math.round(value));
}

function explainFromItems(items: string[], empty: string): string {
  if (items.length === 0) return empty;
  return items.slice(0, 2).join(" · ");
}

function buildAiConviction(rec: SharedRecommendation): AiConvictionView {
  const ranking = rec.longTermRanking;
  const overall =
    scoreOrNull(rec.conviction) ?? scoreOrNull(rec.opportunityScore);

  const rows: ConvictionScoreRow[] = [
    {
      id: "technical",
      label: "Technical",
      score:
        scoreOrNull(ranking?.technicalQuality) ??
        (rec.matchedFrameworks.technical.length > 0
          ? frameworkStrength(rec.matchedFrameworks.technical)
          : scoreOrNull(rec.confidence)),
      explanation: explainFromItems(
        rec.matchedFrameworks.technical,
        "No technical framework tags in this package."
      ),
      tone: "positive",
    },
    {
      id: "fundamental",
      label: "Fundamental",
      score:
        scoreOrNull(ranking?.fundamentalQuality) ??
        (rec.matchedFrameworks.fundamental.length > 0
          ? frameworkStrength(rec.matchedFrameworks.fundamental)
          : null),
      explanation: explainFromItems(
        rec.matchedFrameworks.fundamental,
        "Fundamental framework tags unavailable."
      ),
      tone: "info",
    },
    {
      id: "valuation",
      label: "Valuation",
      score:
        scoreOrNull(ranking?.valuation) ??
        (rec.matchedFrameworks.valuation.length > 0
          ? frameworkStrength(rec.matchedFrameworks.valuation)
          : null),
      explanation: explainFromItems(
        rec.matchedFrameworks.valuation,
        "Valuation framework tags unavailable."
      ),
      tone: "neutral",
    },
    {
      id: "financial-quality",
      label: "Financial Quality",
      score:
        scoreOrNull(ranking?.capitalAllocation) ??
        (rec.matchedFrameworks.growth.length > 0
          ? frameworkStrength(rec.matchedFrameworks.growth)
          : scoreOrNull(ranking?.fundamentalQuality)),
      explanation: explainFromItems(
        rec.matchedFrameworks.growth.length > 0
          ? rec.matchedFrameworks.growth
          : rec.matchedFrameworks.fundamental,
        "Quality signals not published for this name."
      ),
      tone: "info",
    },
    {
      id: "momentum",
      label: "Momentum",
      score: scoreOrNull(ranking?.momentum) ?? scoreOrNull(rec.opportunityScore),
      explanation:
        rec.supportingStrategies.slice(0, 2).join(" · ") ||
        "Momentum inferred from opportunity score and supporting strategies.",
      tone: "positive",
    },
    {
      id: "risk",
      label: "Risk",
      score:
        scoreOrNull(ranking?.risk) ??
        scoreOrNull(rec.riskReward > 0 ? clamp01(rec.riskReward * 28) : null),
      explanation:
        rec.riskMode && rec.riskMode !== "Unknown"
          ? `Risk mode ${rec.riskMode} · R:R ${rec.riskReward.toFixed(2)}`
          : `Published R:R ${rec.riskReward.toFixed(2)}`,
      tone: "negative",
    },
    {
      id: "macro-event",
      label: "Macro / Event",
      score:
        scoreOrNull(ranking?.marketContext) ??
        scoreOrNull(ranking?.marketRegime) ??
        (rec.marketRegime && rec.marketRegime !== "Unknown"
          ? scoreOrNull(rec.agreementPercent)
          : null),
      explanation:
        [rec.marketRegime, rec.marketContext]
          .filter((v) => v && v !== "Unknown")
          .join(" · ") || "Macro/event context not published.",
      tone: "info",
    },
    {
      id: "overall",
      label: "Overall",
      score: overall,
      explanation: `Conviction ${rec.conviction} · Confidence ${round1(rec.confidence)}% · Framework ${rec.frameworkScore}`,
      tone: "ai",
    },
  ];

  return { rows, overall, available: true };
}

function buildCommittee(rec: SharedRecommendation): CommitteeVerdictView {
  const action = toDecisionAction(rec.action);
  const base = rec.confidence;
  const opposing =
    rec.opposingStrategies.length > 0 || rec.conflictPercent >= 35;

  const technical = memberVerdictFromFramework(
    rec.matchedFrameworks.technical,
    action,
    opposing && rec.matchedFrameworks.technical.length === 0,
    base
  );
  const fundamental = memberVerdictFromFramework(
    rec.matchedFrameworks.fundamental.length > 0
      ? rec.matchedFrameworks.fundamental
      : rec.matchedFrameworks.growth,
    action,
    false,
    base
  );
  const valuation = memberVerdictFromFramework(
    rec.matchedFrameworks.valuation,
    action,
    rec.matchedFrameworks.valuation.length === 0,
    base * 0.95
  );
  const riskVerdict: CommitteeVerdict =
    rec.riskReward >= 1.5 &&
    !String(rec.riskMode).toLowerCase().includes("high")
      ? action === "SELL"
        ? "SELL"
        : action === "HOLD"
          ? "HOLD"
          : "BUY"
      : "HOLD";
  const macroVerdict: CommitteeVerdict =
    rec.marketRegime.toLowerCase().includes("risk") ||
    rec.marketRegime.toLowerCase().includes("bear")
      ? "HOLD"
      : action === "SELL"
        ? "SELL"
        : action === "HOLD"
          ? "HOLD"
          : "BUY";

  const members: CommitteeMemberView[] = [
    {
      role: "Technical Analyst",
      verdict: technical.verdict,
      confidence: round1(technical.confidence),
      rationale: firstLine(
        rec.matchedFrameworks.technical,
        opposing
          ? "Trend confirmation is incomplete versus opposing strategies."
          : "Strong trend with constructive momentum signals."
      ),
    },
    {
      role: "Fundamental Analyst",
      verdict: fundamental.verdict,
      confidence: round1(fundamental.confidence),
      rationale: firstLine(
        [
          ...rec.matchedFrameworks.fundamental,
          ...rec.matchedFrameworks.growth,
        ],
        "Balance-sheet and earnings quality cues are limited in this package."
      ),
    },
    {
      role: "Valuation Analyst",
      verdict: valuation.verdict,
      confidence: round1(valuation.confidence),
      rationale: firstLine(
        rec.matchedFrameworks.valuation,
        "Trading near a neutral fair-value read on available frameworks."
      ),
    },
    {
      role: "Risk Officer",
      verdict: riskVerdict,
      confidence: round1(clamp01(base * (rec.riskReward >= 1.5 ? 1 : 0.75))),
      rationale:
        rec.riskReward >= 1.5
          ? `Risk remains within acceptable range (R:R ${rec.riskReward.toFixed(2)}).`
          : `Risk/reward ${rec.riskReward.toFixed(2)} warrants sizing caution.`,
    },
    {
      role: "Macro / Event Analyst",
      verdict: macroVerdict,
      confidence: round1(clamp01(base * 0.9)),
      rationale:
        rec.marketRegime && rec.marketRegime !== "Unknown"
          ? `Regime ${rec.marketRegime} — context ${rec.marketContext !== "Unknown" ? rec.marketContext : "supportive to neutral"}.`
          : "Upcoming events remain broadly neutral to supportive.",
    },
  ];

  return {
    members,
    overallLabel: overallCommitteeLabel(
      action,
      rec.agreementPercent,
      rec.conviction
    ),
    consensusPercent: scoreOrNull(rec.agreementPercent),
    available: true,
  };
}

function buildTradePlan(rec: SharedRecommendation): TradePlanView {
  const targets = rec.targets.filter((t) => Number.isFinite(t) && t > 0);
  return {
    entry: rec.entry > 0 ? rec.entry : null,
    entryLow: rec.entryLow ?? null,
    entryHigh: rec.entryHigh ?? null,
    stopLoss: rec.stopLoss > 0 ? rec.stopLoss : null,
    target1: targets[0] ?? null,
    target2: targets[1] ?? null,
    target3: targets[2] ?? null,
    riskReward: rec.riskReward > 0 ? round1(rec.riskReward) : null,
    positionSize: positionSizeLabel(rec.conviction, rec.riskMode),
    holdingPeriod: rec.holdingPeriod || "—",
    expiryLabel: expiryFromHolding(rec.holdingPeriod, rec.timestamp),
    available: rec.entry > 0 && rec.stopLoss > 0,
  };
}

function emptyDecision(input: ExecutiveDecisionInput): ExecutiveDecisionView {
  const hints = input.tradeHints;
  return {
    executiveSummary: {
      action: input.action,
      convictionBand: convictionBandFromScore(input.confidence),
      confidence: input.confidence > 0 ? round1(input.confidence) : null,
      holdingPeriod: "—",
      narrative: PLACEHOLDER,
      available: false,
    },
    committee: {
      members: [
        "Technical Analyst",
        "Fundamental Analyst",
        "Valuation Analyst",
        "Risk Officer",
        "Macro / Event Analyst",
      ].map((role) => ({
        role,
        verdict: "HOLD" as const,
        confidence: null,
        rationale: PLACEHOLDER,
      })),
      overallLabel: "Insufficient Data",
      consensusPercent: null,
      available: false,
    },
    tradePlan: {
      entry: hints?.entry ?? input.currentPrice ?? null,
      entryLow: hints?.entryLow ?? null,
      entryHigh: hints?.entryHigh ?? null,
      stopLoss: null,
      target1: hints?.primaryTarget ?? null,
      target2: null,
      target3: null,
      riskReward: null,
      positionSize: positionSizeLabel(input.confidence, null),
      holdingPeriod: "—",
      expiryLabel: "—",
      available: Boolean(hints?.entry || hints?.primaryTarget),
    },
    aiConviction: {
      rows: [
        "Technical",
        "Fundamental",
        "Valuation",
        "Financial Quality",
        "Momentum",
        "Risk",
        "Macro / Event",
        "Overall",
      ].map((label, index) => ({
        id: label.toLowerCase().replace(/\s+/g, "-"),
        label,
        score: index === 7 ? scoreOrNull(input.confidence) : null,
        explanation: PLACEHOLDER,
        tone: (index === 7 ? "ai" : "neutral") as ConvictionScoreRow["tone"],
      })),
      overall: scoreOrNull(input.confidence),
      available: false,
    },
  };
}

/** Build the Executive Decision Layer view from published recommendation data. */
export function buildExecutiveDecisionView(
  input: ExecutiveDecisionInput
): ExecutiveDecisionView {
  const rec = input.source;
  if (!rec) return emptyDecision(input);

  const action = toDecisionAction(rec.action);
  return {
    executiveSummary: {
      action,
      convictionBand: convictionBandFromScore(rec.conviction),
      confidence: round1(rec.confidence),
      holdingPeriod: rec.holdingPeriod || "—",
      narrative: buildNarrative(rec),
      available: true,
    },
    committee: buildCommittee(rec),
    tradePlan: buildTradePlan(rec),
    aiConviction: buildAiConviction(rec),
  };
}
