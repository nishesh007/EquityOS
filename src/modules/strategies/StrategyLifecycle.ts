/**
 * Strategy Lifecycle state machine — Sprint 11B.3A.
 * Tracks Created → … → Completed → Disposed transitions.
 */

import { STRATEGY_LIFECYCLE_TRANSITIONS } from "./StrategyConstants";
import type {
  StrategyLifecycleSnapshot,
  StrategyLifecycleState,
} from "./StrategyTypes";

export class StrategyLifecycle {
  private state: StrategyLifecycleState = "Created";
  private readonly history: StrategyLifecycleState[] = ["Created"];
  private updatedAt: Date = new Date();

  constructor(private readonly strategyId: string) {}

  getState(): StrategyLifecycleState {
    return this.state;
  }

  getHistory(): readonly StrategyLifecycleState[] {
    return this.history;
  }

  snapshot(): StrategyLifecycleSnapshot {
    return {
      strategyId: this.strategyId,
      state: this.state,
      history: [...this.history],
      updatedAt: this.updatedAt,
    };
  }

  canTransition(next: StrategyLifecycleState): boolean {
    if (this.state === "Disposed") return false;
    return STRATEGY_LIFECYCLE_TRANSITIONS[this.state].includes(next);
  }

  /**
   * Advance lifecycle. Returns false if transition is illegal (never throws).
   */
  transition(next: StrategyLifecycleState): boolean {
    if (!this.canTransition(next)) {
      return false;
    }
    this.state = next;
    this.history.push(next);
    this.updatedAt = new Date();
    return true;
  }

  /**
   * Force dispose from any non-disposed state.
   */
  dispose(): boolean {
    if (this.state === "Disposed") return true;
    if (!this.canTransition("Disposed")) {
      // Allow emergency dispose even if not listed (Completed already allows it).
      this.state = "Disposed";
      this.history.push("Disposed");
      this.updatedAt = new Date();
      return true;
    }
    return this.transition("Disposed");
  }

  isTerminal(): boolean {
    return this.state === "Completed" || this.state === "Disposed";
  }

  reset(): void {
    this.state = "Created";
    this.history.length = 0;
    this.history.push("Created");
    this.updatedAt = new Date();
  }
}
