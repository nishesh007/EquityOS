/**
 * Module documentation generator.
 */

import type { DocumentationConfiguration } from "./DocumentationConfiguration";
import type { DocumentationTargetDefinition } from "./DocumentationRegistry";
import { buildDocument, type DocumentationDocument } from "./DocumentationDocument";

export class ModuleDocsGenerator {
  private seq = 0;

  generate(
    targets: DocumentationTargetDefinition[],
    config: DocumentationConfiguration,
    moduleFilter?: string
  ): DocumentationDocument {
    this.seq += 1;
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      let modules = targets.filter(
        (t) => t.kind === "module" || t.kind === "engine"
      );
      if (moduleFilter) {
        modules = modules.filter((t) => t.module === moduleFilter);
      }
      if (!config.includeDeprecated) {
        modules = modules.filter((t) => !t.deprecated);
      }
      if (modules.length === 0) {
        warnings.push("No modules matched documentation filter");
      }

      const sections = modules.map((m) => ({
        heading: m.name,
        body: `${m.description} Module path: ${m.module}.`,
        bullets: [
          `Version: ${m.version}`,
          `Dependencies: ${m.dependencies.join(", ") || "none"}`,
          `Public API: ${m.publicApi.join(", ") || "none"}`,
        ],
      }));

      return buildDocument({
        documentId: `doc:module:${this.seq}`,
        kind: "module",
        title: moduleFilter
          ? `Module Documentation: ${moduleFilter}`
          : "Validation Platform Module Documentation",
        summary: `Documentation for ${modules.length} validation platform module(s).`,
        sections,
        relatedModules: modules.map((m) => m.module),
        warnings,
        errors,
      });
    } catch (err) {
      errors.push(`module docs generation failed: ${String(err)}`);
      return buildDocument({
        documentId: `doc:module:error:${Date.now()}`,
        kind: "module",
        title: "Module Documentation",
        summary: "Module documentation unavailable",
        sections: [],
        warnings,
        errors,
      });
    }
  }
}
