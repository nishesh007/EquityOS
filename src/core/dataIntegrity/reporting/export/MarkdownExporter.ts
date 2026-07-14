/**
 * Markdown exporter — institutional sections from existing report models.
 */

import type { InstitutionalReport } from "../ReportBuilder";
import { ReportExportModels } from "../ReportExportModels";
import type { ExportConfiguration } from "./ExportConfiguration";
import {
  buildExportDocument,
  type ExportReportMetadata,
} from "./ExportDocument";

export interface MarkdownExportResult {
  format: "MARKDOWN";
  mimeType: "text/markdown";
  filename: string;
  content: string;
  metadata: ExportReportMetadata;
}

export class MarkdownExporter {
  private readonly models = new ReportExportModels();

  constructor(private readonly config: ExportConfiguration) {}

  export(
    report: InstitutionalReport,
    options?: { generatedBy?: string }
  ): MarkdownExportResult {
    const document = buildExportDocument(report, this.config, options);
    const base = this.models.build(report, "MARKDOWN");
    const baseMd =
      base.format === "MARKDOWN" ? base.markdown : `# ${report.title}`;

    const metaBlock = [
      `---`,
      `generatedOn: ${document.metadata.generatedOn}`,
      `generatedBy: ${document.metadata.generatedBy}`,
      `aiVersion: ${document.metadata.aiVersion}`,
      `validationVersion: ${document.metadata.validationVersion}`,
      `trustVersion: ${document.metadata.trustVersion}`,
      `platformVersion: ${document.metadata.platformVersion}`,
      `reportVersion: ${document.metadata.reportVersion}`,
      `environment: ${document.metadata.environment}`,
      `watermark: ${document.metadata.watermark}`,
      `reportId: ${document.metadata.reportId}`,
      `---`,
      ``,
      `> **${document.metadata.watermark}**`,
      ``,
    ].join("\n");

    const institutionalSections = document.sections
      .map((section) => {
        const parts = [`## ${section.heading}`, ``];
        for (const p of section.paragraphs) {
          parts.push(p);
          parts.push(``);
        }
        if (section.tables) {
          for (const table of section.tables) {
            parts.push(`| ${table.headers.join(" | ")} |`);
            parts.push(
              `| ${table.headers.map(() => "---").join(" | ")} |`
            );
            for (const row of table.rows) {
              parts.push(`| ${row.join(" | ")} |`);
            }
            parts.push(``);
          }
        }
        if (section.chartRefs) {
          for (const chart of section.chartRefs) {
            parts.push(`- **Chart — ${chart.title}**: ${chart.description}`);
          }
          parts.push(``);
        }
        return parts.join("\n");
      })
      .join("\n");

    const content = [
      metaBlock,
      baseMd,
      ``,
      `# Institutional Export Sections`,
      ``,
      institutionalSections,
      ``,
      `## Disclaimer`,
      ``,
      document.disclaimer,
      ``,
    ].join("\n");

    return {
      format: "MARKDOWN",
      mimeType: "text/markdown",
      filename: sanitizeFilename(
        `${report.reportType}-${report.reportId}.md`
      ),
      content,
      metadata: document.metadata,
    };
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
