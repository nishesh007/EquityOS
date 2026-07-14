/**
 * Impact analyzer — rule/module/pipeline/policy/config/metric/event/cross-module impact.
 */

import type { KnowledgeConfiguration } from "./KnowledgeConfiguration";
import type { KnowledgeGraph } from "./KnowledgeGraph";
import type { KnowledgeNodeKind } from "./KnowledgeNode";

export type ImpactScope =
  | "RULE"
  | "MODULE"
  | "PIPELINE"
  | "POLICY"
  | "CONFIGURATION"
  | "METRIC"
  | "EVENT"
  | "CROSS_MODULE";

export interface ImpactHit {
  nodeId: string;
  label: string;
  kind: string;
  hop: number;
  viaRelationship: string;
}

export interface ImpactAnalysisResult {
  sourceNodeId: string;
  scope: ImpactScope;
  impactedNodes: ImpactHit[];
  crossModuleImpact: string[];
  confidence: number;
  warnings: string[];
  errors: string[];
}

export class ImpactAnalyzer {
  constructor(private config: KnowledgeConfiguration) {}

  setConfiguration(config: KnowledgeConfiguration): void {
    this.config = config;
  }

  analyze(
    graph: KnowledgeGraph,
    sourceNodeId: string,
    scope: ImpactScope = "CROSS_MODULE"
  ): ImpactAnalysisResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const source = graph.getNode(sourceNodeId);
      if (!source) {
        return {
          sourceNodeId,
          scope,
          impactedNodes: [],
          crossModuleImpact: [],
          confidence: 0,
          warnings,
          errors: [`Source node not found: ${sourceNodeId}`],
        };
      }

      const kindFilter = scopeToKinds(scope);
      const impacted: ImpactHit[] = [];
      const visited = new Set<string>([sourceNodeId]);
      const queue: Array<{ id: string; hop: number; via: string }> = [
        { id: sourceNodeId, hop: 0, via: "ROOT" },
      ];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.hop >= this.config.graphDepth) continue;

        const outgoing = graph.getOutgoing(current.id);
        const incoming = graph.getIncoming(current.id);
        const neighbors = [
          ...outgoing.map((e) => ({
            id: e.toNodeId,
            via: String(e.relationship),
            confidence: e.confidence,
          })),
          ...incoming.map((e) => ({
            id: e.fromNodeId,
            via: String(e.relationship),
            confidence: e.confidence,
          })),
        ];

        for (const n of neighbors) {
          if (visited.has(n.id)) continue;
          visited.add(n.id);
          const node = graph.getNode(n.id);
          if (!node) continue;
          if (
            kindFilter &&
            !kindFilter.includes(node.kind as KnowledgeNodeKind) &&
            scope !== "CROSS_MODULE"
          ) {
            continue;
          }
          impacted.push({
            nodeId: n.id,
            label: node.label,
            kind: String(node.kind),
            hop: current.hop + 1,
            viaRelationship: n.via,
          });
          queue.push({
            id: n.id,
            hop: current.hop + 1,
            via: n.via,
          });
        }
      }

      const limited = impacted.slice(0, this.config.queryLimit);
      const modules = [
        ...new Set(
          limited
            .map((h) => graph.getNode(h.nodeId)?.module)
            .filter((m): m is string => Boolean(m))
        ),
      ];
      const crossModuleImpact = modules.filter(
        (m) => m !== source.module
      );

      const confidences = graph
        .listEdges()
        .filter(
          (e) =>
            visited.has(e.fromNodeId) && visited.has(e.toNodeId)
        )
        .map((e) => e.confidence);
      const confidence =
        confidences.length === 0
          ? 0.5
          : confidences.reduce((a, b) => a + b, 0) / confidences.length;

      if (limited.length === 0) {
        warnings.push("No impact targets found within graph depth.");
      }

      const result: ImpactAnalysisResult = {
        sourceNodeId,
        scope,
        impactedNodes: limited,
        crossModuleImpact,
        confidence: round2(confidence),
        warnings,
        errors,
      };
      graph.recordImpact(result.confidence);
      return result;
    } catch (err) {
      errors.push(`Impact analysis failed: ${String(err)}`);
      return {
        sourceNodeId,
        scope,
        impactedNodes: [],
        crossModuleImpact: [],
        confidence: 0,
        warnings,
        errors,
      };
    }
  }
}

function scopeToKinds(scope: ImpactScope): KnowledgeNodeKind[] | null {
  switch (scope) {
    case "RULE":
      return ["RULE"];
    case "MODULE":
      return ["MODULE", "ENGINE"];
    case "PIPELINE":
      return ["PIPELINE"];
    case "POLICY":
      return ["POLICY"];
    case "CONFIGURATION":
      return ["CONFIGURATION"];
    case "METRIC":
      return ["METRIC", "TRUST_SCORE", "COMPLIANCE_SCORE"];
    case "EVENT":
      return ["EVENT"];
    case "CROSS_MODULE":
    default:
      return null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
