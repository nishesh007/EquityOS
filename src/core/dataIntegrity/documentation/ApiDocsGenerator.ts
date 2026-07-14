/**
 * API documentation generator — read-only public API catalog.
 */

import type { DocumentationConfiguration } from "./DocumentationConfiguration";
import type { DocumentationTargetDefinition } from "./DocumentationRegistry";
import { buildDocument, type DocumentationDocument } from "./DocumentationDocument";

export class ApiDocsGenerator {
  private seq = 0;

  generate(
    targets: DocumentationTargetDefinition[],
    config: DocumentationConfiguration
  ): DocumentationDocument {
    this.seq += 1;
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const apiTargets = targets.filter(
        (t) =>
          t.kind === "api" ||
          t.kind === "engine" ||
          t.kind === "module" ||
          t.publicApi.length > 0
      );
      const filtered = config.includeDeprecated
        ? apiTargets
        : apiTargets.filter((t) => !t.deprecated);

      if (filtered.length === 0) {
        warnings.push("No API targets available for documentation");
      }

      const sections = filtered.map((t) => ({
        heading: `${t.name} (${t.module})`,
        body: `${t.description} Version ${t.version}.`,
        bullets: t.publicApi.map((fn) => `\`${fn}()\``),
      }));

      if (config.style === "detailed" || config.style === "institutional") {
        sections.unshift({
          heading: "Public API Overview",
          body: "Read-only documentation of Validation Platform public façades. These APIs do not mutate validation outcomes.",
          bullets: [
            "All listed methods are advisory or observational unless otherwise stated by their owning engine.",
            "Registration helpers are idempotent.",
          ],
        });
      }

      return buildDocument({
        documentId: `doc:api:${this.seq}`,
        kind: "api",
        title: "Validation Platform API Documentation",
        summary: `Catalog of ${filtered.length} public API surfaces across the institutional validation stack.`,
        sections,
        relatedModules: [...new Set(filtered.map((t) => t.module))],
        warnings,
        errors,
      });
    } catch (err) {
      errors.push(`API docs generation failed: ${String(err)}`);
      return buildDocument({
        documentId: `doc:api:error:${Date.now()}`,
        kind: "api",
        title: "Validation Platform API Documentation",
        summary: "API documentation unavailable",
        sections: [],
        warnings,
        errors,
      });
    }
  }
}
