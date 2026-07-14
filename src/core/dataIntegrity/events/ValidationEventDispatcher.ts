/**
 * Dispatches events to subscribers with sequential/parallel/async/priority/buffered modes.
 * Subscriber failures never propagate to callers (validation engines keep running).
 */

import type {
  EventDispatchMode,
  ValidationEventConfiguration,
} from "./ValidationEventConfiguration";
import type { ValidationEvent } from "./ValidationEventTypes";
import type {
  ValidationEventSubscriber,
  ValidationSubscription,
} from "./ValidationEventSubscriber";
import type { ValidationEventMetrics } from "./ValidationEventMetrics";
import type { ValidationEventAuditLogger } from "./ValidationEventAuditLogger";

export interface DispatchResult {
  eventId: string;
  subscriberCount: number;
  failures: number;
  dispatchTimeMs: number;
  dropped: boolean;
}

interface QueuedEvent {
  event: ValidationEvent;
  enqueuedAt: number;
  priority: number;
}

export class ValidationEventDispatcher {
  private readonly queue: QueuedEvent[] = [];
  private flushing = false;

  constructor(
    private config: ValidationEventConfiguration,
    private readonly subscribers: ValidationEventSubscriber,
    private readonly metrics: ValidationEventMetrics,
    private readonly audit: ValidationEventAuditLogger
  ) {}

  updateConfig(config: ValidationEventConfiguration): void {
    this.config = config;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  async dispatch(event: ValidationEvent): Promise<DispatchResult> {
    const mode = this.config.dispatchMode;

    if (mode === "BUFFERED" || mode === "PRIORITY_QUEUE") {
      return this.enqueue(event, mode === "PRIORITY_QUEUE");
    }

    if (mode === "ASYNC") {
      // Fire-and-forget; still return optimistic result
      void this.deliver(event).catch(() => {
        /* never crash */
      });
      return {
        eventId: event.eventId,
        subscriberCount: this.subscribers.matching(event).length,
        failures: 0,
        dispatchTimeMs: 0,
        dropped: false,
      };
    }

    if (mode === "IMMEDIATE" || mode === "SEQUENTIAL" || mode === "PARALLEL") {
      return this.deliver(event, mode === "SEQUENTIAL");
    }

    return this.deliver(event);
  }

  /** Flush buffered / priority queue. */
  async flush(): Promise<DispatchResult[]> {
    if (this.flushing) return [];
    this.flushing = true;
    const results: DispatchResult[] = [];
    try {
      while (this.queue.length > 0) {
        const next = this.queue.shift()!;
        this.metrics.setQueueSize(this.queue.length);
        results.push(await this.deliver(next.event));
      }
    } finally {
      this.flushing = false;
    }
    return results;
  }

  private enqueue(
    event: ValidationEvent,
    priority: boolean
  ): DispatchResult {
    if (this.queue.length >= this.config.queueSize) {
      if (this.config.dropOnOverflow) {
        this.queue.shift();
        this.metrics.recordDrop();
        this.audit.append({
          timestamp: new Date().toISOString(),
          action: "OVERFLOW",
          eventId: event.eventId,
          eventType: event.eventType,
          message: "Queue overflow — dropped oldest event",
          engineVersion: this.config.engineVersion,
        });
      } else {
        this.metrics.recordDrop();
        return {
          eventId: event.eventId,
          subscriberCount: 0,
          failures: 0,
          dispatchTimeMs: 0,
          dropped: true,
        };
      }
    }

    const item: QueuedEvent = {
      event,
      enqueuedAt: Date.now(),
      priority: this.config.severityPriority[event.severity] ?? 0,
    };
    this.queue.push(item);
    if (priority) {
      this.queue.sort((a, b) => b.priority - a.priority);
    }
    this.metrics.setQueueSize(this.queue.length);

    // Auto-flush buffered queue when idle path — for PRIORITY_QUEUE flush on CRITICAL
    if (priority && event.severity === "CRITICAL") {
      void this.flush().catch(() => {
        /* never crash */
      });
    }

    return {
      eventId: event.eventId,
      subscriberCount: this.subscribers.matching(event).length,
      failures: 0,
      dispatchTimeMs: 0,
      dropped: false,
    };
  }

  private async deliver(
    event: ValidationEvent,
    sequential = false
  ): Promise<DispatchResult> {
    const started = Date.now();
    const matched = this.subscribers.matching(event);
    let failures = 0;

    const invoke = async (sub: ValidationSubscription) => {
      let attempt = 0;
      const maxAttempts = this.config.retryCount + 1;
      while (attempt < maxAttempts) {
        attempt += 1;
        try {
          await withTimeout(
            Promise.resolve(sub.handler(event)),
            this.config.timeoutMs
          );
          if (sub.once) {
            this.subscribers.unsubscribe(sub.id);
          }
          return;
        } catch {
          if (attempt >= maxAttempts) {
            failures += 1;
            this.audit.append({
              timestamp: new Date().toISOString(),
              action: "FAILURE",
              eventId: event.eventId,
              eventType: event.eventType,
              subscribers: 1,
              failures: 1,
              retries: attempt - 1,
              message: `Subscriber ${sub.id} failed after retries`,
              engineVersion: this.config.engineVersion,
            });
            return;
          }
          await sleep(this.config.retryDelayMs * attempt);
        }
      }
    };

    try {
      if (sequential) {
        for (const sub of matched) {
          await invoke(sub);
        }
      } else {
        await Promise.all(matched.map((sub) => invoke(sub)));
      }
    } catch {
      // Absolute safety net — never surface to validation engines
      failures += 1;
    }

    const dispatchTimeMs = Date.now() - started;
    this.metrics.recordDispatch(dispatchTimeMs, failures > 0);
    this.metrics.setSubscriberCount(this.subscribers.count());
    this.audit.append({
      timestamp: new Date().toISOString(),
      action: "DISPATCH",
      eventId: event.eventId,
      eventType: event.eventType,
      subscribers: matched.length,
      dispatchTimeMs,
      failures,
      engineVersion: this.config.engineVersion,
    });

    return {
      eventId: event.eventId,
      subscriberCount: matched.length,
      failures,
      dispatchTimeMs,
      dropped: false,
    };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Subscriber timed out after ${ms}ms`)),
      ms
    );
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
