/**
 * Extensible read-only fact registry for knowledge graph construction.
 */

import type { KnowledgeNode } from "./KnowledgeNode";
import type { KnowledgeEdge } from "./KnowledgeEdge";

export type KnowledgeSourceId =
  | "orchestrator"
  | "ruleEngine"
  | "admin"
  | "compliance"
  | "analytics"
  | "reporting"
  | "diagnostics"
  | "optimization"
  | "reliability"
  | "observability"
  | "intelligence"
  | "trust"
  | "eventBus"
  | "dashboard"
  | (string & {});

export interface KnowledgeFactBundle {
  sourceId: KnowledgeSourceId;
  nodes: KnowledgeNode[];
  edges: Array<Omit<KnowledgeEdge, "edgeId" | "createdAt"> & {
    edgeId?: string;
    createdAt?: string;
  }>;
}

export type KnowledgeCollector = () => KnowledgeFactBundle;

export interface KnowledgeSourceDefinition {
  id: KnowledgeSourceId;
  name: string;
  description?: string;
  collect: KnowledgeCollector;
}

const sources = new Map<string, KnowledgeSourceDefinition>();
let builtinsRegistered = false;

export function registerKnowledgeSource(
  definition: KnowledgeSourceDefinition,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (sources.has(definition.id) && !options?.force) {
    return { registered: false, skipped: true };
  }
  sources.set(definition.id, { ...definition });
  return { registered: true, skipped: false };
}

export function getRegisteredKnowledgeSources(): KnowledgeSourceDefinition[] {
  return [...sources.values()].map((s) => ({ ...s }));
}

export function collectAllKnowledgeFacts(): KnowledgeFactBundle[] {
  const out: KnowledgeFactBundle[] = [];
  for (const source of sources.values()) {
    try {
      out.push(source.collect());
    } catch {
      // Read-only collectors must never break knowledge graph
    }
  }
  return out;
}

export function resetKnowledgeSourceRegistrationState(): void {
  sources.clear();
  builtinsRegistered = false;
}

export function areBuiltinKnowledgeSourcesRegistered(): boolean {
  return builtinsRegistered;
}

export function markBuiltinKnowledgeSourcesRegistered(): void {
  builtinsRegistered = true;
}
