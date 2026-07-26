import type { ExperimentQueueItem } from "./types";

/** Mock experiment queue — no execution engine in Sprint 11C.1. */
export const MOCK_EXPERIMENT_QUEUE: readonly ExperimentQueueItem[] = [
  {
    id: "exp-001",
    name: "Swing MA Grid v3",
    strategy: "Swing Breakout",
    createdAt: "2026-07-24T09:12:00.000Z",
    status: "Completed",
    estimatedRuntime: "12 min",
    priority: "High",
  },
  {
    id: "exp-002",
    name: "Momentum RSI Sweep",
    strategy: "Momentum",
    createdAt: "2026-07-25T14:30:00.000Z",
    status: "Ready",
    estimatedRuntime: "8 min",
    priority: "Normal",
  },
  {
    id: "exp-003",
    name: "ORB Lookback Study",
    strategy: "Opening Range Breakout",
    createdAt: "2026-07-26T08:05:00.000Z",
    status: "Pending",
    estimatedRuntime: "18 min",
    priority: "High",
  },
  {
    id: "exp-004",
    name: "VWAP Band Calibration",
    strategy: "VWAP Reversal",
    createdAt: "2026-07-22T16:45:00.000Z",
    status: "Cancelled",
    estimatedRuntime: "6 min",
    priority: "Low",
  },
  {
    id: "exp-005",
    name: "Mean Reversion Risk Grid",
    strategy: "Mean Reversion",
    createdAt: "2026-07-26T11:20:00.000Z",
    status: "Pending",
    estimatedRuntime: "22 min",
    priority: "Normal",
  },
  {
    id: "exp-006",
    name: "Dividend Hold Window",
    strategy: "Dividend Strategy",
    createdAt: "2026-07-21T10:00:00.000Z",
    status: "Completed",
    estimatedRuntime: "9 min",
    priority: "Low",
  },
] as const;

export function createMockQueue(): ExperimentQueueItem[] {
  return MOCK_EXPERIMENT_QUEUE.map((item) => ({ ...item }));
}
