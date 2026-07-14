/**
 * Knowledge graph node model.
 */

export type KnowledgeNodeKind =
  | "ENGINE"
  | "RULE"
  | "PIPELINE"
  | "MODULE"
  | "POLICY"
  | "CONFIGURATION"
  | "METRIC"
  | "EVENT"
  | "RECOMMENDATION"
  | "SNAPSHOT"
  | "REPORT"
  | "TRUST_SCORE"
  | "COMPLIANCE_SCORE"
  | "OPTIMIZATION_RESULT"
  | "CUSTOM"
  | (string & {});

export interface KnowledgeNode {
  nodeId: string;
  kind: KnowledgeNodeKind;
  label: string;
  module?: string;
  description?: string;
  version?: string;
  healthScore?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function createKnowledgeNodeId(
  kind: KnowledgeNodeKind,
  key: string
): string {
  return `kn:${kind}:${key}`.toLowerCase();
}

export function cloneKnowledgeNode(node: KnowledgeNode): KnowledgeNode {
  return {
    ...node,
    metadata: node.metadata ? { ...node.metadata } : undefined,
  };
}
