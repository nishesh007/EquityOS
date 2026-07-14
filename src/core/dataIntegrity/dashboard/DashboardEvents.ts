/**
 * Dashboard event bus — emits monitoring lifecycle events.
 */

export type DashboardEventType =
  | "DashboardUpdated"
  | "SnapshotCreated"
  | "HealthChanged"
  | "CriticalFailureDetected"
  | "TrustChanged";

export interface DashboardEvent<T = unknown> {
  type: DashboardEventType;
  timestamp: string;
  payload: T;
}

export type DashboardEventListener = (event: DashboardEvent) => void;

export class DashboardEvents {
  private readonly listeners = new Map<
    DashboardEventType | "*",
    Set<DashboardEventListener>
  >();
  private readonly history: DashboardEvent[] = [];
  private maxHistory: number;

  constructor(maxHistory = 200) {
    this.maxHistory = maxHistory;
  }

  setMaxHistory(n: number): void {
    this.maxHistory = n;
  }

  on(
    type: DashboardEventType | "*",
    listener: DashboardEventListener
  ): () => void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
    return () => set.delete(listener);
  }

  emit<T>(type: DashboardEventType, payload: T): DashboardEvent<T> {
    const event: DashboardEvent<T> = {
      type,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory);
    }
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event as DashboardEvent);
    }
    for (const listener of this.listeners.get("*") ?? []) {
      listener(event as DashboardEvent);
    }
    return event;
  }

  getHistory(type?: DashboardEventType): DashboardEvent[] {
    if (!type) return [...this.history];
    return this.history.filter((e) => e.type === type);
  }

  reset(): void {
    this.history.length = 0;
    this.listeners.clear();
  }
}
