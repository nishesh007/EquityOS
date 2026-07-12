import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { StockLink } from "@/components/ui/StockLink";
import type { IntradayIdea, SwingTradeIdea } from "@/types";
import { Bot, Clock3, Sparkles } from "lucide-react";

interface IntradayIdeasProps {
  ideas: IntradayIdea[];
}

interface SwingIdeasProps {
  ideas: SwingTradeIdea[];
}

function Price({ value }: { value: number }) {
  return (
    <span className="font-mono text-xs text-text-secondary tabular-nums">
      ₹{value.toLocaleString("en-IN")}
    </span>
  );
}

function DirectionBadge({ side }: { side: "Long" | "Short" }) {
  return <Badge variant={side === "Long" ? "gain" : "loss"}>{side}</Badge>;
}

function ScoreBar({
  score,
  tone = "accent",
}: {
  score: number;
  tone?: "accent" | "gain";
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-border">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-out ${
            tone === "gain" ? "bg-gain" : "bg-accent"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-5 font-mono text-xs text-text-secondary tabular-nums">
        {score}
      </span>
    </div>
  );
}

const headerClass =
  "whitespace-nowrap pb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint";
const cellClass = "whitespace-nowrap py-3";

export function AIIntradayIdeas({ ideas }: IntradayIdeasProps) {
  return (
    <Card padding="lg" className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-accent/5 blur-2xl" />
      <CardHeader
        title="AI Intraday Ideas"
        subtitle="Top 5 model-ranked setups for the current session"
        action={
          <div className="flex items-center gap-2 rounded-lg border border-accent/10 bg-accent/5 px-2.5 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-accent">
              AI ranked
            </span>
          </div>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border-subtle text-left">
              <th className={headerClass}>Stock</th>
              <th className={headerClass}>Bias</th>
              <th className={`${headerClass} text-right`}>Entry</th>
              <th className={`${headerClass} text-right`}>Stop Loss</th>
              <th className={`${headerClass} text-right`}>Target</th>
              <th className={`${headerClass} text-right`}>Risk / Reward</th>
              <th className={`${headerClass} text-right`}>Conviction</th>
              <th className={`${headerClass} text-right`}>Time Horizon</th>
            </tr>
          </thead>
          <tbody>
            {ideas.map((idea) => (
              <tr
                key={idea.symbol}
                className="group border-b border-surface-border-subtle/50 transition-colors last:border-0 hover:bg-surface-hover/30"
              >
                <td className={cellClass}>
                  <StockLink symbol={idea.symbol}>
                    <p className="text-xs font-semibold text-text-primary group-hover:text-accent">
                      {idea.symbol}
                    </p>
                    <p className="text-[10px] text-text-muted">{idea.company}</p>
                  </StockLink>
                </td>
                <td className={cellClass}><DirectionBadge side={idea.side} /></td>
                <td className={`${cellClass} text-right`}><Price value={idea.entry} /></td>
                <td className={`${cellClass} text-right`}><Price value={idea.stopLoss} /></td>
                <td className={`${cellClass} text-right`}><Price value={idea.target} /></td>
                <td className={`${cellClass} text-right`}>
                  <span className="font-mono text-xs font-medium text-gain">1:{idea.riskReward}</span>
                </td>
                <td className={`${cellClass} text-right`}>
                  <ScoreBar score={idea.conviction} tone="gain" />
                </td>
                <td className={`${cellClass} text-right`}>
                  <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                    <Clock3 className="h-3 w-3" />
                    {idea.timeHorizon}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function AISwingTradeIdeas({ ideas }: SwingIdeasProps) {
  return (
    <Card padding="lg" className="relative overflow-hidden">
      <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-gain/5 blur-2xl" />
      <CardHeader
        title="AI Swing Trade Ideas"
        subtitle="Top 10 opportunities · 2–8 week holding horizon"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Bot className="h-4 w-4 text-accent" />
          </div>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border-subtle text-left">
              <th className={headerClass}>Stock</th>
              <th className={headerClass}>Bias</th>
              <th className={`${headerClass} text-right`}>Entry Zone</th>
              <th className={`${headerClass} text-right`}>Stop Loss</th>
              <th className={`${headerClass} text-right`}>Targets</th>
              <th className={`${headerClass} text-right`}>Technical</th>
              <th className={`${headerClass} text-right`}>Fundamental</th>
            </tr>
          </thead>
          <tbody>
            {ideas.map((idea, index) => (
              <tr
                key={idea.symbol}
                className="group border-b border-surface-border-subtle/50 transition-colors last:border-0 hover:bg-surface-hover/30"
              >
                <td className={cellClass}>
                  <StockLink symbol={idea.symbol} className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono text-text-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-text-primary group-hover:text-accent">
                        {idea.symbol}
                      </p>
                      <p className="text-[10px] text-text-muted">{idea.company}</p>
                    </div>
                  </StockLink>
                </td>
                <td className={cellClass}><DirectionBadge side={idea.side} /></td>
                <td className={`${cellClass} text-right`}>
                  <span className="font-mono text-xs text-text-secondary tabular-nums">
                    ₹{idea.entryLow.toLocaleString("en-IN")}–{idea.entryHigh.toLocaleString("en-IN")}
                  </span>
                </td>
                <td className={`${cellClass} text-right`}><Price value={idea.stopLoss} /></td>
                <td className={`${cellClass} text-right`}>
                  <div className="flex justify-end gap-1">
                    {idea.targets.map((target, targetIndex) => (
                      <span
                        key={target}
                        className="rounded bg-gain/10 px-1.5 py-1 font-mono text-[10px] text-gain tabular-nums"
                        title={`Target ${targetIndex + 1}`}
                      >
                        ₹{target.toLocaleString("en-IN")}
                      </span>
                    ))}
                  </div>
                </td>
                <td className={`${cellClass} text-right`}>
                  <ScoreBar score={idea.technicalScore} />
                </td>
                <td className={`${cellClass} text-right`}>
                  <ScoreBar score={idea.fundamentalScore} tone="gain" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
