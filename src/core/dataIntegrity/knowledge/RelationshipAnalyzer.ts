/**
 * Relationship analyzer — discovers and summarizes graph relationships.
 */

import type { KnowledgeConfiguration } from "./KnowledgeConfiguration";
import type { KnowledgeGraph } from "./KnowledgeGraph";
import type { KnowledgeEdge } from "./KnowledgeEdge";
import type { KnowledgeRelationshipType } from "./KnowledgeConfiguration";

export interface RelationshipMatch {
  edge: KnowledgeEdge;
  fromLabel: string;
  toLabel: string;
}

export interface RelationshipAnalysisResult {
  nodeId?: string;
  relationships: RelationshipMatch[];
  byType: Record<string, number>;
  coveragePercent: number;
  warnings: string[];
  errors: string[];
}

export class RelationshipAnalyzer {
  constructor(private config: KnowledgeConfiguration) {}

  setConfiguration(config: KnowledgeConfiguration): void {
    this.config = config;
  }

  analyze(
    graph: KnowledgeGraph,
    options?: {
      nodeId?: string;
      relationship?: KnowledgeRelationshipType;
    }
  ): RelationshipAnalysisResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      let edges = graph.listEdges();
      if (options?.nodeId) {
        edges = edges.filter(
          (e) =>
            e.fromNodeId === options.nodeId || e.toNodeId === options.nodeId
        );
      }
      if (options?.relationship) {
        edges = edges.filter(
          (e) => e.relationship === options.relationship
        );
      }

      edges = edges.slice(0, this.config.queryLimit);

      const relationships: RelationshipMatch[] = edges.map((edge) => ({
        edge,
        fromLabel: graph.getNode(edge.fromNodeId)?.label ?? edge.fromNodeId,
        toLabel: graph.getNode(edge.toNodeId)?.label ?? edge.toNodeId,
      }));

      const byType: Record<string, number> = {};
      for (const r of relationships) {
        const key = String(r.edge.relationship);
        byType[key] = (byType[key] ?? 0) + 1;
      }

      const present = Object.keys(byType).length;
      const expected = this.config.relationshipTypes.length;
      const coveragePercent =
        expected === 0 ? 0 : round2((present / expected) * 100);

      if (relationships.length === 0) {
        warnings.push("No relationships matched the query.");
      }

      return {
        nodeId: options?.nodeId,
        relationships,
        byType,
        coveragePercent,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`Relationship analysis failed: ${String(err)}`);
      return {
        nodeId: options?.nodeId,
        relationships: [],
        byType: {},
        coveragePercent: 0,
        warnings,
        errors,
      };
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
