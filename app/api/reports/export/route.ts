/**
 * Institutional report export API (Prompt 9F.R1).
 * Free users are denied before any downloadable artifact is produced.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  canUserExport,
  exportExcel,
  exportMarkdown,
  exportPDF,
  printReport,
  type ExportAccessSubject,
  type ExportUserRole,
  type ExportableFormat,
  type SubscriptionTier,
} from "@/src/core/dataIntegrity/reporting";

export const runtime = "nodejs";

interface ExportBody {
  format?: ExportableFormat;
  reportType?: string;
  userId?: string;
  role?: ExportUserRole;
  subscriptionTier?: SubscriptionTier;
  generatedBy?: string;
}

function parseSubject(body: ExportBody): ExportAccessSubject {
  return {
    userId: body.userId ?? "anonymous",
    role: body.role ?? "free",
    subscriptionTier: body.subscriptionTier ?? "none",
  };
}

export async function POST(request: NextRequest) {
  let body: ExportBody = {};
  try {
    body = (await request.json()) as ExportBody;
  } catch {
    body = {};
  }

  const format = (body.format ?? "PDF").toUpperCase() as ExportableFormat;
  const reportType = body.reportType ?? "ValidationReport";
  const subject = parseSubject(body);

  // Free users: do not expose downloadable export — preview denial only.
  const permission = canUserExport(subject, format);
  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        denied: true,
        upgradeRequired: permission.upgradeRequired,
        previewOnly: permission.previewOnly,
        message: permission.upgradeRequired
          ? "Upgrade Required"
          : permission.reason,
        allowedFormats: permission.allowedFormats,
      },
      { status: permission.upgradeRequired ? 403 : 403 }
    );
  }

  const options = {
    reportType,
    subject,
    generatedBy: body.generatedBy ?? subject.userId,
    generateOptions: { includeLiveCollectors: false },
  };

  try {
    if (format === "PDF") {
      const result = exportPDF(options);
      if (!result.success) {
        return NextResponse.json(
          { ok: false, denied: true, message: result.reason },
          { status: 403 }
        );
      }
      return new NextResponse(Buffer.from(result.artifact.bytes), {
        status: 200,
        headers: {
          "Content-Type": result.artifact.mimeType,
          "Content-Disposition": `attachment; filename="${result.artifact.filename}"`,
          "X-Export-Report-Id": result.artifact.metadata.reportId,
        },
      });
    }

    if (format === "EXCEL") {
      const result = exportExcel(options);
      if (!result.success) {
        return NextResponse.json(
          { ok: false, denied: true, message: result.reason },
          { status: 403 }
        );
      }
      return new NextResponse(result.artifact.content, {
        status: 200,
        headers: {
          "Content-Type": result.artifact.mimeType,
          "Content-Disposition": `attachment; filename="${result.artifact.filename}"`,
          "X-Export-Report-Id": result.artifact.metadata.reportId,
        },
      });
    }

    if (format === "MARKDOWN") {
      const result = exportMarkdown(options);
      if (!result.success) {
        return NextResponse.json(
          { ok: false, denied: true, message: result.reason },
          { status: 403 }
        );
      }
      return new NextResponse(result.artifact.content, {
        status: 200,
        headers: {
          "Content-Type": result.artifact.mimeType,
          "Content-Disposition": `attachment; filename="${result.artifact.filename}"`,
          "X-Export-Report-Id": result.artifact.metadata.reportId,
        },
      });
    }

    if (format === "PRINT") {
      const result = printReport(options);
      if (!result.success) {
        return NextResponse.json(
          { ok: false, denied: true, message: result.reason },
          { status: 403 }
        );
      }
      return new NextResponse(result.artifact.html, {
        status: 200,
        headers: {
          "Content-Type": result.artifact.mimeType,
          "Content-Disposition": `inline; filename="${result.artifact.filename}"`,
          "X-Export-Report-Id": result.artifact.metadata.reportId,
        },
      });
    }

    return NextResponse.json(
      { ok: false, message: `Unsupported format: ${format}` },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

/** Capability probe — never returns downloadable content. */
export async function GET(request: NextRequest) {
  const role = (request.nextUrl.searchParams.get("role") ??
    "free") as ExportUserRole;
  const tier = (request.nextUrl.searchParams.get("tier") ??
    "none") as SubscriptionTier;
  const subject: ExportAccessSubject = {
    userId: request.nextUrl.searchParams.get("userId") ?? "anonymous",
    role,
    subscriptionTier: tier,
  };

  const formats: ExportableFormat[] = ["PDF", "EXCEL", "MARKDOWN", "PRINT"];
  const permissions = Object.fromEntries(
    formats.map((f) => [f, canUserExport(subject, f)])
  );

  return NextResponse.json({
    ok: true,
    role,
    subscriptionTier: tier,
    permissions,
    downloadEndpointExposed: role !== "free",
  });
}
