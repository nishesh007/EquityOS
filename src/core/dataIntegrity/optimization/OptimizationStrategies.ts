/**
 * Optimization recommendation strategies (advisory only).
 */

export type OptimizationStrategyId =
  | "REORDER_PIPELINE"
  | "INCREASE_PARALLELISM"
  | "TUNE_CACHE_TTL"
  | "IMPROVE_CACHE_HIT"
  | "EVICT_CACHE"
  | "REMOVE_UNUSED_DEPENDENCY"
  | "BREAK_CIRCULAR_DEPENDENCY"
  | "DEDUP_EXECUTION"
  | "REMOVE_REDUNDANT_RULE"
  | "DISABLE_IDLE_PIPELINE"
  | "PRUNE_DEAD_PATH"
  | "REDUCE_RETRIES"
  | "BATCH_EXECUTION"
  | "RELIEVE_QUEUE"
  | "REDUCE_MEMORY"
  | "CUSTOM"
  | (string & {});

export type RecommendationPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface OptimizationRecommendation {
  recommendationId: string;
  strategyId: OptimizationStrategyId;
  title: string;
  description: string;
  priority: RecommendationPriority;
  targetType: "pipeline" | "rule" | "cache" | "dependency" | "module" | "queue" | "system";
  targetId: string;
  estimatedImpactPct: number;
  advisoryOnly: true;
  metadata: Record<string, unknown>;
}

export function createRecommendation(
  input: Omit<OptimizationRecommendation, "recommendationId" | "advisoryOnly">
): OptimizationRecommendation {
  return {
    ...input,
    recommendationId: `rec:${new Date().toISOString()}:${Math.random().toString(36).slice(2, 8)}`,
    advisoryOnly: true,
    metadata: { ...input.metadata },
  };
}

export const OptimizationStrategies = {
  reorderPipeline(targetId: string, impact: number, detail?: string) {
    return createRecommendation({
      strategyId: "REORDER_PIPELINE",
      title: "Reorder pipeline execution",
      description:
        detail ??
        `Reordering pipeline ${targetId} may reduce runtime without changing outcomes.`,
      priority: impact >= 20 ? "HIGH" : "MEDIUM",
      targetType: "pipeline",
      targetId,
      estimatedImpactPct: impact,
      metadata: {},
    });
  },
  increaseParallelism(targetId: string, impact: number) {
    return createRecommendation({
      strategyId: "INCREASE_PARALLELISM",
      title: "Increase parallel execution",
      description: `Pipeline ${targetId} has parallelizable stages.`,
      priority: "MEDIUM",
      targetType: "pipeline",
      targetId,
      estimatedImpactPct: impact,
      metadata: {},
    });
  },
  tuneCacheTtl(targetId: string, suggestedTtlMs: number, impact: number) {
    return createRecommendation({
      strategyId: "TUNE_CACHE_TTL",
      title: "Tune cache TTL",
      description: `Adjust TTL for ${targetId} toward ${suggestedTtlMs}ms.`,
      priority: "MEDIUM",
      targetType: "cache",
      targetId,
      estimatedImpactPct: impact,
      metadata: { suggestedTtlMs },
    });
  },
  improveCacheHit(targetId: string, impact: number) {
    return createRecommendation({
      strategyId: "IMPROVE_CACHE_HIT",
      title: "Improve cache hit ratio",
      description: `Cache for ${targetId} is below target hit ratio.`,
      priority: "HIGH",
      targetType: "cache",
      targetId,
      estimatedImpactPct: impact,
      metadata: {},
    });
  },
  removeUnusedDependency(ruleId: string, dep: string) {
    return createRecommendation({
      strategyId: "REMOVE_UNUSED_DEPENDENCY",
      title: "Remove unused dependency",
      description: `Dependency ${dep} appears unused by ${ruleId}.`,
      priority: "LOW",
      targetType: "dependency",
      targetId: ruleId,
      estimatedImpactPct: 5,
      metadata: { dependency: dep },
    });
  },
  breakCircularDependency(nodes: string[]) {
    return createRecommendation({
      strategyId: "BREAK_CIRCULAR_DEPENDENCY",
      title: "Break circular dependency",
      description: `Circular dependency detected: ${nodes.join(" -> ")}.`,
      priority: "CRITICAL",
      targetType: "dependency",
      targetId: nodes[0] ?? "unknown",
      estimatedImpactPct: 25,
      metadata: { cycle: nodes },
    });
  },
  reduceRetries(targetId: string, impact: number) {
    return createRecommendation({
      strategyId: "REDUCE_RETRIES",
      title: "Reduce retry frequency",
      description: `Target ${targetId} retries frequently; tune retry strategy.`,
      priority: "HIGH",
      targetType: "module",
      targetId,
      estimatedImpactPct: impact,
      metadata: {},
    });
  },
  relieveQueue(targetId: string, depth: number) {
    return createRecommendation({
      strategyId: "RELIEVE_QUEUE",
      title: "Relieve queue congestion",
      description: `Queue depth ${depth} for ${targetId} exceeds threshold.`,
      priority: "HIGH",
      targetType: "queue",
      targetId,
      estimatedImpactPct: 15,
      metadata: { queueDepth: depth },
    });
  },
  reduceMemory(targetId: string, bytes: number) {
    return createRecommendation({
      strategyId: "REDUCE_MEMORY",
      title: "Reduce memory usage",
      description: `${targetId} uses ${bytes} bytes; consider eviction or batching.`,
      priority: "MEDIUM",
      targetType: "module",
      targetId,
      estimatedImpactPct: 10,
      metadata: { memoryBytes: bytes },
    });
  },
  removeRedundantRule(ruleId: string) {
    return createRecommendation({
      strategyId: "REMOVE_REDUNDANT_RULE",
      title: "Remove redundant rule execution",
      description: `Rule ${ruleId} appears redundant in the current graph.`,
      priority: "MEDIUM",
      targetType: "rule",
      targetId: ruleId,
      estimatedImpactPct: 8,
      metadata: {},
    });
  },
  disableIdlePipeline(pipelineId: string) {
    return createRecommendation({
      strategyId: "DISABLE_IDLE_PIPELINE",
      title: "Review idle pipeline",
      description: `Pipeline ${pipelineId} appears idle or unused.`,
      priority: "LOW",
      targetType: "pipeline",
      targetId: pipelineId,
      estimatedImpactPct: 5,
      metadata: {},
    });
  },
  pruneDeadPath(pathId: string) {
    return createRecommendation({
      strategyId: "PRUNE_DEAD_PATH",
      title: "Prune dead execution path",
      description: `Dead path detected: ${pathId}.`,
      priority: "MEDIUM",
      targetType: "pipeline",
      targetId: pathId,
      estimatedImpactPct: 7,
      metadata: {},
    });
  },
  batchExecution(targetId: string, impact: number) {
    return createRecommendation({
      strategyId: "BATCH_EXECUTION",
      title: "Use batch execution",
      description: `Batching for ${targetId} may improve throughput.`,
      priority: "MEDIUM",
      targetType: "pipeline",
      targetId,
      estimatedImpactPct: impact,
      metadata: {},
    });
  },
  dedupExecution(targetId: string) {
    return createRecommendation({
      strategyId: "DEDUP_EXECUTION",
      title: "Deduplicate execution",
      description: `Duplicate execution detected for ${targetId}.`,
      priority: "HIGH",
      targetType: "rule",
      targetId,
      estimatedImpactPct: 12,
      metadata: {},
    });
  },
} as const;
