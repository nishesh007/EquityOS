/**
 * Sprint 11B.5 — Background task foundation (future-ready).
 * Presentation / orchestration only — no backtest calculation changes.
 */

export type BackgroundTaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface BackgroundTaskSnapshot {
  id: string;
  label: string;
  status: BackgroundTaskStatus;
  /** 0–100 */
  progress: number;
  createdAt: string;
  updatedAt: string;
  message?: string;
  error?: string;
  cancellable: boolean;
}

type Listener = (tasks: readonly BackgroundTaskSnapshot[]) => void;

interface InternalTask extends BackgroundTaskSnapshot {
  controller: AbortController | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toSnapshot(task: InternalTask): BackgroundTaskSnapshot {
  const { controller: _c, ...snap } = task;
  return snap;
}

/**
 * In-memory registry for long-running backtesting workflows (exports, future
 * batch jobs). Supports progress, graceful cancellation via AbortSignal,
 * and subscribe for UI progress indicators.
 */
export class BackgroundTaskRegistry {
  private tasks = new Map<string, InternalTask>();
  private listeners = new Set<Listener>();
  private seq = 0;

  create(input: {
    label: string;
    cancellable?: boolean;
  }): { task: BackgroundTaskSnapshot; signal: AbortSignal } {
    this.seq += 1;
    const id = `btask_${Date.now()}_${this.seq}`;
    const cancellable = input.cancellable ?? true;
    const controller = cancellable ? new AbortController() : null;
    const stamp = nowIso();
    const task: InternalTask = {
      id,
      label: input.label,
      status: "queued",
      progress: 0,
      createdAt: stamp,
      updatedAt: stamp,
      cancellable,
      controller,
    };
    this.tasks.set(id, task);
    this.emit();
    return {
      task: toSnapshot(task),
      signal: controller?.signal ?? new AbortController().signal,
    };
  }

  start(id: string, message?: string): void {
    const task = this.tasks.get(id);
    if (!task || task.status === "cancelled") return;
    task.status = "running";
    task.progress = Math.max(task.progress, 1);
    task.message = message;
    task.updatedAt = nowIso();
    this.emit();
  }

  setProgress(id: string, progress: number, message?: string): void {
    const task = this.tasks.get(id);
    if (!task || task.status === "cancelled" || task.status === "completed") {
      return;
    }
    task.status = "running";
    task.progress = Math.min(100, Math.max(0, progress));
    if (message != null) task.message = message;
    task.updatedAt = nowIso();
    this.emit();
  }

  complete(id: string, message?: string): void {
    const task = this.tasks.get(id);
    if (!task || task.status === "cancelled") return;
    task.status = "completed";
    task.progress = 100;
    task.message = message ?? task.message;
    task.updatedAt = nowIso();
    this.emit();
  }

  fail(id: string, error: string): void {
    const task = this.tasks.get(id);
    if (!task || task.status === "cancelled") return;
    task.status = "failed";
    task.error = error;
    task.message = error;
    task.updatedAt = nowIso();
    this.emit();
  }

  cancel(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || !task.cancellable) return false;
    if (
      task.status === "completed" ||
      task.status === "failed" ||
      task.status === "cancelled"
    ) {
      return false;
    }
    task.controller?.abort();
    task.status = "cancelled";
    task.message = "Cancelled";
    task.updatedAt = nowIso();
    this.emit();
    return true;
  }

  get(id: string): BackgroundTaskSnapshot | null {
    const task = this.tasks.get(id);
    return task ? toSnapshot(task) : null;
  }

  list(): BackgroundTaskSnapshot[] {
    return [...this.tasks.values()].map(toSnapshot);
  }

  clearFinished(): void {
    for (const [id, task] of this.tasks) {
      if (
        task.status === "completed" ||
        task.status === "failed" ||
        task.status === "cancelled"
      ) {
        this.tasks.delete(id);
      }
    }
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.list());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.list();
    for (const listener of this.listeners) listener(snapshot);
  }
}

/** Shared process-local registry for Historical Backtesting UI workflows. */
export const backtestingTaskRegistry = new BackgroundTaskRegistry();
