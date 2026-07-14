"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Download, FileSpreadsheet, FileText, Printer, Share2 } from "lucide-react";
import type {
  ExportUserRole,
  SubscriptionTier,
  SupportedExportReportType,
} from "@/src/core/dataIntegrity/reporting";

export interface ReportExportToolbarProps {
  reportType?: SupportedExportReportType | string;
  userId?: string;
  role?: ExportUserRole;
  subscriptionTier?: SubscriptionTier;
  className?: string;
}

type VisibleActions = {
  downloadPdf: boolean;
  downloadExcel: boolean;
  print: boolean;
  markdown: boolean;
  share: boolean;
  upgradeRequired: boolean;
  previewOnly: boolean;
};

const DEFAULT_ACTIONS: VisibleActions = {
  downloadPdf: false,
  downloadExcel: false,
  print: false,
  markdown: false,
  share: false,
  upgradeRequired: true,
  previewOnly: true,
};

/**
 * Dashboard export actions for institutional reports.
 * Buttons hide automatically when the user lacks permission.
 */
export function ReportExportToolbar({
  reportType = "ValidationReport",
  userId = "dashboard-user",
  role = "subscriber",
  subscriptionTier = "pro",
  className = "",
}: ReportExportToolbarProps) {
  const [actions, setActions] = useState<VisibleActions>(DEFAULT_ACTIONS);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/reports/export?role=${encodeURIComponent(role)}&tier=${encodeURIComponent(
            subscriptionTier
          )}&userId=${encodeURIComponent(userId)}`
        );
        const data = (await res.json()) as {
          permissions?: Record<
            string,
            {
              allowed?: boolean;
              upgradeRequired?: boolean;
              previewOnly?: boolean;
            }
          >;
        };
        if (cancelled) return;
        const pdf = data.permissions?.PDF;
        const excel = data.permissions?.EXCEL;
        const md = data.permissions?.MARKDOWN;
        const print = data.permissions?.PRINT;
        setActions({
          downloadPdf: Boolean(pdf?.allowed),
          downloadExcel: Boolean(excel?.allowed),
          markdown: Boolean(md?.allowed),
          print: Boolean(print?.allowed),
          share: false,
          upgradeRequired: Boolean(
            pdf?.upgradeRequired ||
              excel?.upgradeRequired ||
              md?.upgradeRequired
          ),
          previewOnly: Boolean(pdf?.previewOnly) && !pdf?.allowed,
        });
      } catch {
        if (!cancelled) setActions(DEFAULT_ACTIONS);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [role, subscriptionTier, userId]);

  const runExport = (format: "PDF" | "EXCEL" | "MARKDOWN" | "PRINT") => {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/reports/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            format,
            reportType,
            userId,
            role,
            subscriptionTier,
          }),
        });

        if (res.status === 403) {
          const data = (await res.json()) as { message?: string };
          setMessage(data.message ?? "Upgrade Required");
          return;
        }

        if (!res.ok) {
          setMessage("Export failed.");
          return;
        }

        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const match = /filename="([^"]+)"/.exec(disposition);
        const filename = match?.[1] ?? `report.${format.toLowerCase()}`;

        if (format === "PRINT") {
          const html = await blob.text();
          const w = window.open("", "_blank");
          if (w) {
            w.document.write(html);
            w.document.close();
            w.focus();
            w.print();
          }
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        setMessage("Export failed.");
      }
    });
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      data-testid="report-export-toolbar"
    >
      {actions.downloadPdf ? (
        <ExportButton
          label="Download PDF"
          icon={<Download className="h-3.5 w-3.5" />}
          disabled={pending}
          onClick={() => runExport("PDF")}
        />
      ) : null}
      {actions.downloadExcel ? (
        <ExportButton
          label="Download Excel"
          icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
          disabled={pending}
          onClick={() => runExport("EXCEL")}
        />
      ) : null}
      {actions.print ? (
        <ExportButton
          label="Print"
          icon={<Printer className="h-3.5 w-3.5" />}
          disabled={pending}
          onClick={() => runExport("PRINT")}
        />
      ) : null}
      {actions.markdown ? (
        <ExportButton
          label="Markdown"
          icon={<FileText className="h-3.5 w-3.5" />}
          disabled={pending}
          onClick={() => runExport("MARKDOWN")}
        />
      ) : null}
      {actions.share ? (
        <ExportButton
          label="Share"
          icon={<Share2 className="h-3.5 w-3.5" />}
          disabled
          onClick={() => undefined}
        />
      ) : null}
      {actions.upgradeRequired || actions.previewOnly ? (
        <span className="text-[11px] text-text-muted">Upgrade Required</span>
      ) : null}
      {message ? (
        <span className="text-[11px] text-amber-700">{message}</span>
      ) : null}
    </div>
  );
}

function ExportButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-surface-border-subtle bg-surface-hover/40 px-2.5 py-1.5 text-[11px] font-medium text-text-primary transition hover:bg-surface-hover disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}
