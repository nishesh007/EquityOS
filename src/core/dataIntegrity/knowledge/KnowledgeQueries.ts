/**
 * Knowledge graph query engine and visualization backend models.
 */

import type { KnowledgeConfiguration } from "./KnowledgeConfiguration";
import type { KnowledgeGraph } from "./KnowledgeGraph";
import type { KnowledgeNode, KnowledgeNodeKind } from "./KnowledgeNode";
import type { KnowledgeEdge } from "./KnowledgeEdge";
import type { KnowledgeRelationshipType } from "./KnowledgeConfiguration";
import type { DependencyTreeNode } from "./DependencyGraph";

export type KnowledgeQueryKind =
  | "FIND_DEPENDENCIES"
  | "FIND_DEPENDENTS"
  | "FIND_CRITICAL_PATHS"
  | "FIND_RELATED_RULES"
  | "FIND_RELATED_MODULES"
  | "FIND_POLICY_COVERAGE"
  | "FIND_EVENT_CHAINS"
  | "FIND_METRIC_SOURCES"
  | "CUSTOM";

export interface KnowledgeQuery {
  kind: KnowledgeQueryKind;
  nodeId?: string;
  relationship?: KnowledgeRelationshipType;
  customPredicate?: (node: KnowledgeNode, edge: KnowledgeEdge) => boolean;
  limit?: number;
}

export interface KnowledgeQueryResult {
  kind: KnowledgeQueryKind;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  paths: string[][];
  warnings: string[];
  errors: string[];
  executionTimeMs: number;
}

/** Backend visualization models — no UI rendering. */
export interface NodeGraphModel {
  nodes: Array<{ id: string; label: string; kind: string; group?: string }>;
  links: Array<{ source: string; target: string; type: string; weight?: number }>;
}

export interface DependencyTreeModel {
  root: DependencyTreeNode | null;
}

export interface HierarchyViewModel {
  levels: Array<{ depth: number; nodeIds: string[] }>;
}

export interface ForceGraphModel {
  nodes: Array<{ id: string; label: string; strength: number }>;
  links: Array<{ source: string; target: string; distance: number }>;
}

export interface TimelineViewModel {
  events: Array<{ nodeId: string; label: string; timestamp: string; kind: string }>;
}

export interface NetworkGraphModel {
  clusters: Array<{ module: string; nodeIds: string[] }>;
  bridges: Array<{ from: string; to: string; relationship: string }>;
}

export interface VisualizationModels {
  nodeGraph: NodeGraphModel;
  dependencyTree: DependencyTreeModel;
  hierarchyView: HierarchyViewModel;
  forceGraph: ForceGraphModel;
  timelineView: TimelineViewModel;
  networkGraph: NetworkGraphModel;
}

export class KnowledgeQueries {
  constructor(private config: KnowledgeConfiguration) {}

  setConfiguration(config: KnowledgeConfiguration): void {
    this.config = config;
  }

