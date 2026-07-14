/**
 * Core knowledge graph store — nodes, edges, and scoring helpers.
 */

import type { KnowledgeConfiguration } from "./KnowledgeConfiguration";
import {
  cloneKnowledgeNode,
  type KnowledgeNode,
} from "./KnowledgeNode";
import {
  cloneKnowledgeEdge,
  createKnowledgeEdgeId,
  type KnowledgeEdge,
} from "./KnowledgeEdge";
import type { KnowledgeFactBundle } from "./KnowledgeRegistry";

export interface KnowledgeScoreBreakdown {
  relationshipCoverage: number;
  dependencyAccuracy: number;
  impactAccuracy: number;
  graphCompleteness: number;
  queryReliability: number;
  evidenceQuality: number;
  overall: number;
}

export interface KnowledgeGraphStats {
  nodeCount: number;
  edgeCount: number;
  relationshipTypes: string[];
  kinds: string[];
}

export class KnowledgeGraph {
  private nodes = new Map<string, KnowledgeNode>();
  private edges = new Map<string, KnowledgeEdge>();
  private querySuccesses = 0;
  private queryFailures = 0;
  private impactAnalyses = 0;
  private lastImpactConfidence = 0;

  constructor(private config: KnowledgeConfiguration) {}

  setConfiguration(config: KnowledgeConfiguration): void {
    this.config = config;
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }

  upsertNode(node: KnowledgeNode): void {
    if (this.nodes.size >= this.config.maxNodes && !this.nodes.has(node.nodeId)) {
      return;
    }
    this.nodes.set(node.nodeId, cloneKnowledgeNode(node));
  }

  upsertEdge(
    edge: Omit<KnowledgeEdge, "edgeId" | "createdAt"> & {
      edgeId?: string;
      createdAt?: string;
    }
  ): KnowledgeEdge | null {
    if (!this.nodes.has(edge.fromNodeId) || !this.nodes.has(edge.toNodeId)) {
      return null;
    }
    if (
      !this.config.relationshipTypes.includes(edge.relationship) &&
      this.config.strictMode
    ) {
      return null;
    }
    if (this.edges.size >= this.config.maxEdges) {
      return null;
    }
    const full: KnowledgeEdge = {
      edgeId:
        edge.edgeId ??
        createKnowledgeEdgeId(
          edge.fromNodeId,
          edge.toNodeId,
          String(edge.relationship)
        ),
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      relationship: edge.relationship,
      weight: edge.weight,
      confidence: clamp(edge.confidence, 0, 1),
      evidence: edge.evidence ? [...edge.evidence] : undefined,
      metadata: edge.metadata ? { ...edge.metadata } : undefined,
      createdAt: edge.createdAt ?? new Date().toISOString(),
    };
    this.edges.set(full.edgeId, full);
    return cloneKnowledgeEdge(full);
  }

  ingestBundles(bundles: KnowledgeFactBundle[]): {
    nodesAdded: number;
    edgesAdded: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let nodesAdded = 0;
    let edgesAdded = 0;

    // Pass 1: upsert all nodes so cross-source edges can resolve.
    for (const bundle of bundles) {
      for (const node of bundle.nodes) {
        const before = this.nodes.has(node.nodeId);
        this.upsertNode(node);
        if (!before && this.nodes.has(node.nodeId)) nodesAdded += 1;
      }
    }

    // Pass 2: upsert edges once endpoints exist.
    for (const bundle of bundles) {
      for (const edge of bundle.edges) {
        const created = this.upsertEdge(edge);
        if (created) edgesAdded += 1;
        else
          warnings.push(
            `Skipped edge ${edge.fromNodeId}->${edge.toNodeId} (${String(edge.relationship)}) from ${bundle.sourceId}`
          );
      }
    }
    return { nodesAdded, edgesAdded, warnings };
  }

  getNode(nodeId: string): KnowledgeNode | null {
    const n = this.nodes.get(nodeId);
    return n ? cloneKnowledgeNode(n) : null;
  }

  listNodes(): KnowledgeNode[] {
    return [...this.nodes.values()].map(cloneKnowledgeNode);
  }

  listEdges(): KnowledgeEdge[] {
    return [...this.edges.values()].map(cloneKnowledgeEdge);
  }

  getOutgoing(nodeId: string): KnowledgeEdge[] {
    return this.listEdges().filter((e) => e.fromNodeId === nodeId);
  }

  getIncoming(nodeId: string): KnowledgeEdge[] {
    return this.listEdges().filter((e) => e.toNodeId === nodeId);
  }

  stats(): KnowledgeGraphStats {
    const relationshipTypes = [
      ...new Set(this.listEdges().map((e) => String(e.relationship))),
    ];
    const kinds = [...new Set(this.listNodes().map((n) => String(n.kind)))];
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      relationshipTypes,
      kinds,
    };
  }

  recordQuery(success: boolean): void {
    if (success) this.querySuccesses += 1;
    else this.queryFailures += 1;
  }

  recordImpact(confidence: number): void {
    this.impactAnalyses += 1;
    this.lastImpactConfidence = confidence;
  }

  computeScore(expectedKinds: string[]): KnowledgeScoreBreakdown {
    const stats = this.stats();
    const expectedRel = this.config.relationshipTypes.length;
    const relationshipCoverage =
      expectedRel === 0
        ? 0
        : (stats.relationshipTypes.length / expectedRel) * 100;

    const edges = this.listEdges();
    const avgEdgeConfidence =
      edges.length === 0
        ? 0
        : (edges.reduce((s, e) => s + e.confidence, 0) / edges.length) * 100;
    const dependencyAccuracy = avgEdgeConfidence;

    const impactAccuracy =
      this.impactAnalyses === 0
        ? avgEdgeConfidence
        : this.lastImpactConfidence * 100;

    const graphCompleteness =
      expectedKinds.length === 0
        ? stats.nodeCount > 0
          ? 100
          : 0
        : (stats.kinds.filter((k) => expectedKinds.includes(k)).length /
            expectedKinds.length) *
          100;

    const totalQueries = this.querySuccesses + this.queryFailures;
    const queryReliability =
      totalQueries === 0
        ? 100
        : (this.querySuccesses / totalQueries) * 100;

    const evidenceQuality =
      edges.length === 0
        ? 0
        : (edges.filter((e) => (e.evidence?.length ?? 0) > 0).length /
            edges.length) *
          100;

    const w = this.config.scoreWeights;
    const overall =
      relationshipCoverage * w.relationshipCoverage +
      dependencyAccuracy * w.dependencyAccuracy +
      impactAccuracy * w.impactAccuracy +
      graphCompleteness * w.graphCompleteness +
      queryReliability * w.queryReliability +
      evidenceQuality * w.evidenceQuality;

    return {
      relationshipCoverage: round2(clamp(relationshipCoverage, 0, 100)),
      dependencyAccuracy: round2(clamp(dependencyAccuracy, 0, 100)),
      impactAccuracy: round2(clamp(impactAccuracy, 0, 100)),
      graphCompleteness: round2(clamp(graphCompleteness, 0, 100)),
      queryReliability: round2(clamp(queryReliability, 0, 100)),
      evidenceQuality: round2(clamp(evidenceQuality, 0, 100)),
      overall: round2(clamp(overall, 0, 100)),
    };
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
