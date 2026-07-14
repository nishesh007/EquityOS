/**
 * Validation workflow state machine.
 */

export type WorkflowState =
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TIMED_OUT";

const TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  PENDING: ["QUEUED", "RUNNING", "CANCELLED"],
  QUEUED: ["RUNNING", "CANCELLED"],
  RUNNING: ["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
  TIMED_OUT: [],
};

export class ValidationWorkflow {
  private state: WorkflowState = "PENDING";
  private readonly history: Array<{
    from: WorkflowState;
    to: WorkflowState;
    at: string;
  }> = [];

  getState(): WorkflowState {
    return this.state;
  }

  getHistory() {
    return [...this.history];
  }

  transition(to: WorkflowState): boolean {
    const allowed = TRANSITIONS[this.state] ?? [];
    if (!allowed.includes(to)) return false;
    this.history.push({
      from: this.state,
      to,
      at: new Date().toISOString(),
    });
    this.state = to;
    return true;
  }

  /** Force terminal state (e.g. cancel after completion attempt). */
  force(to: WorkflowState): void {
    if (this.state === to) return;
    this.history.push({
      from: this.state,
      to,
      at: new Date().toISOString(),
    });
    this.state = to;
  }

  isTerminal(): boolean {
    return (
      this.state === "COMPLETED" ||
      this.state === "FAILED" ||
      this.state === "CANCELLED" ||
      this.state === "TIMED_OUT"
    );
  }

  reset(): void {
    this.state = "PENDING";
    this.history.length = 0;
  }
}
