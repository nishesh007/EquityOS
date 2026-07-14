/**
 * Event type registry — discovers built-in and future custom event types.
 */

import {
  BUILTIN_EVENT_TYPES,
  type ValidationEventType,
} from "./ValidationEventTypes";

export interface RegisteredEventType {
  type: ValidationEventType;
  description?: string;
  builtin: boolean;
}

const registry = new Map<string, RegisteredEventType>();
let builtinsRegistered = false;

export function registerEventType(
  type: ValidationEventType,
  options?: { description?: string; force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (registry.has(type) && !options?.force) {
    return { registered: false, skipped: true };
  }
  registry.set(type, {
    type,
    description: options?.description,
    builtin: (BUILTIN_EVENT_TYPES as readonly string[]).includes(type),
  });
  return { registered: true, skipped: false };
}

export function getRegisteredEventTypes(): RegisteredEventType[] {
  return [...registry.values()].map((r) => ({ ...r }));
}

export function isEventTypeRegistered(type: string): boolean {
  return registry.has(type);
}

export function registerBuiltinEventTypes(options?: {
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  if (builtinsRegistered && !options?.force) {
    return {
      registered: 0,
      skipped: registry.size,
      total: registry.size,
    };
  }
  let added = 0;
  let skipped = 0;
  for (const type of BUILTIN_EVENT_TYPES) {
    const result = registerEventType(type, {
      description: `Built-in event: ${type}`,
      force: options?.force,
    });
    if (result.registered) added += 1;
    else skipped += 1;
  }
  builtinsRegistered = true;
  return { registered: added, skipped, total: registry.size };
}

export function resetEventTypeRegistrationState(): void {
  registry.clear();
  builtinsRegistered = false;
}
