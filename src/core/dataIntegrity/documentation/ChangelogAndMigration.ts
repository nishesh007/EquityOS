/**
 * Changelog and migration guide generators.
 */

import type { DocumentationTargetDefinition } from "./DocumentationRegistry";
import {
  buildDocument,
  type DocumentationDocument,
} from "./DocumentationDocument";

export class ChangelogGenerator {
  private seq = 0;

  generate(
    targets: DocumentationTargetDefinition[],
    engineVersion: string
  ): DocumentationDocument {
    this.seq += 1;
    const bullets = targets.slice(0, 20).map(
      (t) => `${t.name} ${t.version} (${t.module})`
    );
    return buildDocument({
      documentId: `doc:changelog:${this.seq}`,
      kind: "changelog",
      title: "Validation Platform Changelog",
      summary: `Documented inventory snapshot for documentation engine ${engineVersion}.`,
      sections: [
        {
          heading: `Release ${engineVersion}`,
          body: "Additive Sprint 9F documentation/DX layer with no validation behavior changes.",
          bullets: [
            "Added Documentation & Developer Experience Engine",
            "Read-only collectors and generators only",
            ...bullets,
          ],
        },
      ],
      relatedModules: ["documentation"],
    });
  }
}

export class MigrationGuideGenerator {
  private seq = 0;

  generate(
    targets: DocumentationTargetDefinition[]
  ): DocumentationDocument {
    this.seq += 1;
    return buildDocument({
      documentId: `doc:migration:${this.seq}`,
      kind: "migration",
      title: "Validation Platform Migration Guide",
      summary:
        "Guidance for adopting new Sprint 9F engines without breaking existing validation flows.",
      sections: [
        {
          heading: "Compatibility",
          body: "All Sprint 9F engines are additive. Existing validate()/RuleEngine APIs remain unchanged.",
          bullets: [
            "Re-export new façades from dataIntegrity/index.ts",
            "Register engines idempotently in instrumentation.ts",
            "Prefer feature flags/config for gradual rollout of advisory consumers",
          ],
        },
        {
          heading: "Module Adoption Order",
          body: "Recommended adoption sequence for new documentation consumers.",
          bullets: [
            "1. Integrity + Rules (existing)",
            "2. Orchestrator + Events",
            "3. Trust/Analytics/Dashboard",
            "4. Advisory engines (simulation/learning/documentation/release)",
            ...targets
              .filter((t) => t.kind === "engine")
              .slice(0, 10)
              .map((t) => `Available: ${t.name}`),
          ],
        },
        {
          heading: "Breaking Change Policy",
          body: "No breaking changes in public validation APIs. Deprecations must remain callable until an explicit major migration.",
          bullets: [
            "Do not rename existing public functions",
            "Add new options as optional fields",
            "Keep defaults backward compatible",
          ],
        },
      ],
      relatedModules: ["versioning", "documentation", "release"],
    });
  }
}
