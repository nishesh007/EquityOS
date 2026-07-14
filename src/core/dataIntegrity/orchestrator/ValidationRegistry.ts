/**
 * Extensible registry of validation engines for the orchestrator.
 * Future modules register here without changing orchestrator internals.
 */

import type { ValidationEngineId } from "./ValidationConfiguration";
import type { ValidationContext } from "./ValidationContext";
import type { EngineRunResult } from "./ValidationContext";

export type ValidationEngineHandler = (
  ctx: ValidationContext
) => Promise<EngineRunResult>;

export interface ValidationEngineDefinition {
  id: ValidationEngineId;
  name: string;
  description?: string;
  version?: string;
  /** Soft dependencies (resolved by execution planner). */
  dependsOn?: ValidationEngineId[];
  handler: ValidationEngineHandler;
  /** Optional capability tags for discovery. */
  tags?: string[];
}

const engines = new Map<string, ValidationEngineDefinition>();
let builtinsRegistered = false;

export function registerValidationEngine(
  definition: ValidationEngineDefinition,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (engines.has(definition.id) && !options?.force) {
    return { registered: false, skipped: true };
  }
  engines.set(definition.id, { ...definition });
  return { registered: true, skipped: false };
}

export function getRegisteredValidationEngines(): ValidationEngineDefinition[] {
  return [...engines.values()].map((e) => ({ ...e }));
}

export function getValidationEngine(
  id: ValidationEngineId
): ValidationEngineDefinition | undefined {
  const found = engines.get(id);
  return found ? { ...found } : undefined;
}

export function discoverValidationEngines(
  tag?: string
): ValidationEngineDefinition[] {
  const all = getRegisteredValidationEngines();
  if (!tag) return all;
  return all.filter((e) => e.tags?.includes(tag));
}

export function resetValidationEngineRegistrationState(): void {
  engines.clear();
  builtinsRegistered = false;
}

export function areBuiltinValidationEnginesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinValidationEnginesRegistered(): void {
  builtinsRegistered = true;
}
