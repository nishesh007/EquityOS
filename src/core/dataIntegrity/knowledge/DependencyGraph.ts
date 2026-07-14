/**
 * Dependency graph analysis — direct, indirect, circular, unused, depth, health.
 */

import type { KnowledgeConfiguration } from "./KnowledgeConfiguration";
import type { KnowledgeGraph } from "./KnowledgeGraph";
import type { KnowledgeNode } from "./KnowledgeNode";
import type { KnowledgeEdge } from "./KnowledgeEdge";

export interface DependencyTreeNode {
  nodeId: string;
  label: string;
  depth: number;
  children: DependencyTreeNode[];
}

export interface DependencyAnalysisResult {
  nodeId: string;
  directDependencies: string[];
  indirectDependencies: string[];
  dependents: string[];
  circularDependencies: string[][];
  unusedDependencies: string[];
  dependencyDepth: number;
  dependencyTree: DependencyTreeNode | null;
  dependencyHealth: number;
  warnings: string[];
  errors: string[];
}

const DEPENDENCY_RELATIONSHIPS = new Set([
  "DEPENDS_ON",
  "USES",
  "CONSUMES",
  "REFERENCES",
]);

export class DependencyGraph {
  constructor(private config: KnowledgeConfiguration) {}

  setConfiguration(config: KnowledgeConfiguration): void {
    this.config = config;
  }

  analyze(graph: KnowledgeGraph, nodeId: string): DependencyAnalysisResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const node = graph.getNode(nodeId);
      if (!node) {
        return emptyResult(nodeId, [`Node not found: ${nodeId}`]);
      }

      const depEdges = graph
        .listEdges()
        .filter((e) => DEPENDENCY_RELATIONSHIPS.has(String(e.relationship)));

      const direct = unique(
        depEdges.filter((e) => e.fromNodeId === nodeId).map((e) => e.toNodeId)
      );

      const { indirect, depth, circular } = walkDependencies(
        nodeId,
        depEdges,
        this.config.graphDepth
      );

      const dependents = unique(
        depEdges.filter((e) => e.toNodeId === nodeId).map((e) => e.fromNodeId)
      );

      const allReferenced = new Set(
        depEdges.flatMap((e) => [e.fromNodeId, e.toNodeId])
      );
      const unusedDependencies = graph
        .listNodes()
        .filter(
          (n) =>
            n.kind === "MODULE" ||
            n.kind === "ENGINE" ||
            n.kind === "RULE"
        )
        .map((n) => n.nodeId)
        .filter((id) => !allReferenced.has(id) && id !== nodeId);

      const tree = buildTree(node, depEdges, this.config.graphDepth);
      const health = computeDependencyHealth(graph, direct, circular);

      if (circular.length > 0) {
        warnings.push(
          `Detected ${circular.length} circular dependency path(s).`
        );
      }

      return {
        nodeId,
        directDependencies: direct,
        indirectDependencies: indirect.filter((id) => !direct.includes(id)),
        dependents,
        circularDependencies: circular,
        unusedDependencies: unusedDependencies.slice(0, this.config.queryLimit),
        dependencyDepth: depth,
        dependencyTree: tree,
        dependencyHealth: health,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`Dependency analysis failed: ${String(err)}`);
      return emptyResult(nodeId, errors);
    }
  }
}

function walkDependencies(
  startId: string,
  edges: KnowledgeEdge[],
  maxDepth: number
): { indirect: string[]; depth: number; circular: string[][] } {
  const indirect: string[] = [];
  const circular: string[][] = [];
  let maxReached = 0;

  const stack: Array<{ id: string; path: string[]; depth: number }> = [
    { id: startId, path: [startId], depth: 0 },
  ];
  const visitedGlobal = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current.depth >= maxDepth) continue;
    const outs = edges.filter((e) => e.fromNodeId === current.id);
    for (const edge of outs) {
      const next = edge.toNodeId;
      if (current.path.includes(next)) {
        circular.push([...current.path, next]);
        continue;
      }
      const nextDepth = current.depth + 1;
      maxReached = Math.max(maxReached, nextDepth);
      if (next !== startId) indirect.push(next);
      if (!visitedGlobal.has(`${current.id}->${next}`)) {
        visitedGlobal.add(`${current.id}->${next}`);
        stack.push({
          id: next,
          path: [...current.path, next],
          depth: nextDepth,
        });
      }
    }
  }

  return { indirect: unique(indirect), depth: maxReached, circular };
}

function buildTree(
  root: KnowledgeNode,
  edges: KnowledgeEdge[],
  maxDepth: number
): DependencyTreeNode {
  const build = (
    nodeId: string,
    label: string,
    depth: number,
    path: Set<string>
  ): DependencyTreeNode => {
    const children: DependencyTreeNode[] = [];
    if (depth < maxDepth && !path.has(nodeId)) {
      const nextPath = new Set(path);
      nextPath.add(nodeId);
      for (const edge of edges.filter((e) => e.fromNodeId === nodeId)) {
        children.push(
          build(edge.toNodeId, edge.toNodeId, depth + 1, nextPath)
        );
      }
    }
    return { nodeId, label, depth, children };
  };
  return build(root.nodeId, root.label, 0, new Set());
}

function computeDependencyHealth(
  graph: KnowledgeGraph,
  direct: string[],
  circular: string[][]
): number {
  if (direct.length === 0) return 100;
  let sum = 0;
  for (const id of direct) {
    const n = graph.getNode(id);
    sum += n?.healthScore ?? 70;
  }
  const base = sum / direct.length;
  const penalty = Math.min(40, circular.length * 10);
  return round2(Math.max(0, Math.min(100, base - penalty)));
}

function emptyResult(
  nodeId: string,
  errors: string[]
): DependencyAnalysisResult {
  return {
    nodeId,
    directDependencies: [],
    indirectDependencies: [],
    dependents: [],
    circularDependencies: [],
    unusedDependencies: [],
    dependencyDepth: 0,
    dependencyTree: null,
    dependencyHealth: 0,
    warnings: [],
    errors,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
