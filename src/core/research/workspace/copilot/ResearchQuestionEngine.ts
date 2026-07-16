/**
 * Research question engine (Sprint 10A.R6).
 * Routes analyst questions to composed answers — no recalculation.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { getKnowledge } from "../knowledge/KnowledgeBaseEngine";
import { getCompanyWorkspaceView } from "../company/CompanyWorkspaceEngine";
import { getWorkspaceInsights } from "../integration/WorkspaceInsightAggregator";
import { getMemoryTimeline } from "../knowledge/ResearchMemoryEngine";
import {
  COPILOT_EMPTY,
  emptyQuestionAnswer,
  normalizeLines,
  type QuestionIntent,
  type ResearchQuestionAnswer,
  type ResearchQuestionInput,
} from "./CopilotPresentationModels";

let questionSeq = 0;

function detectIntent(question: string): QuestionIntent {
  const q = question.toLowerCase();
  if (q.includes("confidence")) return "explain_confidence";
  if (q.includes("validation") || q.includes("validate")) return "explain_validation";
  if (q.includes("risk")) return "explain_risks";
  if (q.includes("sector")) return "summarize_sector";
  if (q.includes("conclusion") || q.includes("why")) return "explain_conclusion";
  if (q.includes("conviction") || q.includes("changed")) return "conviction_change";
  if (q.includes("what changed")) return "what_changed";
  if (q.includes("summarize research") || q.includes("research summary")) {
    return "summarize_research";
  }
  if (q.includes("company") || q.includes("summarize")) return "summarize_company";
  return "general";
}

function buildAnswer(
  intent: QuestionIntent,
  input: ResearchQuestionInput
): { answer: string; citations: string[]; confidence: number } {
  const ticker = input.ticker
    ? safeWorkspaceText(input.ticker, "").toUpperCase()
    : null;
  const wid = input.workspaceId
    ? safeWorkspaceText(input.workspaceId, "").toLowerCase()
    : null;
  const knowledge = getKnowledge({ workspaceId: wid ?? undefined, ticker });
  const company = getCompanyWorkspaceView(ticker);
  const insights = getWorkspaceInsights({
    workspaceId: wid,
    ticker,
    aiSummary: input.explainability?.validationStatus ?? undefined,
  });
  const memory = getMemoryTimeline({ ticker: ticker ?? undefined, limit: 5 });
  const evidence = knowledge.evidence;
  const citations: string[] = [];

  const pushCitation = (line: string) => {
    const text = safeWorkspaceText(line, "");
    if (text) citations.push(text);
  };

  switch (intent) {
    case "explain_confidence": {
      const drivers = normalizeLines([
        ...(input.explainability?.confidenceDrivers ?? []),
        company.empty ? "" : company.overview.confidenceLabel,
        ...evidence.byKind.confidence.map((e) => e.summary),
      ]);
      drivers.forEach(pushCitation);
      return {
        answer:
          drivers.length > 0
            ? `Confidence is driven by ${drivers.join("; ")}`
            : COPILOT_EMPTY.awaitingAnalysis,
        citations: drivers,
        confidence: company.empty ? 0 : 70,
      };
    }
    case "explain_validation": {
      const status = safeWorkspaceText(
        input.explainability?.validationStatus,
        company.empty ? COPILOT_EMPTY.awaitingAnalysis : company.overview.badges.find((b) => b.tone === "validation")?.label ?? "Validation attached"
      );
      pushCitation(status);
      return {
        answer: `Validation status: ${status}`,
        citations: [status],
        confidence: 65,
      };
    }
    case "explain_risks": {
      const risks = normalizeLines([
        ...insights.keyRisks,
        ...evidence.risks.map((e) => e.summary),
      ]);
      risks.forEach(pushCitation);
      return {
        answer:
          risks.length > 0
            ? `Key risks: ${risks.join("; ")}`
            : COPILOT_EMPTY.awaitingAnalysis,
        citations: risks,
        confidence: 60,
      };
    }
    case "summarize_sector": {
      const sector = safeWorkspaceText(
        input.sector,
        company.empty ? COPILOT_EMPTY.awaitingAnalysis : company.overview.sector
      );
      pushCitation(sector);
      return {
        answer: `Sector context for ${ticker ?? "workspace"}: ${sector} · ${insights.aiSummary}`,
        citations: [sector],
        confidence: 55,
      };
    }
    case "explain_conclusion": {
      const conclusions = memory.filter((m) => m.kind === "conclusion");
      const text =
        conclusions[0]?.detail ??
        (company.empty
          ? knowledge.notes[0]?.body ?? COPILOT_EMPTY.awaitingAnalysis
          : company.overview.investmentThesis);
      pushCitation(text);
      return { answer: text, citations: [text], confidence: 68 };
    }
    case "conviction_change":
    case "what_changed": {
      const recent = memory.slice(0, 3).map((m) => m.detail);
      recent.forEach(pushCitation);
      return {
        answer:
          recent.length > 0
            ? `Recent research activity: ${recent.join(" · ")}`
            : COPILOT_EMPTY.awaitingAnalysis,
        citations: recent,
        confidence: 58,
      };
    }
    case "summarize_research": {
      const lines = normalizeLines([
        insights.aiSummary,
        ...knowledge.notes.map((n) => n.title),
      ]);
      lines.forEach(pushCitation);
      return {
        answer: lines[0] ?? COPILOT_EMPTY.noAiSummary,
        citations: lines,
        confidence: 62,
      };
    }
    case "summarize_company": {
      const summary = company.empty
        ? knowledge.notes[0]?.body ?? COPILOT_EMPTY.noAiSummary
        : `${company.overview.name} · ${company.overview.aiRecommendation} · ${company.overview.investmentThesis}`;
      pushCitation(summary);
      return { answer: summary, citations: [summary], confidence: 72 };
    }
    default: {
      const answer = insights.aiSummary || COPILOT_EMPTY.awaitingAnalysis;
      pushCitation(answer);
      return { answer, citations: [answer], confidence: 50 };
    }
  }
}

export function askResearchQuestion(
  input: ResearchQuestionInput
): ResearchQuestionAnswer {
  try {
    const question = safeWorkspaceText(input.question, "");
    if (!question) return emptyQuestionAnswer(COPILOT_EMPTY.noResearchQuestion);

    const intent = detectIntent(question);
    const composed = buildAnswer(intent, input);
    if (!composed.answer || composed.answer === COPILOT_EMPTY.awaitingAnalysis) {
      if (intent === "general" && !composed.citations.length) {
        return emptyQuestionAnswer(COPILOT_EMPTY.noResearchQuestion);
      }
    }

    questionSeq += 1;
    return {
      id: `rq-${questionSeq}-${Date.now()}`,
      question,
      intent,
      answer: composed.answer,
      citations: composed.citations,
      confidence: composed.confidence,
      empty: false,
      emptyMessage: COPILOT_EMPTY.awaitingAnalysis,
    };
  } catch {
    return emptyQuestionAnswer(COPILOT_EMPTY.noResearchQuestion);
  }
}

export function resetResearchQuestions(): void {
  questionSeq = 0;
}
