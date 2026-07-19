/**
 * Institutional Validation Knowledge Graph & Dependency Intelligence Engine — façade (Prompt 9F.23).
 * Completely read-only: never influences validation execution.
 */

import {
  DEFAULT_KNOWLEDGE_CONFIGURATION,
  resolveKnowledgeConfiguration,
  type KnowledgeConfiguration,
  type KnowledgeConfigurationInput,
} from "./KnowledgeConfiguration";
import {
  areBuiltinKnowledgeSourcesRegistered,
  collectAllKnowledgeFacts,
  getRegisteredKnowledgeSources,
  markBuiltinKnowledgeSourcesRegistered,
  registerKnowledgeSource,
  resetKnowledgeSourceRegistrationState,
  type KnowledgeFactBundle,
  type KnowledgeSourceDefinition,
} from "./KnowledgeRegistry";
import {
  KnowledgeGraph,
  type KnowledgeScoreBreakdown,
} from "./KnowledgeGraph";
import {
  createKnowledgeNodeId,
  type KnowledgeNode,
} from "./KnowledgeNode";
import { DependencyGraph } from "./DependencyGraph";
import { RelationshipAnalyzer } from "./RelationshipAnalyzer";
import {
  ImpactAnalyzer,
  type ImpactAnalysisResult,
  type ImpactScope,
} from "./ImpactAnalyzer";
import {
  KnowledgeQueries,
  type KnowledgeQuery,
  type KnowledgeQueryResult,
  type VisualizationModels,
} from "./KnowledgeQueries";
import { KnowledgeMetricsTracker } from "./KnowledgeMetrics";
import { KnowledgeAuditLogger } from "./KnowledgeAuditLogger";
import {
  KnowledgeSnapshotStore,
  buildKnowledgeSnapshotPayload,
  compareKnowledgeSnapshots,
  type KnowledgeSnapshot,
  type KnowledgeSnapshotComparison,
} from "./KnowledgeSnapshot";
import { safePublishEvent } from "../events/ValidationEventBus";

export interface BuildKnowledgeGraphOptions {
  facts?: KnowledgeFactBundle[];
  includeLiveCollectors?: boolean;
  clearExisting?: boolean;
}

export interface KnowledgeBuildResult {
  buildId: string;
  builtAt: string;
  nodeCount: number;
  edgeCount: number;
  score: KnowledgeScoreBreakdown;
  visualizations: VisualizationModels;
  warnings: string[];
  errors: string[];
}

let defaultEngine: ValidationKnowledgeGraph | null = null;
let engineRegistered = false;

const EXPECTED_KINDS = [
  "ENGINE",
  "RULE",
  "PIPELINE",
  "MODULE",
  "POLICY",
  "CONFIGURATION",
  "METRIC",
  "EVENT",
  "RECOMMENDATION",
  "SNAPSHOT",
  "REPORT",
  "TRUST_SCORE",
  "COMPLIANCE_SCORE",
  "OPTIMIZATION_RESULT",
];

export class ValidationKnowledgeGraph {
  private config: KnowledgeConfiguration;
  private graph: KnowledgeGraph;
  private dependencyGraph: DependencyGraph;
  private relationshipAnalyzer: RelationshipAnalyzer;
  private impactAnalyzer: ImpactAnalyzer;
  private queries: KnowledgeQueries;
  private readonly metrics = new KnowledgeMetricsTracker();
  private audit: KnowledgeAuditLogger;
  private snapshots: KnowledgeSnapshotStore;
  private lastBuild: KnowledgeBuildResult | null = null;
  private lastDependencyDepth = 0;

  constructor(configInput?: KnowledgeConfigurationInput) {
    this.config = resolveKnowledgeConfiguration(configInput);
    this.graph = new KnowledgeGraph(this.config);
    this.dependencyGraph = new DependencyGraph(this.config);
    this.relationshipAnalyzer = new RelationshipAnalyzer(this.config);
    this.impactAnalyzer = new ImpactAnalyzer(this.config);
    this.queries = new KnowledgeQueries(this.config);
    this.audit = new KnowledgeAuditLogger(this.config.maxAuditEntries);
    this.snapshots = new KnowledgeSnapshotStore(this.config.snapshotRetention);
  }

  getConfiguration(): KnowledgeConfiguration {
    return resolveKnowledgeConfiguration(this.config);
  }

