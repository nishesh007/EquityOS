/**
 * Alert Favorite Engine — favorites & pinned decorations (Sprint 9C.R7).
 */

import { safeAlertText } from "../AlertModels";
import {
  emptyDecoration,
  type WorkspaceAlertDecoration,
} from "./AlertWorkspaceModels";

export class AlertFavoriteEngine {
  private readonly decorations = new Map<string, WorkspaceAlertDecoration>();

  clear(): void {
    this.decorations.clear();
  }

  private ensure(alertId: string): WorkspaceAlertDecoration {
    const id = safeAlertText(alertId, "");
    const existing = this.decorations.get(id);
    if (existing) return { ...existing };
    const created = emptyDecoration(id);
    this.decorations.set(id, created);
    return { ...created };
  }

  private put(next: WorkspaceAlertDecoration): WorkspaceAlertDecoration {
    this.decorations.set(next.alertId, { ...next });
    return { ...next };
  }

  favorite(alertId: string): WorkspaceAlertDecoration {
    const cur = this.ensure(alertId);
    return this.put({ ...cur, favorite: true });
  }

  unfavorite(alertId: string): WorkspaceAlertDecoration {
    const cur = this.ensure(alertId);
    return this.put({ ...cur, favorite: false });
  }

  pin(alertId: string): WorkspaceAlertDecoration {
    const cur = this.ensure(alertId);
    return this.put({ ...cur, pinned: true, moveToTop: true });
  }

  unpin(alertId: string): WorkspaceAlertDecoration {
    const cur = this.ensure(alertId);
    return this.put({ ...cur, pinned: false, moveToTop: false });
  }

  highlight(alertId: string, color = ""): WorkspaceAlertDecoration {
    const cur = this.ensure(alertId);
    return this.put({
      ...cur,
      highlighted: true,
      color: safeAlertText(color, cur.color || "#C4A35A"),
    });
  }

  assignColor(alertId: string, color: string): WorkspaceAlertDecoration {
    const cur = this.ensure(alertId);
    return this.put({ ...cur, color: safeAlertText(color, "#C4A35A") });
  }

  setGroup(alertId: string, groupKey: string): WorkspaceAlertDecoration {
    const cur = this.ensure(alertId);
    return this.put({ ...cur, groupKey: safeAlertText(groupKey, "") });
  }

  get(alertId: string): WorkspaceAlertDecoration {
    return this.ensure(alertId);
  }

  listFavorites(): WorkspaceAlertDecoration[] {
    return [...this.decorations.values()]
      .filter((d) => d.favorite)
      .map((d) => ({ ...d }));
  }

  listPinned(): WorkspaceAlertDecoration[] {
    return [...this.decorations.values()]
      .filter((d) => d.pinned)
      .map((d) => ({ ...d }));
  }

  listAll(): WorkspaceAlertDecoration[] {
    return [...this.decorations.values()].map((d) => ({ ...d }));
  }
}
