/**
 * Subscriber registry and subscription handles for the Validation Event Bus.
 */

import type { ValidationEvent } from "./ValidationEventTypes";
import type { ValidationEventFilters } from "./ValidationEventFilters";
import { eventMatchesFilters } from "./ValidationEventFilters";

export type ValidationEventHandler = (
  event: ValidationEvent
) => void | Promise<void>;

export interface ValidationSubscription {
  id: string;
  handler: ValidationEventHandler;
  filters?: ValidationEventFilters;
  /** Wildcard (*) or specific event type. */
  eventType: string;
  once: boolean;
  module?: string;
  createdAt: string;
  active: boolean;
}

export interface SubscribeOptions {
  eventType?: string;
  filters?: ValidationEventFilters;
  once?: boolean;
  module?: string;
}

export class ValidationEventSubscriber {
  private readonly subscriptions = new Map<string, ValidationSubscription>();
  private seq = 0;

  subscribe(
    handler: ValidationEventHandler,
    options?: SubscribeOptions
  ): string {
    const id = `sub-${Date.now()}-${++this.seq}`;
    this.subscriptions.set(id, {
      id,
      handler,
      filters: options?.filters,
      eventType: options?.eventType ?? "*",
      once: options?.once ?? false,
      module: options?.module,
      createdAt: new Date().toISOString(),
      active: true,
    });
    return id;
  }

  unsubscribe(subscriptionId: string): boolean {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) return false;
    sub.active = false;
    return this.subscriptions.delete(subscriptionId);
  }

  get(subscriptionId: string): ValidationSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  list(): ValidationSubscription[] {
    return [...this.subscriptions.values()].map((s) => ({ ...s }));
  }

  count(): number {
    return this.subscriptions.size;
  }

  /** Active subscribers matching an event. */
  matching(event: ValidationEvent): ValidationSubscription[] {
    const matched: ValidationSubscription[] = [];
    for (const sub of this.subscriptions.values()) {
      if (!sub.active) continue;
      if (sub.eventType !== "*" && sub.eventType !== event.eventType) continue;
      if (sub.module && sub.module !== event.module) continue;
      if (!eventMatchesFilters(event, sub.filters)) continue;
      matched.push(sub);
    }
    return matched;
  }

  clear(): void {
    this.subscriptions.clear();
  }
}
