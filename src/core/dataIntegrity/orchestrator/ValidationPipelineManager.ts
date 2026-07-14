/**
 * Predefined validation pipeline manager.
 */

import type {
  ValidationConfiguration,
  ValidationEngineId,
  ValidationPipelineId,
} from "./ValidationConfiguration";

export interface PipelineDefinition {
  id: ValidationPipelineId;
  name: string;
  description: string;
  engines: ValidationEngineId[];
}

export class ValidationPipelineManager {
  private readonly custom = new Map<string, PipelineDefinition>();

  constructor(private readonly config: ValidationConfiguration) {}

  listPipelines(): PipelineDefinition[] {
    const builtins: PipelineDefinition[] = Object.entries(
      this.config.pipelines
    ).map(([id, engines]) => ({
      id,
      name: id,
      description: `Built-in pipeline: ${id}`,
      engines: [...engines],
    }));
    return [...builtins, ...this.custom.values()];
  }

  getPipeline(id: ValidationPipelineId): PipelineDefinition | undefined {
    if (this.custom.has(id)) return this.custom.get(id);
    const engines = this.config.pipelines[id];
    if (!engines) return undefined;
    return {
      id,
      name: id,
      description: `Built-in pipeline: ${id}`,
      engines: [...engines],
    };
  }

  registerPipeline(
    definition: PipelineDefinition,
    options?: { force?: boolean }
  ): { registered: boolean; skipped: boolean } {
    if (this.custom.has(definition.id) && !options?.force) {
      return { registered: false, skipped: true };
    }
    // Also allow overriding builtins via custom map
    if (
      this.config.pipelines[definition.id] &&
      this.custom.has(definition.id) &&
      !options?.force
    ) {
      return { registered: false, skipped: true };
    }
    this.custom.set(definition.id, { ...definition });
    this.config.pipelines[definition.id] = [...definition.engines];
    return { registered: true, skipped: false };
  }

  resolveEngines(id: ValidationPipelineId): ValidationEngineId[] {
    return [...(this.getPipeline(id)?.engines ?? [])];
  }
}
