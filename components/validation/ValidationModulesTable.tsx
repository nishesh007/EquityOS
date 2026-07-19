"use client";

/**
 * Sprint 10C.R4 — validation modules as an institutional table.
 * Presentation only: rows come from the existing Sprint 9F dashboard
 * summary (no validation logic is recomputed here).
 */

import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";
import { createInstitutionalTable, ResearchDataGrid } from "@/src/design";

interface ValidationModuleRow {
  id: string;
  module: string;
  status: string;
  checks: number;
  passedPercent: number;
  quality: number;
  health: string;
  warnings: number;
  errors: number;
  lastValidation: string | null;
}

const VALIDATION_TABLE = createInstitutionalTable<ValidationModuleRow>({
  id: "validation-modules",
  pageSize: 25,
  defaultSort: { columnId: "quality", direction: "desc" },
  columns: [
    { id: "module", label: "Module", kind: "text", sticky: true, width: 180 },
    { id: "status", label: "Validation Status", kind: "status" },
    { id: "checks", label: "Checks", kind: "number" },
    { id: "passedPercent", label: "Checks Passed", kind: "progress" },
    { id: "quality", label: "Quality", kind: "gauge" },
    { id: "health", label: "Confidence", kind: "badge" },
    { id: "warnings", label: "Warnings", kind: "number" },
    { id: "errors", label: "Errors", kind: "number" },
    { id: "lastValidation", label: "Last Validation", kind: "date" },
  ],
});

export function ValidationModulesTable({
  snapshot,
}: {
  snapshot: InstitutionalPlatformSnapshot | null;
}) {
  const rows = useMemo<ValidationModuleRow[]>(() => {
    const modules = snapshot?.dashboard?.modules ?? [];
    return modules.map((module) => ({
      id: module.moduleId,
      module: module.moduleName,
      status: module.currentStatus,
      checks: module.validationCount,
      passedPercent: module.successPercent,
      quality: module.averageScore,
      health: module.healthStatus.replace(/_/g, " "),
      warnings: module.warningCount,
      errors: module.criticalCount,
      lastValidation: module.lastValidation,
    }));
  }, [snapshot]);

  return (
    <Card padding="lg">
      <CardHeader
        title="Validation Modules"
        subtitle="Per-module validation status from the data integrity platform"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <ShieldCheck className="h-4 w-4 text-accent" />
          </div>
        }
      />
      <ResearchDataGrid
        table={VALIDATION_TABLE}
        rows={rows}
        getRowId={(row) => row.id}
        emptyTitle="No Validation Data"
        emptyDescription="The validation platform has not produced module metrics yet."
      />
    </Card>
  );
}
