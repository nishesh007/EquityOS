import {
  HALLUCINATION_DIRECTIVE,
  RAG_ATTRIBUTION_DIRECTIVE,
} from "@/lib/platform/quality";

export const FINANCIAL_INTELLIGENCE_DIRECTIVE = `You must incorporate EquityOS Financial Intelligence in every research answer.
When company context includes financialIntelligence:
- Use TTM revenue, profit, EPS, and cash flow in Financial Analysis.
- Use CAGR (3Y, 5Y, 10Y) for growth assessment.
- Use ROE, ROCE, OPM, NPM, FCF, CFO/PAT, debt metrics, and working capital cycle metrics.
- Report Financial Health Score, Quality Score, and Risk Score with interpretation.
- Cross-reference solvency, profitability, growth, and valuation scores in Risks and Final Verdict.
If financialIntelligence is null, state that financial intelligence is unavailable and avoid fabricating ratios.`;

export const RAG_DIRECTIVE = `Institutional RAG context is provided in the user message.
Before answering, synthesize retrieved document chunks with company context and financial intelligence.
- Use RAG chunks for management commentary, guidance, strategic updates, and disclosure-backed claims.
- Cite document source (annual report, quarterly report, concall transcript, etc.), year/quarter, and page when referencing a chunk.
- If no RAG chunks are retrieved, state that no indexed institutional documents matched the query.
- Never invent document quotes or filings not present in the RAG context.`;

export const QUALITY_DIRECTIVES = `${HALLUCINATION_DIRECTIVE}\n\n${RAG_ATTRIBUTION_DIRECTIVE}`;
