/**
 * Excel exporter — SpreadsheetML (Excel-compatible XML) from report models.
 * Reuses ReportExportModels EXCEL_READY sheets plus institutional metadata.
 */

import type { InstitutionalReport } from "../ReportBuilder";
import { ReportExportModels } from "../ReportExportModels";
import type { ExportConfiguration } from "./ExportConfiguration";
import {
  buildExportDocument,
  type ExportReportMetadata,
} from "./ExportDocument";

export interface ExcelExportResult {
  format: "EXCEL";
  mimeType: "application/vnd.ms-excel";
  filename: string;
  /** SpreadsheetML XML content. */
  content: string;
  metadata: ExportReportMetadata;
  sheetNames: string[];
}

export class ExcelExporter {
  private readonly models = new ReportExportModels();

  constructor(private readonly config: ExportConfiguration) {}

  export(
    report: InstitutionalReport,
    options?: { generatedBy?: string }
  ): ExcelExportResult {
    const document = buildExportDocument(report, this.config, options);
    const ready = this.models.build(report, "EXCEL_READY");
    if (ready.format !== "EXCEL_READY") {
      throw new Error("Failed to build Excel-ready export model");
    }

    const sheets: Array<{
      name: string;
      headers: string[];
      rows: Array<Array<string | number | boolean | null>>;
    }> = [
      {
        name: "Metadata",
        headers: ["key", "value"],
        rows: [
          ["generatedOn", document.metadata.generatedOn],
          ["generatedBy", document.metadata.generatedBy],
          ["aiVersion", document.metadata.aiVersion],
          ["validationVersion", document.metadata.validationVersion],
          ["trustVersion", document.metadata.trustVersion],
          ["platformVersion", document.metadata.platformVersion],
          ["reportVersion", document.metadata.reportVersion],
          ["environment", document.metadata.environment],
          ["watermark", document.metadata.watermark],
          ["reportId", document.metadata.reportId],
          ["reportType", document.metadata.reportType],
        ],
      },
      ...ready.sheets,
      {
        name: "Warnings",
        headers: ["warning"],
        rows: report.warnings.map((w) => [w]),
      },
      {
        name: "Recommendations",
        headers: ["recommendation"],
        rows: report.recommendations.map((r) => [r]),
      },
    ];

    const xml = buildSpreadsheetMl(sheets, document.metadata.watermark);
    const filename = sanitizeFilename(
      `${report.reportType}-${report.reportId}.xls`
    );

    return {
      format: "EXCEL",
      mimeType: "application/vnd.ms-excel",
      filename,
      content: xml,
      metadata: document.metadata,
      sheetNames: sheets.map((s) => s.name),
    };
  }
}

function buildSpreadsheetMl(
  sheets: Array<{
    name: string;
    headers: string[];
    rows: Array<Array<string | number | boolean | null>>;
  }>,
  watermark: string
): string {
  const worksheetXml = sheets
    .map((sheet) => {
      const headerRow = `<Row>${sheet.headers
        .map((h) => `<Cell><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`)
        .join("")}</Row>`;
      const dataRows = sheet.rows
        .map((row) => {
          const cells = row
            .map((cell) => {
              if (typeof cell === "number") {
                return `<Cell><Data ss:Type="Number">${cell}</Data></Cell>`;
              }
              if (typeof cell === "boolean") {
                return `<Cell><Data ss:Type="Boolean">${cell ? 1 : 0}</Data></Cell>`;
              }
              return `<Cell><Data ss:Type="String">${xmlEscape(
                cell == null ? "" : String(cell)
              )}</Data></Cell>`;
            })
            .join("");
          return `<Row>${cells}</Row>`;
        })
        .join("");
      return `<Worksheet ss:Name="${xmlEscape(sheet.name.slice(0, 31))}"><Table>${headerRow}${dataRows}</Table></Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <DocumentProperties><Title>${xmlEscape(watermark)}</Title></DocumentProperties>
 ${worksheetXml}
</Workbook>`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
