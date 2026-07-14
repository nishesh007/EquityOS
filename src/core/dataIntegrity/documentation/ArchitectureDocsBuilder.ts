/**
 * Architecture documentation builder — architecture, pipeline, dependency, config, lifecycle.
 */

import type { DocumentationConfiguration } from "./DocumentationConfiguration";
import type { DocumentationTargetDefinition } from "./DocumentationRegistry";
import {
  buildDocument,
  type DocumentationDocument,
} from "./DocumentationDocument";

export class ArchitectureDocsBuilder {
  private seq = 0;

  generateArchitecture(
    targets: DocumentationTargetDefinition[],
    config: DocumentationConfiguration
  ): DocumentationDocument {
    this.seq += 1;
    const modules = [...new Set(targets.map((t) => t.module))];
    const sections = [
      {
        heading: "Platform Topology",
        body: "The Validation Platform is organized as layered engines around the Integrity and Rule cores, with advisory engines for analytics, trust, explainability, simulation, learning, and release certification.",
        bullets: modules.slice(0, 20).map((m) => `Module: ${m}`),
      },
      {
        heading: "Non-Interference Guarantee",
        body: "Documentation, learning, simulation, and certification layers are observational/advisory and must never mutate validation decisions.",
        bullets: [
          "documentationOnly=true",
          "Read-only collectors only",
          "No RuleEngine behavior changes",
        ],
      },
      this.pipelineSection(targets),
      this.dependencySection(targets),
      this.configurationSection(config),
      this.lifecycleSection(),
    ];

    return buildDocument({
      documentId: `doc:architecture:${this.seq}`,
      kind: "architecture",
      title: "Validation Platform Architecture Documentation",
      summary:
        "Architecture, pipeline flow, dependency map, configuration, and lifecycle documentation.",
      sections,
      relatedModules: modules,
    });
  }

  generatePipeline(
    targets: DocumentationTargetDefinition[]
  ): DocumentationDocument {
    this.seq += 1;
    return buildDocument({
      documentId: `doc:pipeline:${this.seq}`,
      kind: "pipeline",
      title: "Validation Pipeline Flow Documentation",
      summary: "End-to-end validation pipeline stages and orchestration flow.",
      sections: [this.pipelineSection(targets)],
      relatedModules: ["orchestrator", "rules", "integrity"],
    });
  }

  generateDependencies(
    targets: DocumentationTargetDefinition[]
  ): DocumentationDocument {
    this.seq += 1;
    return buildDocument({
      documentId: `doc:dependency:${this.seq}`,
      kind: "dependency",
      title: "Validation Dependency Documentation",
      summary: "Module dependency relationships across the validation stack.",
      sections: [this.dependencySection(targets)],
      relatedModules: [...new Set(targets.map((t) => t.module))],
    });
  }

  generateConfiguration(
    config: DocumentationConfiguration
  ): DocumentationDocument {
    this.seq += 1;
    return buildDocument({
      documentId: `doc:configuration:${this.seq}`,
      kind: "configuration",
      title: "Validation Configuration Documentation",
      summary: "Configuration surfaces for documentation and related engines.",
      sections: [this.configurationSection(config)],
      relatedModules: ["documentation"],
    });
  }

  generateLifecycle(): DocumentationDocument {
    this.seq += 1;
    return buildDocument({
      documentId: `doc:lifecycle:${this.seq}`,
      kind: "lifecycle",
      title: "Validation Lifecycle Documentation",
      summary: "Lifecycle from intake through decision, audit, and certification.",
      sections: [this.lifecycleSection()],
      relatedModules: ["orchestrator", "release"],
    });
  }

  private pipelineSection(
    targets: DocumentationTargetDefinition[]
  ): {
    heading: string;
    body: string;
    bullets: string[];
  } {
    const engines = targets
      .filter((t) => t.kind === "engine" || t.kind === "module")
      .map((t) => t.name);
    return {
      heading: "Pipeline Flow",
      body: "Intake → Rule Execution → Integrity Aggregation → Trust/Analytics → Advisory Engines → Reporting/Dashboard.",
      bullets: [
        "Orchestrator routes validation requests",
        "Rule Engine executes ordered rule waves",
        "Integrity Engine aggregates scores and issues",
        ...engines.slice(0, 8).map((e) => `Participating engine: ${e}`),
      ],
    };
  }

  private dependencySection(
    targets: DocumentationTargetDefinition[]
  ): {
    heading: string;
    body: string;
    bullets: string[];
  } {
    const edges = targets.flatMap((t) =>
      t.dependencies.map((d) => `${t.module} → ${d}`)
    );
    return {
      heading: "Dependency Map",
      body: "Directed dependencies used for onboarding and impact analysis. Documentation reads these relationships without altering them.",
      bullets: edges.length > 0 ? edges.slice(0, 30) : ["No dependencies declared"],
    };
  }

  private configurationSection(config: DocumentationConfiguration): {
    heading: string;
    body: string;
    bullets: string[];
  } {
    return {
      heading: "Configuration",
      body: "Documentation engine configuration controls style, retention, and coverage scoring.",
      bullets: [
        `style=${config.style}`,
        `mode=${config.mode}`,
        `includeExamples=${config.includeExamples}`,
        `snapshotRetention=${config.snapshotRetention}`,
        `documentationOnly=${config.documentationOnly}`,
      ],
    };
  }

  private lifecycleSection(): {
    heading: string;
    body: string;
    bullets: string[];
  } {
    return {
      heading: "Validation Lifecycle",
      body: "Lifecycle stages from request acceptance to production certification.",
      bullets: [
        "1. Request intake via Orchestrator",
        "2. Rule and integrity validation",
        "3. Trust, analytics, and explainability enrichment",
        "4. Simulation/learning advisory loops",
        "5. Release certification readiness review",
      ],
    };
  }
}
