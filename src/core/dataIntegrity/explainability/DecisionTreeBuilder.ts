/**
 * Decision tree builder — graphs for execution, dependencies, confidence, failures.
 */

import type { DecisionTrace } from "./DecisionTraceEngine";
import type { ConfidenceBreakdown } from "./ConfidenceBreakdownEngine";

export type DecisionTreeKind =
  | "decision_graph"
  | "execution_tree"
  | "rule_dependency_tree"
  | "confidence_tree"
  | "failure_tree"
  | "trace_visualization";

export interface DecisionTreeNode {
  id: string;
  label: string;
  kind: string;
  confidence?: number;
  status?: string;
  children: string[];
}

export interface DecisionTreeModel {
  kind: DecisionTreeKind;
  rootId: string;
  nodes: DecisionTreeNode[];
  edges: Array<{ from: string; to: string; label?: string }>;
}

export class DecisionTreeBuilder {
  build(input: {
    trace: DecisionTrace;
    confidence?: ConfidenceBreakdown;
    kind?: DecisionTreeKind;
  }): DecisionTreeModel {
    const kind = input.kind ?? "decision_graph";
    try {
      switch (kind) {
        case "execution_tree":
          return buildExecutionTree(input.trace);
        case "rule_dependency_tree":
          return buildDependencyTree(input.trace);
        case "confidence_tree":
          return buildConfidenceTree(input.trace, input.confidence);
        case "failure_tree":
          return buildFailureTree(input.trace);
        case "trace_visualization":
          return buildTraceVisualization(input.trace);
        case "decision_graph":
        default:
          return buildDecisionGraph(input.trace);
      }
    } catch {
      return {
        kind,
        rootId: "root",
        nodes: [{ id: "root", label: "unavailable", kind: "root", children: [] }],
        edges: [],
      };
    }
  }
}

function buildDecisionGraph(trace: DecisionTrace): DecisionTreeModel {
  const rootId = "decision";
  const nodes: DecisionTreeNode[] = [
    {
      id: rootId,
      label: `Decision ${trace.decisionId}`,
      kind: "decision",
      confidence: trace.overallConfidence,
      status: trace.outcome,
      children: trace.flow.slice(0, -1),
    },
  ];
  const edges: DecisionTreeModel["edges"] = [];
  let prev = rootId;
  for (const step of trace.flow) {
    nodes.push({
      id: step,
      label: step,
      kind: "flow",
      children: [],
    });
    edges.push({ from: prev, to: step });
    prev = step;
  }
  return { kind: "decision_graph", rootId, nodes, edges };
}

function buildExecutionTree(trace: DecisionTrace): DecisionTreeModel {
  const rootId = "execution";
  const nodes: DecisionTreeNode[] = [
    {
      id: rootId,
      label: "Execution Path",
      kind: "root",
      children: trace.executionOrder,
    },
  ];
  const edges: DecisionTreeModel["edges"] = [];
  for (const ruleId of trace.executionOrder) {
    const rule =
      trace.executedRules.find((r) => r.ruleId === ruleId) ||
      trace.failedRules.find((r) => r.ruleId === ruleId) ||
      trace.skippedRules.find((r) => r.ruleId === ruleId);
    nodes.push({
      id: ruleId,
      label: rule?.ruleName ?? ruleId,
      kind: "rule",
      status: rule?.status,
      confidence: rule?.confidence,
      children: [],
    });
    edges.push({ from: rootId, to: ruleId, label: String(rule?.order ?? "") });
  }
  return { kind: "execution_tree", rootId, nodes, edges };
}

function buildDependencyTree(trace: DecisionTrace): DecisionTreeModel {
  const rootId = "deps";
  const nodes: DecisionTreeNode[] = [
    { id: rootId, label: "Dependencies", kind: "root", children: [] },
  ];
  const edges: DecisionTreeModel["edges"] = [];
  const all = [
    ...trace.executedRules,
    ...trace.failedRules,
    ...trace.skippedRules,
    ...trace.criticalRules,
  ];
  for (const rule of all) {
    if (!nodes.some((n) => n.id === rule.ruleId)) {
      nodes.push({
        id: rule.ruleId,
        label: rule.ruleName,
        kind: "rule",
        children: [...rule.dependencies],
      });
      edges.push({ from: rootId, to: rule.ruleId });
    }
    for (const dep of rule.dependencies) {
      if (!nodes.some((n) => n.id === dep)) {
        nodes.push({ id: dep, label: dep, kind: "dependency", children: [] });
      }
      edges.push({ from: rule.ruleId, to: dep, label: "depends" });
    }
  }
  nodes[0]!.children = all.map((r) => r.ruleId);
  return { kind: "rule_dependency_tree", rootId, nodes, edges };
}

function buildConfidenceTree(
  trace: DecisionTrace,
  confidence?: ConfidenceBreakdown
): DecisionTreeModel {
  const rootId = "confidence";
  const nodes: DecisionTreeNode[] = [
    {
      id: rootId,
      label: "Confidence",
      kind: "root",
      confidence: confidence?.overallConfidence ?? trace.overallConfidence,
      children: (confidence?.perEngine ?? []).map((e) => `engine:${e.key}`),
    },
  ];
  const edges: DecisionTreeModel["edges"] = [];
  for (const eng of confidence?.perEngine ?? []) {
    const id = `engine:${eng.key}`;
    nodes.push({
      id,
      label: eng.key,
      kind: "engine",
      confidence: eng.confidence,
      children: [],
    });
    edges.push({ from: rootId, to: id });
  }
  return { kind: "confidence_tree", rootId, nodes, edges };
}

function buildFailureTree(trace: DecisionTrace): DecisionTreeModel {
  const rootId = "failures";
  const failures = [...trace.failedRules, ...trace.criticalRules];
  const nodes: DecisionTreeNode[] = [
    {
      id: rootId,
      label: "Failures",
      kind: "root",
      children: failures.map((f) => f.ruleId),
    },
  ];
  const edges: DecisionTreeModel["edges"] = [];
  for (const f of failures) {
    nodes.push({
      id: f.ruleId,
      label: f.ruleName,
      kind: "failure",
      status: f.status,
      confidence: f.confidence,
      children: [],
    });
    edges.push({ from: rootId, to: f.ruleId });
  }
  return { kind: "failure_tree", rootId, nodes, edges };
}

function buildTraceVisualization(trace: DecisionTrace): DecisionTreeModel {
  const exec = buildExecutionTree(trace);
  return {
    kind: "trace_visualization",
    rootId: exec.rootId,
    nodes: exec.nodes,
    edges: [
      ...exec.edges,
      ...trace.timeline.map((t) => ({
        from: exec.rootId,
        to: t.ruleId,
        label: `${t.atMs}ms`,
      })),
    ],
  };
}
