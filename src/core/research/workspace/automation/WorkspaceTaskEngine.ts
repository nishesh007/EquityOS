/**
 * Workspace task engine (Sprint 10A.R7).
 * Research checklist with priority, due dates, linked entities.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import {
  AUTOMATION_EMPTY,
  TASK_PRIORITIES,
  TASK_STATUSES,
  emptyTask,
  normalizeTask,
  type TaskPriority,
  type TasksView,
  type WorkspaceTask,
} from "./AutomationPresentationModels";

export interface CreateTaskInput {
  workspaceId: string;
  title: string;
  body?: string | null;
  priority?: TaskPriority | null;
  dueDate?: string | null;
  linkedTicker?: string | null;
  linkedResearch?: string | null;
  now?: Date | null;
}

const tasks = new Map<string, WorkspaceTask>();
let taskSeq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

export function createTask(input: CreateTaskInput): WorkspaceTask {
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  const title = safeWorkspaceText(input.title, "");
  if (!workspaceId || !title) return emptyTask(AUTOMATION_EMPTY.noTasks);

  taskSeq += 1;
  const task = normalizeTask({
    id: `task-${taskSeq}-${Date.now()}`,
    workspaceId,
    title,
    body: safeWorkspaceText(input.body, ""),
    status: "pending",
    priority: TASK_PRIORITIES.includes(input.priority as TaskPriority)
      ? (input.priority as TaskPriority)
      : "medium",
    dueDate: input.dueDate ?? null,
    linkedTicker: input.linkedTicker
      ? safeWorkspaceText(input.linkedTicker, "").toUpperCase()
      : null,
    linkedResearch: input.linkedResearch
      ? safeWorkspaceText(input.linkedResearch, "")
      : null,
    createdAt: stamp(input.now),
    completedAt: null,
    empty: false,
  });
  tasks.set(task.id, task);
  return task;
}

export function completeTask(id: string, now?: Date | null): WorkspaceTask {
  const key = safeWorkspaceText(id, "").toLowerCase();
  const existing = tasks.get(key);
  if (!existing || existing.empty) return emptyTask(AUTOMATION_EMPTY.noTasks);

  const task = normalizeTask({
    ...existing,
    status: "completed",
    completedAt: stamp(now),
    empty: false,
  });
  tasks.set(key, task);
  return task;
}

export function listTasks(options?: {
  workspaceId?: string | null;
  status?: "pending" | "completed" | null;
  linkedTicker?: string | null;
}): WorkspaceTask[] {
  const wid = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;
  const ticker = options?.linkedTicker
    ? safeWorkspaceText(options.linkedTicker, "").toUpperCase()
    : null;

  return Array.from(tasks.values()).filter((t) => {
    if (t.empty) return false;
    if (wid && t.workspaceId !== wid) return false;
    if (options?.status && t.status !== options.status) return false;
    if (ticker && t.linkedTicker !== ticker) return false;
    return true;
  });
}

export function getTasksView(options?: {
  workspaceId?: string | null;
}): TasksView {
  const all = listTasks(options);
  if (all.length === 0) {
    return {
      tasks: [],
      pending: [],
      completed: [],
      empty: true,
      emptyMessage: AUTOMATION_EMPTY.noTasks,
    };
  }
  const pending = all.filter((t) => t.status === "pending");
  const completed = all.filter((t) => t.status === "completed");
  return {
    tasks: all,
    pending,
    completed,
    empty: false,
    emptyMessage: AUTOMATION_EMPTY.awaitingWorkspace,
  };
}

export function resetWorkspaceTasks(): void {
  tasks.clear();
  taskSeq = 0;
}

export class WorkspaceTaskEngine {
  createTask = createTask;
  completeTask = completeTask;
  listTasks = listTasks;
  reset = resetWorkspaceTasks;
}
