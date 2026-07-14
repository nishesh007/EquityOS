/**
 * Feedback collector — manual/analyst/reviewer/compliance/operational/system feedback.
 */

import type { FeedbackWeightMap } from "./LearningConfiguration";

export type FeedbackSourceType =
  | "manual"
  | "analyst"
  | "reviewer"
  | "compliance"
  | "operational"
  | "system";

export type FeedbackSentiment =
  | "positive"
  | "neutral"
  | "negative"
  | "critical";

export interface FeedbackRecord {
  feedbackId: string;
  sourceType: FeedbackSourceType;
  sentiment: FeedbackSentiment;
  module?: string;
  ruleId?: string;
  message: string;
  weight: number;
  score: number;
  tags: string[];
  createdAt: string;
}

export interface CollectFeedbackInput {
  feedbackId?: string;
  sourceType: FeedbackSourceType;
  sentiment?: FeedbackSentiment;
  module?: string;
  ruleId?: string;
  message: string;
  weight?: number;
  tags?: string[];
}

export class FeedbackCollector {
  private readonly records: FeedbackRecord[] = [];
  private maxRecords: number;
  private weights: FeedbackWeightMap;
  private seq = 0;

  constructor(maxRecords: number, weights: FeedbackWeightMap) {
    this.maxRecords = maxRecords;
    this.weights = { ...weights };
  }

  setMaxRecords(n: number): void {
    this.maxRecords = n;
  }

  setWeights(weights: FeedbackWeightMap): void {
    this.weights = { ...weights };
  }

  collect(input: CollectFeedbackInput): FeedbackRecord {
    this.seq += 1;
    const sourceWeight = this.weights[input.sourceType] ?? 1;
    const explicitWeight = input.weight ?? 1;
    const sentiment = input.sentiment ?? "neutral";
    const sentimentScore = sentimentToScore(sentiment);
    const weight = round2(sourceWeight * explicitWeight);
    const record: FeedbackRecord = {
      feedbackId: input.feedbackId ?? `fb:${this.seq}:${Date.now()}`,
      sourceType: input.sourceType,
      sentiment,
      module: input.module,
      ruleId: input.ruleId,
      message: input.message,
      weight,
      score: round2(sentimentScore * weight),
      tags: input.tags ? [...input.tags] : [],
      createdAt: new Date().toISOString(),
    };
    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records.splice(0, this.records.length - this.maxRecords);
    }
    return { ...record, tags: [...record.tags] };
  }

  list(filter?: {
    sourceType?: FeedbackSourceType;
    module?: string;
    sentiment?: FeedbackSentiment;
  }): FeedbackRecord[] {
    return this.records
      .filter((r) => {
        if (filter?.sourceType && r.sourceType !== filter.sourceType) return false;
        if (filter?.module && r.module !== filter.module) return false;
        if (filter?.sentiment && r.sentiment !== filter.sentiment) return false;
        return true;
      })
      .map((r) => ({ ...r, tags: [...r.tags] }));
  }

  coverageScore(expectedSources: FeedbackSourceType[] = [
    "manual",
    "analyst",
    "reviewer",
    "compliance",
    "operational",
    "system",
  ]): number {
    if (this.records.length === 0) return 0;
    const present = new Set(this.records.map((r) => r.sourceType));
    const hit = expectedSources.filter((s) => present.has(s)).length;
    return clamp(Math.round((hit / expectedSources.length) * 100), 0, 100);
  }

  weightedAverageScore(): number {
    if (this.records.length === 0) return 0;
    const totalWeight = this.records.reduce((s, r) => s + r.weight, 0);
    if (totalWeight === 0) return 0;
    return round2(
      this.records.reduce((s, r) => s + r.score, 0) / totalWeight
    );
  }

  get size(): number {
    return this.records.length;
  }

  clear(): void {
    this.records.length = 0;
    this.seq = 0;
  }
}

function sentimentToScore(sentiment: FeedbackSentiment): number {
  switch (sentiment) {
    case "positive":
      return 1;
    case "neutral":
      return 0.5;
    case "negative":
      return 0.2;
    case "critical":
      return 0;
    default:
      return 0.5;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
