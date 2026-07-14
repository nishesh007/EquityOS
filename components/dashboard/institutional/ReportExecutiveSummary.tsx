"use client";

import type { ReportViewerExecutiveSummary } from "@/lib/dashboard/institutional-report-viewer";

export function ReportExecutiveSummary({
  summary,
}: {
  summary: ReportViewerExecutiveSummary;
}) {
  return (
    <div data-testid="report-executive-summary" className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <SummaryCell label="Overall Recommendation" value={summary.overallRecommendation} wide />
        <SummaryCell label="Institutional Grade" value={summary.institutionalGrade} />
        <SummaryCell label="Overall Confidence" value={summary.overallConfidence} />
        <SummaryCell label="Validation Status" value={summary.validationStatus} />
        <SummaryCell label="Trust Grade" value={summary.trustGrade} />
        <SummaryCell label="Platform Health" value={summary.platformHealth} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            Top Risks
          </p>
          <ul className="space-y-1">
            {summary.topRisks.map((risk) => (
              <li key={risk} className="text-[11px] text-text-secondary">
                · {risk}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            Top Opportunities
          </p>
          <ul className="space-y-1">
            {summary.topOpportunities.map((opp) => (
              <li key={opp} className="text-[11px] text-text-secondary">
                · {opp}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-surface-border-subtle/60 pt-3">
        {summary.paragraphs.map((p) => (
          <p key={p} className="text-[11px] leading-relaxed text-text-secondary">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-md border border-surface-border-subtle/70 bg-surface-raised/40 px-2.5 py-2 ${
        wide ? "col-span-2 sm:col-span-2 lg:col-span-2" : ""
      }`}
    >
      <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-text-primary">{value}</p>
    </div>
  );
}
