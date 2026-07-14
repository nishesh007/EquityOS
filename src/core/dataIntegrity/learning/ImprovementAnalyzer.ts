/**
 * Improvement analyzer — turns recommendations into advisory improvement items.
 */

import type { LearningConfiguration } from "./LearningConfiguration";
import type { LearningRecommendation } from "./RecommendationLearning";
import type { LearnedPattern } from "./PatternLearningEngine";
import type { FeedbackRecord } from "./FeedbackCollector";

export type ImprovementCategory =
  | "rule_improvement"
  | "threshold_suggestion"
  | "configuration_suggestion"
  | "coverage_suggestion"
  | "performance_suggestion"
  | "explainability_suggestion"
  | "reliability_suggestion"
  | "risk_reduction_suggestion";

export interface ImprovementItem {
  improvementId: string;
  category: ImprovementCategory;
  title: string;
  description: string;
  priority: number;
  impact: number;
  confidence: number;
  status: "backlog" | "proposed" | "accepted_advisory" | "dismissed";
  module?: string;
  createdAt: string;
  advisoryOnly: true;
}

export interface ImprovementAnalysisResult {
  improvements: ImprovementItem[];
  backlog: ImprovementItem[];
  averageImpact: number;
  averageConfidence: number;
  qualityScore: number;
  warnings: string[];
  errors: string[];
}

export class ImprovementAnalyzer {
  private config: LearningConfiguration;
  private readonly history: ImprovementItem[] = [];
  private seq = 0;

  constructor(config: LearningConfiguration) {
    this.config = config;
  }

  setConfiguration(config: LearningConfiguration): void {
    this.config = config;
  }

  analyze(input: {
    recommendations: LearningRecommendation[];
    patterns: LearnedPattern[];
    feedback: FeedbackRecord[];
  }): ImprovementAnalysisResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      if (!this.config.advisoryOnly) {
        errors.push("Learning engine requires advisoryOnly=true");
      }

      const improvements: ImprovementItem[] = [];
      for (const rec of input.recommendations) {
        this.seq += 1;
        const item: ImprovementItem = {
          improvementId: `imp:${this.seq}`,
          category: themeToCategory(rec.theme),
          title: rec.title,
          description: `${rec.rationale} (advisory only — no automatic rule/logic mutation).`,
          priority: rec.priority,
          impact: rec.impact,
          confidence: rec.confidence,
          status: "backlog",
          createdAt: new Date().toISOString(),
          advisoryOnly: true,
        };
        improvements.push(item);
        this.history.push(item);
      }

      // Ensure category coverage from patterns even if recommendations were sparse.
      for (const pattern of input.patterns.slice(0, 3)) {
        if (
          improvements.some((i) =>
            i.title.toLowerCase().includes(pattern.module.toLowerCase())
          )
        ) {
          continue;
        }
        this.seq += 1;
        const item: ImprovementItem = {
          improvementId: `imp:${this.seq}`,
          category: patternToCategory(pattern.kind),
          title: `Advisory improvement for ${pattern.kind}`,
          description: pattern.description,
          priority: pattern.severity === "high" ? 1 : 2,
          impact: pattern.severity === "high" ? 0.8 : 0.5,
          confidence: pattern.confidence,
          status: "proposed",
          module: pattern.module,
          createdAt: new Date().toISOString(),
          advisoryOnly: true,
        };
        improvements.push(item);
        this.history.push(item);
      }

      const limited = improvements.slice(0, this.config.maxImprovements);
      if (improvements.length > this.config.maxImprovements) {
        warnings.push(
          `Improvements truncated to maxImprovements (${this.config.maxImprovements})`
        );
      }

      const backlog = limited.filter(
        (i) => i.status === "backlog" || i.status === "proposed"
      );
      const averageImpact =
        limited.length === 0
          ? 0
          : round2(
              limited.reduce((s, i) => s + i.impact, 0) / limited.length
            );
      const averageConfidence =
        limited.length === 0
          ? 0
          : round2(
              limited.reduce((s, i) => s + i.confidence, 0) / limited.length
            );
      const qualityScore = clamp(
        Math.round(averageConfidence * 70 + averageImpact * 30),
        0,
        100
      );

      if (input.feedback.length === 0) {
        warnings.push("No feedback available to enrich improvement confidence");
      }

      return {
        improvements: limited,
        backlog,
        averageImpact,
        averageConfidence,
        qualityScore,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`improvement analysis failed: ${String(err)}`);
      return {
        improvements: [],
        backlog: [],
        averageImpact: 0,
        averageConfidence: 0,
        qualityScore: 0,
        warnings,
        errors,
      };
    }
  }

  listHistory(): ImprovementItem[] {
    return this.history.map((i) => ({ ...i }));
  }

  clearHistory(): void {
    this.history.length = 0;
    this.seq = 0;
  }
}

function themeToCategory(
  theme: LearningRecommendation["theme"]
): ImprovementCategory {
  switch (theme) {
    case "rule":
      return "rule_improvement";
    case "threshold":
      return "threshold_suggestion";
    case "configuration":
      return "configuration_suggestion";
    case "coverage":
      return "coverage_suggestion";
    case "performance":
      return "performance_suggestion";
    case "explainability":
      return "explainability_suggestion";
    case "reliability":
      return "reliability_suggestion";
    case "risk_reduction":
    default:
      return "risk_reduction_suggestion";
  }
}

function patternToCategory(
  kind: LearnedPattern["kind"]
): ImprovementCategory {
  switch (kind) {
    case "rule_weakness":
      return "rule_improvement";
    case "false_positive":
      return "threshold_suggestion";
    case "false_negative":
      return "coverage_suggestion";
    case "performance_drift":
      return "performance_suggestion";
    case "confidence_drift":
      return "explainability_suggestion";
    case "recurring_failure":
      return "reliability_suggestion";
    default:
      return "configuration_suggestion";
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
