/**
 * Knowledge graph edge / relationship model.
 */

import type { KnowledgeRelationshipType } from "./KnowledgeConfiguration";

export interface KnowledgeEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  relationship: KnowledgeRelationshipType;
  weight?: number;
  confidence: number;
  evidence?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function createKnowledgeEdgeId(
  fromNodeId: string,
  toNodeId: string,
  relationship: string
): string {
  return `ke:${fromNodeId}->${toNodeId}:${relationship}:${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function cloneKnowledgeEdge(edge: KnowledgeEdge): KnowledgeEdge {
  return {
    ...edge,
    evidence: edge.evidence ? [...edge.evidence] : undefined,
    metadata: edge.metadata ? { ...edge.metadata } : undefined,
  };
}
