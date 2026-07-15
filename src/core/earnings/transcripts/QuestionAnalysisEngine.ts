/**
 * Analyst Q&A analysis from conference call transcript.
 */

import type { QuestionAnalysisView, RawTranscriptDocument } from "./TranscriptModels";
import { TRANSCRIPT_EMPTY } from "./TranscriptModels";

function parseQaPairs(qa: string): Array<{ question: string; answer: string }> {
  const lines = qa
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const pairs: Array<{ question: string; answer: string }> = [];
  let currentQ: string | null = null;

  for (const line of lines) {
    if (/^analyst:/i.test(line)) {
      currentQ = line.replace(/^analyst:\s*/i, "").trim();
    } else if (/^management:/i.test(line) && currentQ) {
      pairs.push({
        question: currentQ,
        answer: line.replace(/^management:\s*/i, "").trim(),
      });
      currentQ = null;
    }
  }
  return pairs;
}

export function analyzeQuestions(doc: RawTranscriptDocument): QuestionAnalysisView {
  if (!doc.questionAnswer || doc.questionAnswer.trim().length < 20) {
    return {
      topAnalystQuestions: [],
      managementResponses: [],
      questionsAvoided: [],
      importantFollowUps: [],
      areasOfConcern: [],
      available: false,
      emptyMessage: doc.hasConferenceCall
        ? TRANSCRIPT_EMPTY.commentaryPending
        : TRANSCRIPT_EMPTY.noConferenceCall,
    };
  }

  const pairs = parseQaPairs(doc.questionAnswer);
  if (pairs.length === 0) {
    return {
      topAnalystQuestions: [],
      managementResponses: [],
      questionsAvoided: [],
      importantFollowUps: [],
      areasOfConcern: [],
      available: false,
      emptyMessage: TRANSCRIPT_EMPTY.commentaryPending,
    };
  }

  const avoided = pairs
    .filter((p) =>
      /not guide|prefer not|will not|next quarter|not break that out|share more next/i.test(
        p.answer
      )
    )
    .map((p) => p.question);

  const concerns = pairs
    .filter((p) =>
      /risk|weak|cut|pressure|stress|competition|margin|nim|attrition/i.test(
        `${p.question} ${p.answer}`
      )
    )
    .map((p) => p.question);

  const followUps = pairs
    .filter((p) => /follow-up|next call|next quarter|monitor/i.test(p.answer))
    .map((p) => p.question);

  return {
    topAnalystQuestions: pairs.map((p) => p.question).slice(0, 5),
    managementResponses: pairs.map((p) => p.answer).slice(0, 5),
    questionsAvoided: avoided.length > 0 ? avoided : ["None flagged as avoided"],
    importantFollowUps:
      followUps.length > 0 ? followUps : ["Monitor guidance conversion next quarter"],
    areasOfConcern: concerns.length > 0 ? concerns : ["No major concern themes flagged"],
    available: true,
    emptyMessage: "",
  };
}
