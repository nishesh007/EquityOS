"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Briefcase, Scale } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ReportExportToolbar } from "@/components/reporting/ReportExportToolbar";
import {
  WORKSPACE_EMPTY,
  applyWorkspaceAction,
  generateInstitutionalReport,
  getEarningsWorkspaceEngine,
  presentDecision,
  presentPortfolioRow,
  presentWatchlistRow,
  type HoldingWeightInput,
  type WorkspaceActionId,
} from "@/src/core/earnings/workspace";

interface EarningsWorkspacePanelProps {
  holdings?: HoldingWeightInput[];
  totalValue?: number;
  watchlistSymbols?: string[];
  compact?: boolean;
}

const ACTIONS: Array<{ id: WorkspaceActionId; label: string }> = [
  { id: "open_research", label: "Research" },
  { id: "open_company", label: "Company" },
  { id: "view_transcript", label: "Transcript" },
  { id: "open_historical_results", label: "History" },
  { id: "download_report", label: "Report" },
  { id: "add_to_watchlist", label: "+ Watchlist" },
  { id: "remove_from_watchlist", label: "− Watchlist" },
];

function impactVariant(
  direction: string
): "gain" | "loss" | "neutral" {
  if (direction === "Positive") return "gain";
  if (direction === "Negative") return "loss";
  return "neutral";
}

