import { describe, expect, it } from "vitest";
import { BackgroundTaskRegistry } from "@/lib/backtesting/tasks/registry";

describe("BackgroundTaskRegistry", () => {
  it("tracks progress and completes", () => {
    const registry = new BackgroundTaskRegistry();
    const { task } = registry.create({ label: "Export PDF" });
    expect(task.status).toBe("queued");
    registry.start(task.id);
    registry.setProgress(task.id, 40, "Building");
    expect(registry.get(task.id)?.progress).toBe(40);
    registry.complete(task.id, "Done");
    expect(registry.get(task.id)?.status).toBe("completed");
    expect(registry.get(task.id)?.progress).toBe(100);
  });

  it("supports graceful cancellation via AbortSignal", () => {
    const registry = new BackgroundTaskRegistry();
    const { task, signal } = registry.create({ label: "Long job" });
    registry.start(task.id);
    expect(signal.aborted).toBe(false);
    expect(registry.cancel(task.id)).toBe(true);
    expect(signal.aborted).toBe(true);
    expect(registry.get(task.id)?.status).toBe("cancelled");
  });
});
