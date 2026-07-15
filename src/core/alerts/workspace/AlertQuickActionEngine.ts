/**
 * Alert Quick Action Engine — workspace toolbar actions (Sprint 9C.R7).
 */

import type { AlertCenter } from "../center/AlertCenter";
import type { AlertCenterActionId } from "../center/AlertCenterModels";
import { AlertFavoriteEngine } from "./AlertFavoriteEngine";

export type WorkspaceQuickActionId =
  | "pin"
  | "favorite"
  | "mark_read"
  | "resolve"
  | "archive"
  | "copy"
  | "open_research"
  | "open_company"
  | "open_opportunity";

const QUICK_TO_CENTER: Partial<
  Record<WorkspaceQuickActionId, AlertCenterActionId>
> = {
  pin: "pin",
  mark_read: "mark_read",
  resolve: "resolve",
  archive: "archive",
  copy: "copy",
  open_research: "open_research",
  open_company: "open_company",
  open_opportunity: "open_opportunity",
};

export class AlertQuickActionEngine {
  constructor(private readonly favorites: AlertFavoriteEngine) {}

  listActions(): WorkspaceQuickActionId[] {
    return [
      "pin",
      "favorite",
      "mark_read",
      "resolve",
      "archive",
      "copy",
      "open_research",
      "open_company",
      "open_opportunity",
    ];
  }

  perform(
    alertId: string,
    action: WorkspaceQuickActionId,
    center: AlertCenter,
    options?: { now?: Date }
  ): {
    ok: boolean;
    href: string;
    copyText: string;
    favorite: boolean;
    pinned: boolean;
  } {
    if (action === "favorite") {
      const dec = this.favorites.favorite(alertId);
      return {
        ok: true,
        href: "",
        copyText: "",
        favorite: dec.favorite,
        pinned: dec.pinned,
      };
    }

    const mapped = QUICK_TO_CENTER[action];
    if (!mapped) {
      return {
        ok: false,
        href: "",
        copyText: "",
        favorite: this.favorites.get(alertId).favorite,
        pinned: this.favorites.get(alertId).pinned,
      };
    }

    if (action === "pin") {
      this.favorites.pin(alertId);
    }

    const result = center.performAction(alertId, mapped, { now: options?.now });
    const dec = this.favorites.get(alertId);
    return {
      ok: result.ok,
      href: result.href,
      copyText: result.copyText,
      favorite: dec.favorite,
      pinned: dec.pinned || action === "pin",
    };
  }
}
