/**
 * Research Copilot — presentation models (Sprint 10A.R6).
 * AI-assisted terminal views. Never surface null/undefined/NaN.
 */

import { safeWorkspaceText } from "../WorkspaceModels";

export const COPILOT_EMPTY = {
  noResearchQuestion: "No Research Question",
  noAiSummary: "No AI Summary",
  noComparison: "No Comparison",
  awaitingAnalysis: "Awaiting Analysis",
} as const;

export type CopilotEmptyMessage =
  (typeof COPILOT_EMPTY)[keyof typeof COPILOT_EMPTY];

export const DECISION_GUIDANCE_IDS = [
  "buy",
  "hold",
  "reduce",
  "exit",
  "watch",
] as const;

export type DecisionGuidanceId = (typeof DECISION_GUIDANCE_IDS)[number];

export const QUESTION_INTENTS = [
  "general",
  "explain_conclusion",
  "summarize_company",
  "summarize_sector",
  "summarize_research",
  "explain_confidence",
  "explain_validation",
  "explain_risks",
  "what_changed",
  "conviction_change",
] as const;

export type QuestionIntent = (typeof QUESTION_INTENTS)[number];

export interface ExplainabilityContext {
  factorContributions?: string[] | null;
  confidenceDrivers?: string[] | null;
  validationStatus?: string | null;
  trustScore?: string | number | null;
  historicalEvidence?: string[] | null;
  decisionTrace?: string[] | null;
}

export interface ResearchQuestionInput {
  workspaceId?: string | null;
  ticker?: string | null;
  sector?: string | null;
  question: string;
  explainability?: ExplainabilityContext | null;
}

export interface ResearchQuestionAnswer {
  id: string;
  question: string;
  intent: QuestionIntent;
  answer: string;
  citations: string[];
  confidence: number;
  empty: boolean;
  emptyMessage: CopilotEmptyMessage;
}

export interface ResearchSummaryView {
  executiveSummary: string;
  bullCase: string[];
  bearCase: string[];
  catalysts: string[];
  risks: string[];
  valuationSummary: string;
  technicalSummary: string;
  financialSummary: string;
  finalConclusion: string;
  empty: boolean;
  emptyMessage: CopilotEmptyMessage;
}

export interface ComparisonDimension {
  id: string;
  label: string;
  left: string;
  right: string;
  highlight: string;
}

export interface ResearchComparisonView {
  leftTicker: string;
  rightTicker: string;
  dimensions: ComparisonDimension[];
  differences: string[];
  empty: boolean;
  emptyMessage: CopilotEmptyMessage;
}

export interface DecisionGuidance {
  id: DecisionGuidanceId;
  label: string;
  recommendation: string;
  rationale: string;
  confidence: number;
}

export interface DecisionAssistantView {
  ticker: string | null;
  guidance: DecisionGuidance[];
  whatChanged: string;
  convictionChange: string;
  empty: boolean;
  emptyMessage: CopilotEmptyMessage;
}

export interface ResearchRecommendationView {
  immediateActions: string[];
  monitorList: string[];
  researchNext: string[];
  upcomingEarnings: string[];
  upcomingAlerts: string[];
  portfolioImpact: string[];
  empty: boolean;
  emptyMessage: CopilotEmptyMessage;
}

export interface CopilotExplainabilityView {
  factorContributions: string[];
  confidenceDrivers: string[];
  validationStatus: string;
  trustScore: string;
  historicalEvidence: string[];
  decisionTrace: string[];
  empty: boolean;
  emptyMessage: CopilotEmptyMessage;
}

export function emptyQuestionAnswer(
  message: CopilotEmptyMessage = COPILOT_EMPTY.noResearchQuestion
): ResearchQuestionAnswer {
  return {
    id: "",
    question: message,
    intent: "general",
    answer: message,
    citations: [],
    confidence: 0,
    empty: true,
    emptyMessage: message,
  };
}

export function emptyResearchSummary(
  message: CopilotEmptyMessage = COPILOT_EMPTY.noAiSummary
): ResearchSummaryView {
  return {
    executiveSummary: message,
    bullCase: [],
    bearCase: [],
    catalysts: [],
    risks: [],
    valuationSummary: message,
    technicalSummary: message,
    financialSummary: message,
    finalConclusion: message,
    empty: true,
    emptyMessage: message,
  };
}

export function emptyComparisonView(
  message: CopilotEmptyMessage = COPILOT_EMPTY.noComparison
): ResearchComparisonView {
  return {
    leftTicker: "",
    rightTicker: "",
    dimensions: [],
    differences: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyDecisionAssistant(
  message: CopilotEmptyMessage = COPILOT_EMPTY.awaitingAnalysis
): DecisionAssistantView {
  return {
    ticker: null,
    guidance: [],
    whatChanged: message,
    convictionChange: message,
    empty: true,
    emptyMessage: message,
  };
}

export function emptyRecommendations(
  message: CopilotEmptyMessage = COPILOT_EMPTY.awaitingAnalysis
): ResearchRecommendationView {
  return {
    immediateActions: [],
    monitorList: [],
    researchNext: [],
    upcomingEarnings: [],
    upcomingAlerts: [],
    portfolioImpact: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyExplainabilityView(
  message: CopilotEmptyMessage = COPILOT_EMPTY.awaitingAnalysis
): CopilotExplainabilityView {
  return {
    factorContributions: [],
    confidenceDrivers: [],
    validationStatus: message,
    trustScore: message,
    historicalEvidence: [],
    decisionTrace: [],
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeLines(lines?: string[] | null, limit = 8): string[] {
  if (!Array.isArray(lines)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const text = safeWorkspaceText(line, "");
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}
