/**
 * Developer onboarding, integration, extension, best-practices, and examples generators.
 */

import type { DocumentationConfiguration } from "./DocumentationConfiguration";
import type { DocumentationTargetDefinition } from "./DocumentationRegistry";
import {
  buildDocument,
  type DocumentationDocument,
} from "./DocumentationDocument";

export class DeveloperOnboardingGenerator {
  private seq = 0;

  generate(
    targets: DocumentationTargetDefinition[],
    config: DocumentationConfiguration
  ): DocumentationDocument {
    this.seq += 1;
    const modules = [...new Set(targets.map((t) => t.module))];
    return buildDocument({
      documentId: `doc:onboarding:${this.seq}`,
      kind: "developer_onboarding",
      title: "Developer Onboarding Guide",
      summary:
        "Onboarding path for engineers working with the institutional Validation Platform.",
      sections: [
        {
          heading: "Quick Start",
          body: "Register engines via instrumentation, import public façades from src/core/dataIntegrity, and prefer validate()/orchestrator APIs.",
          bullets: [
            "Read IntegrityTypes and IntegrityConfig first",
            "Use register* helpers (idempotent)",
            "Never import raw provider data past validation boundaries",
          ],
        },
        {
          heading: "Core Modules",
          body: "Start with integrity, rules, orchestrator, then advisory engines.",
          bullets: modules.slice(0, 12),
        },
        {
          heading: "Local Development",
          body: config.includeExamples
            ? "Run unit tests under each engine folder with vitest; keep documentationOnly engines side-effect free."
            : "Run focused vitest suites for the module under change.",
          bullets: [
            "npx vitest run src/core/dataIntegrity/**/*.test.ts",
            "Prefer additive exports in index.ts",
          ],
        },
      ],
      relatedModules: modules.slice(0, 10),
    });
  }
}

export class IntegrationGuideGenerator {
  private seq = 0;

  generate(
    targets: DocumentationTargetDefinition[]
  ): DocumentationDocument {
    this.seq += 1;
    const apis = targets.flatMap((t) =>
      t.publicApi.map((fn) => `${t.module}.${fn}`)
    );
    return buildDocument({
      documentId: `doc:integration:${this.seq}`,
      kind: "integration",
      title: "Integration Guide",
      summary:
        "How product services integrate with Validation Platform public APIs.",
      sections: [
        {
          heading: "Integration Principles",
          body: "Call public façades only. Treat advisory engines as non-authoritative for trade decisions.",
          bullets: [
            "Use orchestrator for unified validation",
            "Subscribe to Validation Event Bus for observability",
            "Do not bypass integrity validation",
          ],
        },
        {
          heading: "Key Entry Points",
          body: "Primary integration surfaces.",
          bullets: apis.slice(0, 25),
        },
      ],
      relatedModules: [...new Set(targets.map((t) => t.module))],
    });
  }
}

export class ExtensionGuideGenerator {
  private seq = 0;

  generate(): DocumentationDocument {
    this.seq += 1;
    return buildDocument({
      documentId: `doc:extension:${this.seq}`,
      kind: "extension",
      title: "Extension Guide",
      summary: "How to extend the Validation Platform safely.",
      sections: [
        {
          heading: "Adding a Rule",
          body: "Implement a rule in the appropriate rules/* package, register via registry helper, export through package index, and add unit tests.",
          bullets: [
            "Do not change RuleEngine semantics",
            "Keep configuration values in *Configuration.ts",
            "Register idempotently at startup",
          ],
        },
        {
          heading: "Adding an Advisory Engine",
          body: "Follow the Sprint 9F engine pattern: configuration, registry, metrics, audit, snapshot, façade, tests, instrumentation registration.",
          bullets: [
            "Mark engine as advisory/read-only when applicable",
            "Publish events with noValidationMutation=true",
            "Re-export through dataIntegrity/index.ts",
          ],
        },
      ],
      relatedModules: ["rules", "orchestrator", "documentation"],
    });
  }
}

export class BestPracticesGenerator {
  private seq = 0;

  generate(config: DocumentationConfiguration): DocumentationDocument {
    this.seq += 1;
    return buildDocument({
      documentId: `doc:bestpractices:${this.seq}`,
      kind: "best_practices",
      title: "Validation Platform Best Practices",
      summary: "Operational and engineering best practices.",
      sections: [
        {
          heading: "Engineering",
          body: "Keep engines isolated, typed, and backward compatible.",
          bullets: [
            "No any",
            "No placeholders or TODOs in shipped code",
            "Configuration over hardcoded values",
            config.institutionalMode
              ? "Prefer institutional defaults"
              : "Use environment-appropriate defaults",
          ],
        },
        {
          heading: "Validation Safety",
          body: "Protect production decision integrity.",
          bullets: [
            "Advisory engines must not mutate outcomes",
            "Failures in DX/learning/simulation must not interrupt validation",
            "Use snapshots for regression detection",
          ],
        },
      ],
      relatedModules: ["integrity", "rules", "release"],
    });
  }
}

export class ExampleRepositoryBuilder {
  private seq = 0;

  generate(
    targets: DocumentationTargetDefinition[],
    config: DocumentationConfiguration
  ): DocumentationDocument {
    this.seq += 1;
    const examples = config.includeExamples
      ? targets.slice(0, 8).map((t) => ({
          heading: `Example: ${t.name}`,
          body: `Import and call ${t.publicApi[0] ?? "register"} from the ${t.module} package.`,
          bullets: t.publicApi.slice(0, 4).map((fn) => `await/call ${fn}()`),
        }))
      : [
          {
            heading: "Examples Disabled",
            body: "Set includeExamples=true to emit example snippets.",
            bullets: [],
          },
        ];

    return buildDocument({
      documentId: `doc:examples:${this.seq}`,
      kind: "examples",
      title: "Example Repository",
      summary: "Curated usage examples for Validation Platform public APIs.",
      sections: examples,
      relatedModules: targets.slice(0, 8).map((t) => t.module),
    });
  }
}
