/**
 * Institutional Validation Knowledge Graph — unit tests (Prompt 9F.23).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ValidationKnowledgeGraph,
  registerValidationKnowledgeGraph,
  resetValidationKnowledgeGraph,
  getRegisteredKnowledgeSources,
  resetKnowledgeSourceRegistrationState,
  DEFAULT_KNOWLEDGE_CONFIGURATION,
  createKnowledgeNodeId,
  buildKnowledgeGraph,
  queryGraph,
  analyzeDependencies,
  analyzeImpact,
  findRelationships,
  getKnowledgeMetrics,
  createKnowledgeSnapshot,
  type KnowledgeFactBundle,
} from "./index";

function sampleFacts(): KnowledgeFactBundle[] {
  const orch = createKnowledgeNodeId("ENGINE", "orchestrator");
  const pipeline = createKnowledgeNodeId("PIPELINE", "default");
  const rules = createKnowledgeNodeId("ENGINE", "rule-engine");
  const rule = createKnowledgeNodeId("RULE", "price-range");
  const admin = createKnowledgeNodeId("ENGINE", "admin");
  const policy = createKnowledgeNodeId("POLICY", "baseline");
  const compliance = createKnowledgeNodeId("ENGINE", "compliance");
  const metric = createKnowledgeNodeId("METRIC", "health");
  const event = createKnowledgeNodeId("EVENT", "validation-event");
  const now = new Date().toISOString();

  return [
    {
      sourceId: "orchestrator",
      nodes: [
        {
          nodeId: orch,
          kind: "ENGINE",
          label: "Orchestrator",
          module: "orchestrator",
          healthScore: 95,
          createdAt: now,
        },
        {
          nodeId: pipeline,
          kind: "PIPELINE",
          label: "Default Pipeline",
          module: "orchestrator",
          createdAt: now,
        },
      ],
      edges: [
        {
          fromNodeId: orch,
          toNodeId: pipeline,
          relationship: "USES",
          confidence: 0.95,
          evidence: ["orchestrator uses pipeline"],
        },
        {
          fromNodeId: orch,
          toNodeId: rules,
          relationship: "DEPENDS_ON",
          confidence: 0.9,
          evidence: ["orchestrator depends on rule engine"],
        },
      ],
    },
    {
      sourceId: "ruleEngine",
      nodes: [
        {
          nodeId: rules,
          kind: "ENGINE",
          label: "Rule Engine",
          module: "ruleEngine",
          healthScore: 90,
          createdAt: now,
        },
        {
          nodeId: rule,
          kind: "RULE",
          label: "Price Range",
          module: "ruleEngine",
          createdAt: now,
        },
        {
          nodeId: metric,
          kind: "METRIC",
          label: "Health Metric",
          module: "analytics",
          createdAt: now,
        },
      ],
      edges: [
        {
          fromNodeId: rules,
          toNodeId: rule,
          relationship: "USES",
          confidence: 0.95,
          evidence: ["rule engine uses price-range"],
        },
        {
          fromNodeId: rules,
          toNodeId: metric,
          relationship: "PRODUCES",
          confidence: 0.9,
          evidence: ["produces health metric"],
        },
        {
          fromNodeId: pipeline,
          toNodeId: rules,
          relationship: "DEPENDS_ON",
          confidence: 0.88,
        },
      ],
    },
    {
      sourceId: "admin",
      nodes: [
        {
          nodeId: admin,
          kind: "ENGINE",
          label: "Admin",
          module: "admin",
          createdAt: now,
        },
        {
          nodeId: policy,
          kind: "POLICY",
          label: "Baseline Policy",
          module: "admin",
          createdAt: now,
        },
      ],
      edges: [
        {
          fromNodeId: admin,
          toNodeId: policy,
          relationship: "AUDITS",
          confidence: 0.9,
          evidence: ["admin audits policy"],
        },
        {
          fromNodeId: compliance,
          toNodeId: admin,
          relationship: "DEPENDS_ON",
          confidence: 0.85,
        },
      ],
    },
    {
      sourceId: "compliance",
      nodes: [
        {
          nodeId: compliance,
          kind: "ENGINE",
          label: "Compliance",
          module: "compliance",
          createdAt: now,
        },
        {
          nodeId: event,
          kind: "EVENT",
          label: "Validation Event",
          module: "eventBus",
          createdAt: now,
        },
      ],
      edges: [
        {
          fromNodeId: compliance,
          toNodeId: policy,
          relationship: "REFERENCES",
          confidence: 0.9,
          evidence: ["compliance references policy"],
        },
        {
          fromNodeId: orch,
          toNodeId: event,
          relationship: "TRIGGERS",
          confidence: 0.8,
        },
        {
          fromNodeId: rules,
          toNodeId: orch,
          relationship: "DEPENDS_ON",
          confidence: 0.7,
          evidence: ["circular candidate"],
        },
      ],
    },
  ];
}

describe("Knowledge registration", () => {
  beforeEach(() => {
    resetValidationKnowledgeGraph();
    resetKnowledgeSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationKnowledgeGraph();
    resetKnowledgeSourceRegistrationState();
  });

  it("registers knowledge engine idempotently", () => {
    const first = registerValidationKnowledgeGraph({ force: true });
    expect(first.registered).toBe(true);
    expect(first.sourcesRegistered).toBeGreaterThanOrEqual(10);
    expect(getRegisteredKnowledgeSources().length).toBeGreaterThanOrEqual(10);

    const second = registerValidationKnowledgeGraph();
    expect(second.registered).toBe(false);
    expect(second.skipped).toBe(true);
  });
});

describe("Graph construction and relationships", () => {
  let engine: ValidationKnowledgeGraph;

  beforeEach(() => {
    resetValidationKnowledgeGraph();
    engine = new ValidationKnowledgeGraph({
      graphDepth: 5,
      queryLimit: 50,
      confidenceThreshold: 0.5,
    });
  });

  it("builds knowledge graph with score", () => {
    const build = engine.buildKnowledgeGraph({
      facts: sampleFacts(),
      includeLiveCollectors: false,
    });
    expect(build.nodeCount).toBeGreaterThan(0);
    expect(build.edgeCount).toBeGreaterThan(0);
    expect(build.score.overall).toBeGreaterThanOrEqual(0);
    expect(build.score.overall).toBeLessThanOrEqual(100);
    expect(build.visualizations.nodeGraph.nodes.length).toBeGreaterThan(0);
    expect(DEFAULT_KNOWLEDGE_CONFIGURATION.engineVersion).toBe("9F.23.0");
  });

  it("analyzes relationships and dependencies", () => {
    engine.buildKnowledgeGraph({
      facts: sampleFacts(),
      includeLiveCollectors: false,
    });
    const orch = createKnowledgeNodeId("ENGINE", "orchestrator");
    const rel = engine.findRelationships({ nodeId: orch });
    expect(rel.relationships.length).toBeGreaterThan(0);

    const deps = engine.analyzeDependencies(orch);
    expect(deps.directDependencies.length).toBeGreaterThan(0);
    expect(deps.dependencyTree).not.toBeNull();
  });

  it("analyzes impact and runs queries", () => {
    engine.buildKnowledgeGraph({
      facts: sampleFacts(),
      includeLiveCollectors: false,
    });
    const rules = createKnowledgeNodeId("ENGINE", "rule-engine");
    const impact = engine.analyzeImpact(rules, "CROSS_MODULE");
    expect(impact.confidence).toBeGreaterThanOrEqual(0);
    expect(impact.impactedNodes.length).toBeGreaterThan(0);

    const q = engine.queryGraph({
      kind: "FIND_RELATED_RULES",
      nodeId: rules,
    });
    expect(q.errors.length).toBe(0);
    expect(q.nodes.some((n) => n.kind === "RULE")).toBe(true);

    const metrics = engine.queryGraph({ kind: "FIND_METRIC_SOURCES" });
    expect(metrics.nodes.length).toBeGreaterThan(0);
  });
});

describe("Snapshots, metrics, regression", () => {
  let engine: ValidationKnowledgeGraph;

  beforeEach(() => {
    resetValidationKnowledgeGraph();
    engine = new ValidationKnowledgeGraph({
      graphDepth: 5,
      queryLimit: 50,
    });
  });

  it("creates snapshots and detects regressions", () => {
    engine.buildKnowledgeGraph({
      facts: sampleFacts(),
      includeLiveCollectors: false,
    });
    const snap1 = engine.createKnowledgeSnapshot("baseline");

    engine.buildKnowledgeGraph({
      facts: [
        {
          sourceId: "orchestrator",
          nodes: [
            {
              nodeId: createKnowledgeNodeId("ENGINE", "lonely"),
              kind: "ENGINE",
              label: "Lonely",
              module: "x",
              createdAt: new Date().toISOString(),
            },
          ],
          edges: [],
        },
      ],
      includeLiveCollectors: false,
    });
    const snap2 = engine.createKnowledgeSnapshot("degraded");

    const comparison = engine.compareKnowledgeSnapshots(
      snap1.snapshotId,
      snap2.snapshotId
    );
    expect(comparison).not.toBeNull();
    expect(comparison!.regressionDetected).toBe(true);
    expect(engine.listSnapshots().length).toBe(2);
  });

  it("tracks metrics and audit log", () => {
    engine.buildKnowledgeGraph({
      facts: sampleFacts(),
      includeLiveCollectors: false,
    });
    engine.queryGraph({ kind: "FIND_CRITICAL_PATHS" });
    const metrics = engine.getKnowledgeMetrics();
    expect(metrics.nodes).toBeGreaterThan(0);
    expect(metrics.queries).toBeGreaterThan(0);
    expect(engine.getAuditLog().length).toBeGreaterThan(0);
  });
});

describe("Public API", () => {
  beforeEach(() => {
    resetValidationKnowledgeGraph();
    resetKnowledgeSourceRegistrationState();
  });

  afterEach(() => {
    resetValidationKnowledgeGraph();
    resetKnowledgeSourceRegistrationState();
  });

  it("exposes knowledge helpers", () => {
    const engine = new ValidationKnowledgeGraph({
      graphDepth: 5,
      queryLimit: 50,
    });
    registerValidationKnowledgeGraph({ engine, force: true });

    const facts = sampleFacts();
    const build = buildKnowledgeGraph({ facts, includeLiveCollectors: false });
    expect(build.nodeCount).toBeGreaterThan(0);

    const orch = createKnowledgeNodeId("ENGINE", "orchestrator");
    expect(analyzeDependencies(orch).directDependencies.length).toBeGreaterThan(
      0
    );
    expect(analyzeImpact(orch).confidence).toBeGreaterThanOrEqual(0);
    expect(findRelationships({ nodeId: orch }).relationships.length).toBeGreaterThan(
      0
    );
    expect(queryGraph({ kind: "FIND_POLICY_COVERAGE" }).nodes.length).toBeGreaterThan(
      0
    );
    expect(getKnowledgeMetrics().nodes).toBeGreaterThan(0);
    expect(createKnowledgeSnapshot("api").snapshotId).toContain("know:");
  });
});