  query(graph: KnowledgeGraph, query: KnowledgeQuery): KnowledgeQueryResult {
    const started = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const limit = query.limit ?? this.config.queryLimit;
      let nodes: KnowledgeNode[] = [];
      let edges: KnowledgeEdge[] = [];
      let paths: string[][] = [];

      switch (query.kind) {
        case "FIND_DEPENDENCIES": {
          if (!query.nodeId) {
            errors.push("nodeId required for FIND_DEPENDENCIES");
            break;
          }
          edges = graph
            .getOutgoing(query.nodeId)
            .filter((e) =>
              ["DEPENDS_ON", "USES", "CONSUMES", "REFERENCES"].includes(
                String(e.relationship)
              )
            )
            .slice(0, limit);
          nodes = edges
            .map((e) => graph.getNode(e.toNodeId))
            .filter((n): n is KnowledgeNode => Boolean(n));
          break;
        }
        case "FIND_DEPENDENTS": {
          if (!query.nodeId) {
            errors.push("nodeId required for FIND_DEPENDENTS");
            break;
          }
          edges = graph
            .getIncoming(query.nodeId)
            .filter((e) =>
              ["DEPENDS_ON", "USES", "CONSUMES", "REFERENCES"].includes(
                String(e.relationship)
              )
            )
            .slice(0, limit);
          nodes = edges
            .map((e) => graph.getNode(e.fromNodeId))
            .filter((n): n is KnowledgeNode => Boolean(n));
          break;
        }
        case "FIND_CRITICAL_PATHS": {
          paths = findCriticalPaths(graph, this.config.graphDepth).slice(
            0,
            limit
          );
          const ids = new Set(paths.flat());
          nodes = graph.listNodes().filter((n) => ids.has(n.nodeId));
          edges = graph
            .listEdges()
            .filter(
              (e) => ids.has(e.fromNodeId) && ids.has(e.toNodeId)
            )
            .slice(0, limit);
          break;
        }
        case "FIND_RELATED_RULES": {
          nodes = relatedByKind(graph, query.nodeId, "RULE", limit);
          edges = edgesTouching(graph, nodes.map((n) => n.nodeId)).slice(
            0,
            limit
          );
          break;
        }
        case "FIND_RELATED_MODULES": {
          nodes = relatedByKind(graph, query.nodeId, "MODULE", limit).concat(
            relatedByKind(graph, query.nodeId, "ENGINE", limit)
          );
          edges = edgesTouching(graph, nodes.map((n) => n.nodeId)).slice(
            0,
            limit
          );
          break;
        }
        case "FIND_POLICY_COVERAGE": {
          nodes = graph
            .listNodes()
            .filter((n) => n.kind === "POLICY")
            .slice(0, limit);
          edges = graph
            .listEdges()
            .filter(
              (e) =>
                nodes.some((n) => n.nodeId === e.fromNodeId) ||
                nodes.some((n) => n.nodeId === e.toNodeId)
            )
            .slice(0, limit);
          break;
        }
        case "FIND_EVENT_CHAINS": {
          edges = graph
            .listEdges()
            .filter((e) =>
              ["TRIGGERS", "PRODUCES", "CONSUMES"].includes(
                String(e.relationship)
              )
            )
            .slice(0, limit);
          const ids = new Set(
            edges.flatMap((e) => [e.fromNodeId, e.toNodeId])
          );
          nodes = graph.listNodes().filter((n) => ids.has(n.nodeId));
          paths = edges.map((e) => [e.fromNodeId, e.toNodeId]);
          break;
        }
        case "FIND_METRIC_SOURCES": {
          nodes = graph
            .listNodes()
            .filter((n) =>
              ["METRIC", "TRUST_SCORE", "COMPLIANCE_SCORE"].includes(
                String(n.kind)
              )
            )
            .slice(0, limit);
          edges = graph
            .listEdges()
            .filter(
              (e) =>
                e.relationship === "PRODUCES" ||
                e.relationship === "OBSERVES" ||
                e.relationship === "REPORTS"
            )
            .filter(
              (e) =>
                nodes.some((n) => n.nodeId === e.toNodeId) ||
                nodes.some((n) => n.nodeId === e.fromNodeId)
            )
            .slice(0, limit);
          break;
        }
        case "CUSTOM": {
          const allEdges = graph.listEdges();
          const matched: KnowledgeEdge[] = [];
          for (const edge of allEdges) {
            const from = graph.getNode(edge.fromNodeId);
            if (!from) continue;
            if (query.customPredicate && !query.customPredicate(from, edge)) {
              continue;
            }
            if (query.relationship && edge.relationship !== query.relationship) {
              continue;
            }
            matched.push(edge);
          }
          edges = matched.slice(0, limit);
          const ids = new Set(
            edges.flatMap((e) => [e.fromNodeId, e.toNodeId])
          );
          nodes = graph.listNodes().filter((n) => ids.has(n.nodeId));
          break;
        }
      }

      const success = errors.length === 0;
      graph.recordQuery(success);
      return {
        kind: query.kind,
        nodes,
        edges,
        paths,
        warnings,
        errors,
        executionTimeMs: Date.now() - started,
      };
    } catch (err) {
      graph.recordQuery(false);
      errors.push(`Query failed: ${String(err)}`);
      return {
        kind: query.kind,
        nodes: [],
        edges: [],
        paths: [],
        warnings,
        errors,
        executionTimeMs: Date.now() - started,
      };
    }
  }

  buildVisualizationModels(
    graph: KnowledgeGraph,
    dependencyTree: DependencyTreeNode | null = null
  ): VisualizationModels {
    const nodes = graph.listNodes();
    const edges = graph.listEdges();

    const nodeGraph: NodeGraphModel = {
      nodes: nodes.map((n) => ({
        id: n.nodeId,
        label: n.label,
        kind: String(n.kind),
        group: n.module,
      })),
      links: edges.map((e) => ({
        source: e.fromNodeId,
        target: e.toNodeId,
        type: String(e.relationship),
        weight: e.weight ?? e.confidence,
      })),
    };

    const depthMap = new Map<string, number>();
    for (const n of nodes) depthMap.set(n.nodeId, 0);
    for (const e of edges) {
      const from = depthMap.get(e.fromNodeId) ?? 0;
      depthMap.set(e.toNodeId, Math.max(depthMap.get(e.toNodeId) ?? 0, from + 1));
    }
    const levelBuckets = new Map<number, string[]>();
    for (const [id, depth] of depthMap) {
      const list = levelBuckets.get(depth) ?? [];
      list.push(id);
      levelBuckets.set(depth, list);
    }

    const hierarchyView: HierarchyViewModel = {
      levels: [...levelBuckets.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([depth, nodeIds]) => ({ depth, nodeIds })),
    };

    const forceGraph: ForceGraphModel = {
      nodes: nodes.map((n) => ({
        id: n.nodeId,
        label: n.label,
        strength: (n.healthScore ?? 50) / 100,
      })),
      links: edges.map((e) => ({
        source: e.fromNodeId,
        target: e.toNodeId,
        distance: 1 / Math.max(0.1, e.confidence),
      })),
    };

    const timelineView: TimelineViewModel = {
      events: nodes
        .filter((n) => n.kind === "EVENT" || n.kind === "SNAPSHOT" || n.kind === "REPORT")
        .map((n) => ({
          nodeId: n.nodeId,
          label: n.label,
          timestamp: n.createdAt,
          kind: String(n.kind),
        }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    };

    const byModule = new Map<string, string[]>();
    for (const n of nodes) {
      const mod = n.module ?? "unknown";
      const list = byModule.get(mod) ?? [];
      list.push(n.nodeId);
      byModule.set(mod, list);
    }

    const networkGraph: NetworkGraphModel = {
      clusters: [...byModule.entries()].map(([module, nodeIds]) => ({
        module,
        nodeIds,
      })),
      bridges: edges
        .filter((e) => {
          const a = graph.getNode(e.fromNodeId)?.module;
          const b = graph.getNode(e.toNodeId)?.module;
          return a && b && a !== b;
        })
        .map((e) => ({
          from: e.fromNodeId,
          to: e.toNodeId,
          relationship: String(e.relationship),
        })),
    };

    return {
      nodeGraph,
      dependencyTree: { root: dependencyTree },
      hierarchyView,
      forceGraph,
      timelineView,
      networkGraph,
    };
  }
}

function relatedByKind(
  graph: KnowledgeGraph,
  nodeId: string | undefined,
  kind: KnowledgeNodeKind,
  limit: number
): KnowledgeNode[] {
  if (!nodeId) {
    return graph.listNodes().filter((n) => n.kind === kind).slice(0, limit);
  }
  const relatedIds = new Set<string>();
  for (const e of [...graph.getOutgoing(nodeId), ...graph.getIncoming(nodeId)]) {
    relatedIds.add(e.fromNodeId === nodeId ? e.toNodeId : e.fromNodeId);
  }
  return graph
    .listNodes()
    .filter((n) => n.kind === kind && (relatedIds.has(n.nodeId) || n.nodeId === nodeId))
    .slice(0, limit);
}

function edgesTouching(graph: KnowledgeGraph, nodeIds: string[]): KnowledgeEdge[] {
  const set = new Set(nodeIds);
  return graph
    .listEdges()
    .filter((e) => set.has(e.fromNodeId) || set.has(e.toNodeId));
}

function findCriticalPaths(
  graph: KnowledgeGraph,
  maxDepth: number
): string[][] {
  const engines = graph
    .listNodes()
    .filter((n) => n.kind === "ENGINE" || n.kind === "PIPELINE");
  const paths: string[][] = [];
  for (const engine of engines) {
    const stack: Array<{ id: string; path: string[] }> = [
      { id: engine.nodeId, path: [engine.nodeId] },
    ];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (cur.path.length > maxDepth) {
        paths.push(cur.path);
        continue;
      }
      const outs = graph.getOutgoing(cur.id);
      if (outs.length === 0 && cur.path.length > 1) {
        paths.push(cur.path);
        continue;
      }
      for (const e of outs) {
        if (cur.path.includes(e.toNodeId)) continue;
        stack.push({ id: e.toNodeId, path: [...cur.path, e.toNodeId] });
      }
    }
  }
  return paths.sort((a, b) => b.length - a.length);
}
