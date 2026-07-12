import { IntelligenceProgress } from "@/components/company/intelligence/IntelligenceProgress";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type {
  AIInvestorSummary,
  InvestmentChecklist,
  InvestmentVerdict,
  ScoreTone,
} from "@/types";
import { Bot, Check, ClipboardCheck, Eye, ShieldCheck, X } from "lucide-react";

interface InvestorDecisionPanelProps {
  summary: AIInvestorSummary;
  checklist: InvestmentChecklist;
}

const verdictStyles: Record<InvestmentVerdict, { text: string; border: string; bg: string; tone: ScoreTone }> = {
  BUY: { text: "text-gain", border: "border-gain/20", bg: "bg-gain-bg", tone: "gain" },
  HOLD: { text: "text-accent", border: "border-accent/20", bg: "bg-accent/10", tone: "accent" },
  WATCH: { text: "text-accent", border: "border-accent/20", bg: "bg-accent/10", tone: "accent" },
  SELL: { text: "text-loss", border: "border-loss/20", bg: "bg-loss-bg", tone: "loss" },
};

export function InvestorDecisionPanel({
  summary,
  checklist,
}: InvestorDecisionPanelProps) {
  const verdict = verdictStyles[summary.verdict];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card padding="lg" className="animate-fade-in-up relative h-full overflow-hidden">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <CardHeader
            title="AI Investor Summary"
            subtitle="Plain-English investment decision"
            action={<Bot className="h-4 w-4 text-accent" />}
          />
          <div className={cn("rounded-lg border p-5", verdict.border, verdict.bg)}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              EquityOS View
            </p>
            <div className="mt-2 flex items-center gap-3">
              <p className={cn("text-3xl font-bold tracking-tight", verdict.text)}>
                {summary.verdict}
              </p>
              {summary.verdict === "WATCH" && <Eye className={cn("h-5 w-5", verdict.text)} />}
              {summary.verdict === "BUY" && <ShieldCheck className={cn("h-5 w-5", verdict.text)} />}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {summary.summary}
            </p>
          </div>
          <div className="mt-4">
            <p className="mb-3 text-xs font-semibold text-text-primary">Why</p>
            <div className="space-y-2">
              {summary.reasons.map((reason) => (
                <div
                  key={reason}
                  className="flex items-start gap-2 rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-3"
                >
                  <span className={cn("mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full", verdict.text === "text-loss" ? "bg-loss" : "bg-accent")} />
                  <p className="text-xs leading-relaxed text-text-secondary">{reason}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-[10px] text-text-faint">
            AI-generated from mock financial data. Research illustration only.
          </p>
        </div>
      </Card>

      <Card padding="lg" className="animate-fade-in-up h-full">
        <CardHeader
          title="Investment Checklist"
          subtitle={`${checklist.items.filter((item) => item.passed).length} of ${checklist.items.length} quality checks passed`}
          action={<ClipboardCheck className="h-4 w-4 text-accent" />}
        />
        <div className="mb-4 rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="data-label">Overall Checklist Score</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-text-primary tabular-nums">
                {checklist.score}
                <span className="text-xs text-text-faint"> / 100</span>
              </p>
            </div>
            <span className={cn("text-xs font-medium", checklist.score >= 70 ? "text-gain" : checklist.score >= 50 ? "text-accent" : "text-loss")}>
              {checklist.score >= 70 ? "Strong" : checklist.score >= 50 ? "Mixed" : "Weak"}
            </span>
          </div>
          <IntelligenceProgress
            className="mt-3"
            value={checklist.score}
            tone={checklist.score >= 70 ? "gain" : checklist.score >= 50 ? "accent" : "loss"}
            showValue={false}
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {checklist.items.map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-3 rounded-lg border border-surface-border-subtle bg-surface/50 p-3"
            >
              <div
                className={cn(
                  "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md",
                  item.passed ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                )}
              >
                {item.passed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-text-primary">{item.label}</p>
                <p className="truncate text-[10px] text-text-muted">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
