import {
  ResearchCardSection,
  ResearchMetricCard,
  scoreToTone,
  type ResearchCardTone,
} from "@/components/company/research-cards";
import {
  formatScore,
} from "@/lib/format/research-numbers";
import { cn } from "@/lib/utils";
import type { EquityScore, ScoreTone } from "@/types";
import { Activity, Cpu } from "lucide-react";

interface EquityScoreEngineProps {
  score: EquityScore;
}

function factorTone(tone: ScoreTone): ResearchCardTone {
  if (tone === "gain") return "positive";
  if (tone === "loss") return "negative";
  return "neutral";
}

export function EquityScoreEngine({ score }: EquityScoreEngineProps) {
  const overall = scoreToTone(score.overall);

  return (
    <ResearchCardSection
      title="EquityOS Score"
      subtitle="Six-factor investment quality"
      badge={
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums",
            overall.tone === "positive"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : overall.tone === "warning"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : overall.tone === "negative"
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : "border-sky-500/30 bg-sky-500/10 text-sky-400"
          )}
        >
          {formatScore(score.overall)} · {overall.verdict}
        </span>
      }
    >
      <ResearchMetricCard
        title="Overall"
        value={formatScore(score.overall)}
        verdict={overall.verdict}
        tone={overall.tone}
        icon={Activity}
      />
      {score.factors.map((item) => (
        <ResearchMetricCard
          key={item.key}
          title={item.label}
          value={formatScore(item.score)}
          verdict={scoreToTone(item.score).verdict}
          tone={factorTone(item.tone)}
          icon={Cpu}
        />
      ))}
    </ResearchCardSection>
  );
}