export function EarningsWorkspacePanel({
  holdings = [],
  totalValue,
  watchlistSymbols = [],
  compact = false,
}: EarningsWorkspacePanelProps) {
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [toast, setToast] = useState("");
  const [, startTransition] = useTransition();

  const workspace = useMemo(() => {
    const engine = getEarningsWorkspaceEngine();
    engine.setContext({ holdings, totalValue, watchlistSymbols });
    return engine.getWorkspace({
      selectedTicker,
      includeReport: false,
    });
  }, [holdings, totalValue, watchlistSymbols, selectedTicker]);

  const activeTicker =
    selectedTicker ?? workspace.selectedTicker ?? workspace.decisions[0]?.ticker ?? null;

  const decision = workspace.decisions.find((d) => d.ticker === activeTicker) ?? null;
  const decisionView = decision ? presentDecision(decision) : null;

  const report = useMemo(() => {
    if (!showReport || !activeTicker) return null;
    return generateInstitutionalReport(activeTicker);
  }, [showReport, activeTicker]);

  const handleAction = (ticker: string, action: WorkspaceActionId) => {
    startTransition(() => {
      if (action === "download_report") {
        setSelectedTicker(ticker);
        setShowReport(true);
        setToast("Report ready");
        return;
      }
      const result = applyWorkspaceAction(ticker, action);
      setToast(result.message);
      if (result.href && typeof window !== "undefined") {
        window.location.assign(result.href);
      }
    });
  };

  return (
    <div className="space-y-4" data-testid="earnings-workspace">
      <Card padding="lg">
        <CardHeader
          title="Earnings Decision Workspace"
          subtitle="Portfolio impact · watchlist exposure · institutional decisions"
          action={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Scale className="h-4 w-4 text-accent" />
            </div>
          }
        />

        {toast ? (
          <p className="mb-2 text-[10px] text-accent" data-testid="workspace-toast">
            {toast}
          </p>
        ) : null}

        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 text-text-faint" />
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
              Portfolio Impact
            </p>
            {!workspace.portfolio.empty ? (
              <Badge variant="accent" size="sm">
                Exposure {workspace.portfolio.overallExposure}
              </Badge>
            ) : null}
          </div>
          {workspace.portfolio.empty ? (
            <p className="py-4 text-center text-xs text-text-muted">
              {WORKSPACE_EMPTY.noPortfolio}
            </p>
          ) : (
            <div
              className={`overflow-x-auto ${compact ? "max-h-56" : "max-h-72"} overflow-y-auto`}
            >
              <table className="w-full min-w-[720px] text-left text-[10px]">
                <thead className="text-text-faint">
                  <tr>
                    <th className="pb-1 font-medium">Company</th>
                    <th className="pb-1 font-medium">Earnings</th>
                    <th className="pb-1 font-medium">Days</th>
                    <th className="pb-1 font-medium">Size</th>
                    <th className="pb-1 font-medium">Weight</th>
                    <th className="pb-1 font-medium">Conviction</th>
                    <th className="pb-1 font-medium">Beat %</th>
                    <th className="pb-1 font-medium">Risk</th>
                    <th className="pb-1 font-medium">Vol</th>
                    <th className="pb-1 font-medium">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.portfolio.rows.map((row) => {
                    const view = presentPortfolioRow(row);
                    return (
                      <tr
                        key={row.ticker}
                        className={`border-t border-surface-border-subtle/60 ${
                          activeTicker === row.ticker ? "bg-accent/5" : ""
                        }`}
                      >
                        <td className="py-1.5">
                          <button
                            type="button"
                            className="text-left font-medium text-text-primary hover:text-accent"
                            onClick={() => setSelectedTicker(row.ticker)}
                          >
                            {view.company}
                            <span className="ml-1 text-text-faint">{view.ticker}</span>
                          </button>
                        </td>
                        <td className="py-1.5 text-text-secondary">
                          {view.upcomingEarnings}
                        </td>
                        <td className="py-1.5 text-text-secondary">
                          {view.daysRemaining}
                        </td>
                        <td className="py-1.5 text-text-secondary">
                          {view.positionSize}
                        </td>
                        <td className="py-1.5 text-text-secondary">
                          {view.portfolioWeight}
                        </td>
                        <td className="py-1.5 text-text-secondary">
                          {view.aiConviction}
                        </td>
                        <td className="py-1.5 text-text-secondary">
                          {view.beatProbability}
                        </td>
                        <td className="py-1.5 text-text-secondary">
                          {view.riskLevel}
                        </td>
                        <td className="py-1.5 text-text-secondary">
                          {view.expectedVolatility}
                        </td>
                        <td className="py-1.5">
                          <Badge
                            variant={impactVariant(view.expectedPortfolioImpact)}
                            size="sm"
                          >
                            {view.expectedPortfolioImpact}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mb-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            Watchlist Impact
          </p>
          {workspace.watchlist.empty ? (
            <p className="py-3 text-center text-xs text-text-muted">
              {WORKSPACE_EMPTY.noWatchlist}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {workspace.watchlist.rows.map((row) => {
                const view = presentWatchlistRow(row);
                return (
                  <button
                    key={row.ticker}
                    type="button"
                    onClick={() => setSelectedTicker(row.ticker)}
                    className="rounded-lg border border-surface-border-subtle bg-surface/40 px-2.5 py-2 text-left hover:border-accent/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-text-primary">
                        {view.company}
                      </p>
                      <Badge variant="neutral" size="sm">
                        Conf {view.aiConfidence}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[10px] text-text-muted">
                      Exposure {view.watchlistExposure}
                      {view.highConviction === "Yes" ? " · High Conviction" : ""}
                      {view.highRisk === "Yes" ? " · High Risk" : ""}
                      {view.transcriptAvailable === "Yes"
                        ? " · Transcript"
                        : ""}
                      {view.resultsPublished === "Yes" ? " · Results" : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-surface-border-subtle/80 bg-surface-hover/10 px-3 py-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
            Decision Panel
          </p>
          {!decisionView || !decision ? (
            <p className="text-xs text-text-muted">
              {WORKSPACE_EMPTY.awaitingEarnings}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-text-primary">
                  {decision.companyName}
                </p>
                <Badge variant="accent" size="sm">
                  {decisionView.recommendation}
                </Badge>
                <Badge variant="neutral" size="sm">
                  Conf {decisionView.confidence}
                </Badge>
                <Badge variant="neutral" size="sm">
                  Risk {decisionView.risk}
                </Badge>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-text-muted">
                {decisionView.reasoning}
              </p>
              <p className="mt-1 text-[10px] text-text-faint">
                Catalysts: {decisionView.catalysts}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleAction(decision.ticker, action.id)}
                    className="rounded border border-surface-border-subtle px-1.5 py-0.5 text-[10px] text-text-muted hover:border-accent/40 hover:text-accent"
                    data-testid={`workspace-action-${action.id}`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>

      {showReport && activeTicker ? (
        <div data-testid="workspace-report">
          <Card padding="lg">
            <CardHeader
              title={report?.title ?? WORKSPACE_EMPTY.noReport}
              subtitle="Generated via Sprint 9F Reporting Engine"
              action={
                report?.ready ? (
                  <ReportExportToolbar
                    reportType="DailyMarketReport"
                    role="subscriber"
                    subscriptionTier="pro"
                  />
                ) : null
              }
            />
            {!report?.ready ? (
              <p className="py-4 text-center text-xs text-text-muted">
                {report?.emptyMessage || WORKSPACE_EMPTY.noReport}
              </p>
            ) : (
              <div
                className={`space-y-3 ${compact ? "max-h-80" : "max-h-[28rem]"} overflow-y-auto`}
              >
                {report.sections.map((section) => (
                  <div key={section.id}>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
                      {section.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
                      {section.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex justify-between text-[10px] text-text-faint">
              <span>Role-based export · PDF · Excel · Markdown · Print</span>
              <Link href="/results" className="text-accent hover:underline">
                Earnings dashboard
              </Link>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