  updateConfiguration(input: KnowledgeConfigurationInput): void {
    this.config = resolveKnowledgeConfiguration({
      ...this.config,
      ...input,
      relationshipTypes: input.relationshipTypes ?? this.config.relationshipTypes,
      scoreWeights: {
        ...this.config.scoreWeights,
        ...input.scoreWeights,
      },
    });
    this.graph.setConfiguration(this.config);
    this.dependencyGraph.setConfiguration(this.config);
    this.relationshipAnalyzer.setConfiguration(this.config);
    this.impactAnalyzer.setConfiguration(this.config);
    this.queries.setConfiguration(this.config);
    this.audit.setMaxEntries(this.config.maxAuditEntries);
    this.snapshots.setRetention(this.config.snapshotRetention);
  }

  registerSource(
    definition: KnowledgeSourceDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    return registerKnowledgeSource(definition, options);
  }

  buildKnowledgeGraph(
    options: BuildKnowledgeGraphOptions = {}
  ): KnowledgeBuildResult {
    const started = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      if (options.clearExisting !== false) {
        this.graph.clear();
      }

      const facts = this.resolveFacts(options);
      const ingest = this.graph.ingestBundles(facts);
      warnings.push(...ingest.warnings);

      const score = this.graph.computeScore(EXPECTED_KINDS);
      const stats = this.graph.stats();
      const visualizations = this.queries.buildVisualizationModels(this.graph);

      const executionTimeMs = Date.now() - started;
      this.metrics.recordBuild({
        nodes: stats.nodeCount,
        edges: stats.edgeCount,
        relationships: stats.relationshipTypes.length,
        knowledgeScore: score.overall,
      });
      this.metrics.setSnapshotCount(this.snapshots.size);

      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "GraphBuild",
        knowledgeScore: score.overall,
        scoreBreakdown: score,
        nodeCount: stats.nodeCount,
        edgeCount: stats.edgeCount,
        executionTimeMs,
        warnings,
        errors,
        engineVersion: this.config.engineVersion,
      });

      safePublishEvent({
        eventType: "WarningRaised",
        module: "knowledge",
        source: "knowledge-graph",
        severity: "INFO",
        payload: {
          nodeCount: stats.nodeCount,
          edgeCount: stats.edgeCount,
          knowledgeScore: score.overall,
          readOnly: true,
        },
        executionTimeMs,
      });

      const result: KnowledgeBuildResult = {
        buildId: `kgb:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        builtAt: new Date().toISOString(),
        nodeCount: stats.nodeCount,
        edgeCount: stats.edgeCount,
        score,
        visualizations,
        warnings,
        errors,
      };
      this.lastBuild = result;
      return result;
    } catch (err) {
      errors.push(`buildKnowledgeGraph failed: ${String(err)}`);
      const score: KnowledgeScoreBreakdown = {
        relationshipCoverage: 0,
        dependencyAccuracy: 0,
        impactAccuracy: 0,
        graphCompleteness: 0,
        queryReliability: 0,
        evidenceQuality: 0,
        overall: 0,
      };
      const result: KnowledgeBuildResult = {
        buildId: `kgb:error:${Math.random().toString(36).slice(2, 8)}`,
        builtAt: new Date().toISOString(),
        nodeCount: 0,
        edgeCount: 0,
        score,
        visualizations: this.queries.buildVisualizationModels(this.graph),
        warnings,
        errors,
      };
      this.lastBuild = result;
      return result;
    }
  }

  queryGraph(query: KnowledgeQuery): KnowledgeQueryResult {
    try {
      const result = this.queries.query(this.graph, query);
      this.metrics.recordQuery(result.executionTimeMs);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "Query",
        queryKind: query.kind,
        nodeCount: result.nodes.length,
        edgeCount: result.edges.length,
        executionTimeMs: result.executionTimeMs,
        warnings: result.warnings,
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });
      return result;
    } catch (err) {
      this.graph.recordQuery(false);
      return {
        kind: query.kind,
        nodes: [],
        edges: [],
        paths: [],
        warnings: [],
        errors: [`queryGraph failed: ${String(err)}`],
        executionTimeMs: 0,
      };
    }
  }

  analyzeDependencies(nodeId: string) {
    try {
      const result = this.dependencyGraph.analyze(this.graph, nodeId);
      this.lastDependencyDepth = Math.max(
        this.lastDependencyDepth,
        result.dependencyDepth
      );
      this.metrics.recordDependencyDepth(result.dependencyDepth);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "DependencyAnalysis",
        nodeCount: result.directDependencies.length,
        executionTimeMs: 0,
        warnings: result.warnings,
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });
      return result;
    } catch (err) {
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
        errors: [`analyzeDependencies failed: ${String(err)}`],
      };
    }
  }

  analyzeImpact(
    sourceNodeId: string,
    scope: ImpactScope = "CROSS_MODULE"
  ): ImpactAnalysisResult {
    const started = Date.now();
    try {
      const result = this.impactAnalyzer.analyze(
        this.graph,
        sourceNodeId,
        scope
      );
      this.metrics.recordImpactAnalysis();
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "ImpactAnalysis",
        nodeCount: result.impactedNodes.length,
        executionTimeMs: Date.now() - started,
        warnings: result.warnings,
        errors: result.errors,
        engineVersion: this.config.engineVersion,
      });
      return result;
    } catch (err) {
      return {
        sourceNodeId,
        scope,
        impactedNodes: [],
        crossModuleImpact: [],
        confidence: 0,
        warnings: [],
        errors: [`analyzeImpact failed: ${String(err)}`],
      };
    }
  }

  findRelationships(options?: {
    nodeId?: string;
    relationship?: KnowledgeConfiguration["relationshipTypes"][number];
  }) {
    return this.relationshipAnalyzer.analyze(this.graph, options);
  }

  getKnowledgeMetrics() {
    return this.metrics.getMetrics();
  }

  getKnowledgeScore(): KnowledgeScoreBreakdown {
    return (
      this.lastBuild?.score ??
      this.graph.computeScore(EXPECTED_KINDS)
    );
  }

  getVisualizationModels(nodeId?: string): VisualizationModels {
    const tree = nodeId
      ? this.dependencyGraph.analyze(this.graph, nodeId).dependencyTree
      : null;
    return this.queries.buildVisualizationModels(this.graph, tree);
  }

  createKnowledgeSnapshot(label?: string): KnowledgeSnapshot {
    const started = Date.now();
    try {
      if (!this.lastBuild) {
        this.buildKnowledgeGraph({ includeLiveCollectors: false, facts: [] });
      }
      const stats = this.graph.stats();
      const score = this.getKnowledgeScore();
      const payload = buildKnowledgeSnapshotPayload({
        score,
        nodeCount: stats.nodeCount,
        edgeCount: stats.edgeCount,
        relationshipCount: stats.relationshipTypes.length,
        dependencyDepth: this.lastDependencyDepth,
        impactAnalyses: this.metrics.getMetrics().impactAnalyses,
        configurationVersion: this.config.engineVersion,
      });
      const snapshot = this.snapshots.save(payload, label);
      this.metrics.setSnapshotCount(this.snapshots.size);
      this.audit.append({
        timestamp: new Date().toISOString(),
        event: "SnapshotCreated",
        knowledgeScore: score.overall,
        scoreBreakdown: score,
        nodeCount: stats.nodeCount,
        edgeCount: stats.edgeCount,
        executionTimeMs: Date.now() - started,
        warnings: [],
        errors: [],
        engineVersion: this.config.engineVersion,
      });
      return snapshot;
    } catch {
      return this.snapshots.save(
        buildKnowledgeSnapshotPayload({
          score: {
            relationshipCoverage: 0,
            dependencyAccuracy: 0,
            impactAccuracy: 0,
            graphCompleteness: 0,
            queryReliability: 0,
            evidenceQuality: 0,
            overall: 0,
          },
          nodeCount: 0,
          edgeCount: 0,
          relationshipCount: 0,
          dependencyDepth: 0,
          impactAnalyses: 0,
          configurationVersion: this.config.engineVersion,
        }),
        label ?? "error"
      );
    }
  }

  compareKnowledgeSnapshots(
    baselineId: string,
    compareId: string
  ): KnowledgeSnapshotComparison | null {
    const a = this.snapshots.load(baselineId);
    const b = this.snapshots.load(compareId);
    if (!a || !b) return null;
    return compareKnowledgeSnapshots(a, b);
  }

  listSnapshots(): KnowledgeSnapshot[] {
    return this.snapshots.list();
  }

  getAuditLog(limit?: number) {
    return this.audit.getLog(limit);
  }

  listNodes(): KnowledgeNode[] {
    return this.graph.listNodes();
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.audit.reset();
    this.snapshots.clear();
    this.graph.clear();
    this.lastBuild = null;
    this.lastDependencyDepth = 0;
  }

  private resolveFacts(
    options: BuildKnowledgeGraphOptions
  ): KnowledgeFactBundle[] {
    if (options.facts) return options.facts;
    if (options.includeLiveCollectors === false) return [];
    return collectAllKnowledgeFacts();
  }
}

function node(
  kind: KnowledgeNode["kind"],
  key: string,
  label: string,
  module: string,
  extras?: Partial<KnowledgeNode>
): KnowledgeNode {
  return {
    nodeId: createKnowledgeNodeId(kind, key),
    kind,
    label,
    module,
    createdAt: new Date().toISOString(),
    healthScore: 100,
    ...extras,
  };
}

function edge(
  from: string,
  to: string,
  relationship: string,
  confidence = 0.9,
  evidence?: string[]
) {
  return {
    fromNodeId: from,
    toNodeId: to,
    relationship: relationship as KnowledgeFactBundle["edges"][number]["relationship"],
    confidence,
    evidence,
  };
}

function safeCollect(
  sourceId: string,
  collect: () => KnowledgeFactBundle
): KnowledgeFactBundle {
  try {
    return collect();
  } catch {
    return {
      sourceId: sourceId as KnowledgeFactBundle["sourceId"],
      nodes: [
        node("ENGINE", sourceId, sourceId, sourceId, {
          metadata: { unavailable: true },
          healthScore: 0,
        }),
      ],
      edges: [],
    };
  }
}

export function buildBuiltinKnowledgeSources(): KnowledgeSourceDefinition[] {
  return [
    {
      id: "orchestrator",
      name: "Validation Orchestrator",
      collect: () =>
        safeCollect("orchestrator", () => {
          const orchestrator = node("ENGINE", "orchestrator", "Orchestrator", "orchestrator");
          const pipeline = node("PIPELINE", "default", "Default Pipeline", "orchestrator");
          return {
            sourceId: "orchestrator",
            nodes: [orchestrator, pipeline],
            edges: [
              edge(orchestrator.nodeId, pipeline.nodeId, "USES", 0.95, [
                "orchestrator uses default pipeline",
              ]),
            ],
          };
        }),
    },
    {
      id: "ruleEngine",
      name: "Rule Engine",
      collect: () =>
        safeCollect("ruleEngine", () => {
          const engine = node("ENGINE", "rule-engine", "Rule Engine", "ruleEngine");
          const rule = node("RULE", "aggregate", "Aggregate Rules", "ruleEngine");
          const metric = node("METRIC", "rule-runtime", "Rule Runtime Metric", "ruleEngine");
          return {
            sourceId: "ruleEngine",
            nodes: [engine, rule, metric],
            edges: [
              edge(engine.nodeId, rule.nodeId, "USES", 0.95, ["engine executes rules"]),
              edge(engine.nodeId, metric.nodeId, "PRODUCES", 0.9, [
                "engine produces runtime metrics",
              ]),
            ],
          };
        }),
    },
    {
      id: "admin",
      name: "Administration Engine",
      collect: () =>
        safeCollect("admin", () => {
          const engine = node("ENGINE", "admin", "Administration Engine", "admin");
          const policy = node("POLICY", "baseline", "Baseline Policy", "admin");
          const config = node(
            "CONFIGURATION",
            "admin-config",
            "Admin Configuration",
            "admin"
          );
          return {
            sourceId: "admin",
            nodes: [engine, policy, config],
            edges: [
              edge(engine.nodeId, policy.nodeId, "AUDITS", 0.9, [
                "admin audits policies",
              ]),
              edge(engine.nodeId, config.nodeId, "USES", 0.9),
              edge(policy.nodeId, config.nodeId, "REFERENCES", 0.85),
            ],
          };
        }),
    },
    {
      id: "compliance",
      name: "Compliance Engine",
      collect: () =>
        safeCollect("compliance", () => {
          const engine = node("ENGINE", "compliance", "Compliance Engine", "compliance");
          const score = node(
            "COMPLIANCE_SCORE",
            "compliance-score",
            "Compliance Score",
            "compliance"
          );
          const report = node("REPORT", "compliance-report", "Compliance Report", "compliance");
          const admin = createKnowledgeNodeId("ENGINE", "admin");
          return {
            sourceId: "compliance",
            nodes: [engine, score, report],
            edges: [
              edge(engine.nodeId, score.nodeId, "PRODUCES", 0.95),
              edge(engine.nodeId, report.nodeId, "REPORTS", 0.9),
              edge(engine.nodeId, admin, "DEPENDS_ON", 0.85, [
                "compliance depends on administration",
              ]),
            ],
          };
        }),
    },
    {
      id: "analytics",
      name: "Analytics Engine",
      collect: () =>
        safeCollect("analytics", () => {
          const engine = node("ENGINE", "analytics", "Analytics Engine", "analytics");
          const metric = node("METRIC", "health", "Health Metric", "analytics");
          return {
            sourceId: "analytics",
            nodes: [engine, metric],
            edges: [edge(engine.nodeId, metric.nodeId, "PRODUCES", 0.9)],
          };
        }),
    },
    {
      id: "reporting",
      name: "Reporting Engine",
      collect: () =>
        safeCollect("reporting", () => {
          const engine = node("ENGINE", "reporting", "Reporting Engine", "reporting");
          const report = node("REPORT", "validation-report", "Validation Report", "reporting");
          return {
            sourceId: "reporting",
            nodes: [engine, report],
            edges: [edge(engine.nodeId, report.nodeId, "PRODUCES", 0.9)],
          };
        }),
    },
    {
      id: "diagnostics",
      name: "Diagnostics Engine",
      collect: () =>
        safeCollect("diagnostics", () => {
          const engine = node("ENGINE", "diagnostics", "Diagnostics Engine", "diagnostics");
          const event = node("EVENT", "diag-event", "Diagnostics Event", "diagnostics");
          return {
            sourceId: "diagnostics",
            nodes: [engine, event],
            edges: [edge(engine.nodeId, event.nodeId, "TRIGGERS", 0.85)],
          };
        }),
    },
    {
      id: "optimization",
      name: "Optimization Engine",
      collect: () =>
        safeCollect("optimization", () => {
          const engine = node(
            "ENGINE",
            "optimization",
            "Optimization Engine",
            "optimization"
          );
          const result = node(
            "OPTIMIZATION_RESULT",
            "opt-result",
            "Optimization Result",
            "optimization"
          );
          const ruleEngine = createKnowledgeNodeId("ENGINE", "rule-engine");
          return {
            sourceId: "optimization",
            nodes: [engine, result],
            edges: [
              edge(engine.nodeId, result.nodeId, "PRODUCES", 0.9),
              edge(engine.nodeId, ruleEngine, "OPTIMIZES", 0.85, [
                "optimization targets rule engine",
              ]),
            ],
          };
        }),
    },
    {
      id: "reliability",
      name: "Reliability Engine",
      collect: () =>
        safeCollect("reliability", () => {
          const engine = node(
            "ENGINE",
            "reliability",
            "Reliability Engine",
            "reliability"
          );
          const metric = node(
            "METRIC",
            "availability",
            "Availability Metric",
            "reliability"
          );
          return {
            sourceId: "reliability",
            nodes: [engine, metric],
            edges: [edge(engine.nodeId, metric.nodeId, "OBSERVES", 0.9)],
          };
        }),
    },
    {
      id: "observability",
      name: "Observability Engine",
      collect: () =>
        safeCollect("observability", () => {
          const engine = node(
            "ENGINE",
            "observability",
            "Observability Engine",
            "observability"
          );
          const metric = node(
            "METRIC",
            "telemetry",
            "Telemetry Metric",
            "observability"
          );
          return {
            sourceId: "observability",
            nodes: [engine, metric],
            edges: [edge(engine.nodeId, metric.nodeId, "OBSERVES", 0.9)],
          };
        }),
    },
    {
      id: "intelligence",
      name: "Intelligence Engine",
      collect: () =>
        safeCollect("intelligence", () => {
          const engine = node(
            "ENGINE",
            "intelligence",
            "Intelligence Engine",
            "intelligence"
          );
          const rec = node(
            "RECOMMENDATION",
            "insight-rec",
            "Insight Recommendation",
            "intelligence"
          );
          return {
            sourceId: "intelligence",
            nodes: [engine, rec],
            edges: [
              edge(engine.nodeId, rec.nodeId, "PRODUCES", 0.9),
              edge(engine.nodeId, createKnowledgeNodeId("ENGINE", "observability"), "CORRELATES", 0.8),
            ],
          };
        }),
    },
    {
      id: "trust",
      name: "Trust Engine",
      collect: () =>
        safeCollect("trust", () => {
          const engine = node("ENGINE", "trust", "Trust Engine", "trust");
          const score = node("TRUST_SCORE", "trust-score", "Trust Score", "trust");
          return {
            sourceId: "trust",
            nodes: [engine, score],
            edges: [edge(engine.nodeId, score.nodeId, "PRODUCES", 0.95)],
          };
        }),
    },
    {
      id: "dashboard",
      name: "Validation Dashboard",
      collect: () =>
        safeCollect("dashboard", () => {
          const moduleNode = node("MODULE", "dashboard", "Dashboard Backend", "dashboard");
          const snap = node("SNAPSHOT", "dash-snap", "Dashboard Snapshot", "dashboard");
          return {
            sourceId: "dashboard",
            nodes: [moduleNode, snap],
            edges: [
              edge(moduleNode.nodeId, snap.nodeId, "PRODUCES", 0.85),
              edge(
                moduleNode.nodeId,
                createKnowledgeNodeId("ENGINE", "analytics"),
                "CONSUMES",
                0.8
              ),
            ],
          };
        }),
    },
    {
      id: "eventBus",
      name: "Validation Event Bus",
      collect: () =>
        safeCollect("eventBus", () => {
          const moduleNode = node("MODULE", "event-bus", "Event Bus", "eventBus");
          const event = node("EVENT", "bus-event", "Validation Event", "eventBus");
          return {
            sourceId: "eventBus",
            nodes: [moduleNode, event],
            edges: [edge(moduleNode.nodeId, event.nodeId, "TRIGGERS", 0.9)],
          };
        }),
    },
  ];
}

export function registerBuiltinKnowledgeSources(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (areBuiltinKnowledgeSourcesRegistered() && !options?.force) {
    return {
      registered: 0,
      skipped: getRegisteredKnowledgeSources().length,
      total: getRegisteredKnowledgeSources().length,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const def of buildBuiltinKnowledgeSources()) {
    const result = registerKnowledgeSource(def, options);
    if (result.registered) added += 1;
    else skipped += 1;
  }
  markBuiltinKnowledgeSourcesRegistered();
  return {
    registered: added,
    skipped,
    total: getRegisteredKnowledgeSources().length,
  };
}

export interface KnowledgeRegistrationResult {
  registered: boolean;
  skipped: boolean;
  sourcesRegistered: number;
}

export function registerValidationKnowledgeGraph(options?: {
  engine?: ValidationKnowledgeGraph;
  config?: KnowledgeConfigurationInput;
  force?: boolean;
}): KnowledgeRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      sourcesRegistered: getRegisteredKnowledgeSources().length,
    };
  }

  const sources = registerBuiltinKnowledgeSources({ force: options?.force });
  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new ValidationKnowledgeGraph(options?.config);
  }

  engineRegistered = true;
  return {
    registered: true,
    skipped: false,
    sourcesRegistered: sources.total,
  };
}

export function getValidationKnowledgeGraph(
  options?: KnowledgeConfigurationInput
): ValidationKnowledgeGraph {
  if (!defaultEngine || options) {
    defaultEngine = new ValidationKnowledgeGraph(options);
    registerBuiltinKnowledgeSources();
  }
  return defaultEngine;
}

export function resetValidationKnowledgeGraph(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetKnowledgeSourceRegistrationState();
}

/** Public API convenience wrappers. */
export function buildKnowledgeGraph(options?: BuildKnowledgeGraphOptions) {
  registerValidationKnowledgeGraph();
  return getValidationKnowledgeGraph().buildKnowledgeGraph(options);
}

export function queryGraph(query: KnowledgeQuery) {
  registerValidationKnowledgeGraph();
  return getValidationKnowledgeGraph().queryGraph(query);
}

export function analyzeDependencies(nodeId: string) {
  registerValidationKnowledgeGraph();
  return getValidationKnowledgeGraph().analyzeDependencies(nodeId);
}

export function analyzeImpact(sourceNodeId: string, scope?: ImpactScope) {
  registerValidationKnowledgeGraph();
  return getValidationKnowledgeGraph().analyzeImpact(sourceNodeId, scope);
}

export function findRelationships(options?: {
  nodeId?: string;
  relationship?: KnowledgeConfiguration["relationshipTypes"][number];
}) {
  registerValidationKnowledgeGraph();
  return getValidationKnowledgeGraph().findRelationships(options);
}

export function getKnowledgeMetrics() {
  registerValidationKnowledgeGraph();
  return getValidationKnowledgeGraph().getKnowledgeMetrics();
}

export function createKnowledgeSnapshot(label?: string) {
  registerValidationKnowledgeGraph();
  return getValidationKnowledgeGraph().createKnowledgeSnapshot(label);
}

export {
  DEFAULT_KNOWLEDGE_CONFIGURATION,
  resolveKnowledgeConfiguration,
};
