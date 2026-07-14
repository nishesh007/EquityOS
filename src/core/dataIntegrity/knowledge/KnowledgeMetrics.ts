/**
 * Operational metrics for the knowledge graph engine.
 */

export interface KnowledgeOperationalMetrics {
  nodes: number;
  edges: number;
  relationships: number;
  queries: number;
  dependencyDepth: number;
  impactAnalyses: number;
  knowledgeScore: number;
  averageQueryTime: number;
  snapshotCount: number;
  lastBuildAt: string | null;
}

export class KnowledgeMetricsTracker {
  private nodes = 0;
  private edges = 0;
  private relationships = 0;
  private queries = 0;
  private dependencyDepth = 0;
  private impactAnalyses = 0;
  private knowledgeScore = 0;
  private queryTimeSum = 0;
  private snapshotCount = 0;
  private lastBuildAt: string | null = null;

  recordBuild(input: {
    nodes: number;
    edges: number;
    relationships: number;
    knowledgeScore: number;
  }): void {
    this.nodes = input.nodes;
    this.edges = input.edges;
    this.relationships = input.relationships;
    this.knowledgeScore = input.knowledgeScore;
    this.lastBuildAt = new Date().toISOString();
  }

  recordQuery(runtimeMs: number): void {
    this.queries += 1;
    this.queryTimeSum += runtimeMs;
  }

  recordDependencyDepth(depth: number): void {
    this.dependencyDepth = Math.max(this.dependencyDepth, depth);
  }

  recordImpactAnalysis(): void {
    this.impactAnalyses += 1;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): KnowledgeOperationalMetrics {
    return {
      nodes: this.nodes,
      edges: this.edges,
      relationships: this.relationships,
      queries: this.queries,
      dependencyDepth: this.dependencyDepth,
      impactAnalyses: this.impactAnalyses,
      knowledgeScore: this.knowledgeScore,
      averageQueryTime:
        this.queries === 0 ? 0 : round2(this.queryTimeSum / this.queries),
      snapshotCount: this.snapshotCount,
      lastBuildAt: this.lastBuildAt,
    };
  }

  reset(): void {
    this.nodes = 0;
    this.edges = 0;
    this.relationships = 0;
    this.queries = 0;
    this.dependencyDepth = 0;
    this.impactAnalyses = 0;
    this.knowledgeScore = 0;
    this.queryTimeSum = 0;
    this.snapshotCount = 0;
    this.lastBuildAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
