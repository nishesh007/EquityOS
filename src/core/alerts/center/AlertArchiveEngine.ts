/**
 * Alert Archive Engine — archive / restore / soft-delete (Sprint 9C.R5).
 */

import { AlertLifecycleManager } from "./AlertLifecycleManager";
import type { CenterAlert } from "./AlertCenterModels";

export class AlertArchiveEngine {
  private readonly lifecycle = new AlertLifecycleManager();

  archive(item: CenterAlert, now?: Date): CenterAlert {
    return this.lifecycle.archive(item, now);
  }

  restore(item: CenterAlert, now?: Date): CenterAlert {
    return this.lifecycle.restore(item, now);
  }

  softDelete(item: CenterAlert, now?: Date): CenterAlert {
    return this.lifecycle.softDelete(item, now);
  }

  listArchived(items: readonly CenterAlert[]): CenterAlert[] {
    return items.filter((i) => i.inboxStatus === "Archived");
  }

  listDeleted(items: readonly CenterAlert[]): CenterAlert[] {
    return items.filter((i) => i.inboxStatus === "Deleted");
  }
}
