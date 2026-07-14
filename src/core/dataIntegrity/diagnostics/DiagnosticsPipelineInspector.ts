/**
 * Pipeline-level inspection for diagnostics (read-only).
 */

export interface PipelineInspectionInput {
  pipelineId: string;
  name?: string;
  engines?: string[];
  dependencies?: string[];
  conditionalBranches?: string[];
  retries?: number;
  failures?: number;
  skippedRules?: string[];
  executedRules?: string[];
  executionTimeline?: Array<{
    step: string;
    startedAt?: string;
    durationMs?: number;
    status?: "OK" | "FAILED" | "SKIPPED" | "RETRY";
  }>;
  averageRuntimeMs?: number;
  metadata?: Record<string, unknown>;
}

export interface PipelineGraphNode {
  id: string;
  type: "pipeline" | "engine" | "branch";
  label: string;
}

export interface PipelineGraphEdge {
  from: string;
  to: string;
  kind: "next" | "depends" | "branch";
}

export interface PipelineInspectionRow {
  pipelineId: string;
  name: string;
  engines: string[];
  executionOrder: string[];
  dependencies: string[];
  conditionalBranches: string[];
  retries: number;
  failures: number;
  skippedRules: string[];
  executedRules: string[];
  executionTimeline: NonNullable<PipelineInspectionInput["executionTimeline"]>;
  averageRuntimeMs: number;
  graph: {
    nodes: PipelineGraphNode[];
    edges: PipelineGraphEdge[];
  };
}

export interface PipelineInspectionResult {
  pipelines: PipelineInspectionRow[];
  inspectedAt: string;
  warnings: string[];
  errors: string[];
}

export class DiagnosticsPipelineInspector {
  inspectPipelines(
    inputs: PipelineInspectionInput[]
  ): PipelineInspectionResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const pipelines: PipelineInspectionRow[] = [];

    try {
      for (const input of inputs) {
        try {
          const engines = [...(input.engines ?? [])];
          const nodes: PipelineGraphNode[] = [
            {
              id: input.pipelineId,
              type: "pipeline",
              label: input.name ?? input.pipelineId,
            },
            ...engines.map((engine) => ({
              id: `${input.pipelineId}:${engine}`,
              type: "engine" as const,
              label: engine,
            })),
            ...(input.conditionalBranches ?? []).map((branch) => ({
              id: `${input.pipelineId}:branch:${branch}`,
              type: "branch" as const,
              label: branch,
            })),
          ];

          const edges: PipelineGraphEdge[] = [];
          for (let i = 0; i < engines.length; i++) {
            const engineId = `${input.pipelineId}:${engines[i]}`;
            if (i === 0) {
              edges.push({
                from: input.pipelineId,
                to: engineId,
                kind: "next",
              });
            } else {
              edges.push({
                from: `${input.pipelineId}:${engines[i - 1]}`,
                to: engineId,
                kind: "next",
              });
            }
          }
          for (const dep of input.dependencies ?? []) {
            edges.push({
              from: dep,
              to: input.pipelineId,
              kind: "depends",
            });
          }
          for (const branch of input.conditionalBranches ?? []) {
            edges.push({
              from: input.pipelineId,
              to: `${input.pipelineId}:branch:${branch}`,
              kind: "branch",
            });
          }

          if ((input.failures ?? 0) > 0) {
            warnings.push(
              `Pipeline ${input.pipelineId} has ${input.failures} recorded failures.`
            );
          }

          pipelines.push({
            pipelineId: input.pipelineId,
            name: input.name ?? input.pipelineId,
            engines,
            executionOrder: engines,
            dependencies: [...(input.dependencies ?? [])],
            conditionalBranches: [...(input.conditionalBranches ?? [])],
            retries: input.retries ?? 0,
            failures: input.failures ?? 0,
            skippedRules: [...(input.skippedRules ?? [])],
            executedRules: [...(input.executedRules ?? [])],
            executionTimeline: [...(input.executionTimeline ?? [])],
            averageRuntimeMs: input.averageRuntimeMs ?? 0,
            graph: { nodes, edges },
          });
        } catch (err) {
          errors.push(
            `Failed inspecting pipeline ${input.pipelineId}: ${String(err)}`
          );
        }
      }
    } catch (err) {
      errors.push(`Pipeline inspection failed: ${String(err)}`);
    }

    return {
      pipelines,
      inspectedAt: new Date().toISOString(),
      warnings,
      errors,
    };
  }
}
