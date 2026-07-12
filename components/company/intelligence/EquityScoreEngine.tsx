import { IntelligenceProgress, intelligenceToneText } from "@/components/company/intelligence/IntelligenceProgress";
import { Card, CardHeader } from "@/components/ui/Card";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { cn } from "@/lib/utils";
import type { EquityScore } from "@/types";
import { Activity, Cpu, Info } from "lucide-react";

interface EquityScoreEngineProps {
  score: EquityScore;
}

export function EquityScoreEngine({ score }: EquityScoreEngineProps) {
  return (
    <Card padding="lg" className="animate-fade-in-up relative overflow-hidden">
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-accent/5 blur-3xl" />
      <div className="relative">
        <CardHeader
          title="EquityOS Score"
          subtitle="Proprietary six-factor investment quality model"
          action={
            <div className="flex items-center gap-2 rounded-lg border border-accent/15 bg-accent/5 px-2.5 py-1.5">
              <Activity className="h-3.5 w-3.5 text-accent" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-accent">
                Intelligence Engine
              </span>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-5">
            <ScoreGauge score={score.overall} label="Overall Score" size={154} />
            <p className="mt-4 text-center text-xs leading-relaxed text-text-muted">
              {score.explanation}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {score.factors.map((item) => (
              <div
                key={item.key}
                className="group rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/20 hover:bg-surface-hover/40"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Cpu className={cn("h-3.5 w-3.5", intelligenceToneText[item.tone])} />
                    <p className="text-xs font-semibold text-text-primary">{item.label}</p>
                  </div>
                  <span className={cn("font-mono text-lg font-semibold tabular-nums", intelligenceToneText[item.tone])}>
                    {item.score}
                  </span>
                </div>
                <IntelligenceProgress value={item.score} tone={item.tone} showValue={false} />
                <div className="mt-3 flex items-start gap-2">
                  <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-text-faint" />
                  <p className="text-[11px] leading-relaxed text-text-muted">
                    {item.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
