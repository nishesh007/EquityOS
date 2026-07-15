/**
 * Alert Lifecycle Manager — inbox lifecycle transitions (Sprint 9C.R5).
 */

import type {
  AlertLifecycleTimestamps,
  CenterAlert,
  CenterLifecycleStatus,
} from "./AlertCenterModels";

const ALLOWED: Record<CenterLifecycleStatus, ReadonlySet<CenterLifecycleStatus>> = {
  Generated: new Set(["New", "Unread", "Expired", "Deleted"]),
  New: new Set(["Unread", "Read", "Pinned", "Snoozed", "Resolved", "Archived", "Expired", "Deleted"]),
  Unread: new Set(["Read", "Pinned", "Snoozed", "Resolved", "Archived", "Expired", "Deleted", "New"]),
  Read: new Set(["Unread", "Acknowledged", "Pinned", "Snoozed", "Resolved", "Archived", "Expired", "Deleted"]),
  Acknowledged: new Set(["Pinned", "Snoozed", "Resolved", "Archived", "Unread", "Deleted"]),
  Pinned: new Set(["Read", "Acknowledged", "Snoozed", "Resolved", "Archived", "Unread", "Deleted"]),
  Snoozed: new Set(["Unread", "Read", "Pinned", "Resolved", "Archived", "Expired", "Deleted"]),
  Resolved: new Set(["Archived", "Deleted", "Unread"]),
  Archived: new Set(["Unread", "Deleted", "Resolved"]),
  Expired: new Set(["Archived", "Deleted"]),
  Deleted: new Set(["Archived", "Unread"]),
};

export function canTransitionCenter(
  from: CenterLifecycleStatus,
  to: CenterLifecycleStatus
): boolean {
  if (from === to) return true;
  return ALLOWED[from].has(to);
}

function stamp(
  timestamps: AlertLifecycleTimestamps,
  patch: Partial<AlertLifecycleTimestamps>
): AlertLifecycleTimestamps {
  return { ...timestamps, ...patch };
}

export class AlertLifecycleManager {
  transition(
    item: CenterAlert,
    to: CenterLifecycleStatus,
    options?: { snoozeUntil?: Date; now?: Date }
  ): CenterAlert {
    if (!canTransitionCenter(item.inboxStatus, to)) {
      return item;
    }
    const now = (options?.now ?? new Date()).toISOString();
    let timestamps = { ...item.timestamps };
    let read = item.read;
    let pinned = item.pinned;
    let snoozedUntil = item.snoozedUntil;

    switch (to) {
      case "New":
      case "Unread":
        read = false;
        if (!timestamps.firstSeen) {
          timestamps = stamp(timestamps, { firstSeen: now });
        }
        break;
      case "Read":
        read = true;
        timestamps = stamp(timestamps, {
          opened: timestamps.opened || now,
          firstSeen: timestamps.firstSeen || now,
        });
        break;
      case "Acknowledged":
        read = true;
        timestamps = stamp(timestamps, {
          acknowledged: now,
          opened: timestamps.opened || now,
        });
        break;
      case "Pinned":
        pinned = true;
        read = true;
        timestamps = stamp(timestamps, {
          opened: timestamps.opened || now,
        });
        break;
      case "Snoozed": {
        const until = options?.snoozeUntil ?? new Date(Date.now() + 3_600_000);
        snoozedUntil = until.toISOString();
        timestamps = stamp(timestamps, { snoozedUntil: snoozedUntil });
        break;
      }
      case "Resolved":
        read = true;
        timestamps = stamp(timestamps, { resolved: now });
        break;
      case "Archived":
        timestamps = stamp(timestamps, { archived: now });
        break;
      case "Expired":
        timestamps = stamp(timestamps, { expired: now });
        break;
      case "Deleted":
        timestamps = stamp(timestamps, { deleted: now });
        break;
      default:
        break;
    }

    if (to !== "Pinned") {
      // unpin when leaving pinned unless explicitly pinning
      if (item.inboxStatus === "Pinned" && to !== "Pinned") {
        pinned = to === "Pinned";
      }
    }

    return {
      ...item,
      inboxStatus: to,
      read,
      pinned: to === "Pinned" ? true : to === "Unread" || to === "New" ? pinned : pinned,
      snoozedUntil: to === "Snoozed" ? snoozedUntil : to === "Unread" || to === "Read" ? "" : snoozedUntil,
      timestamps,
    };
  }

  markRead(item: CenterAlert, now?: Date): CenterAlert {
    return this.transition(item, "Read", { now });
  }

  markUnread(item: CenterAlert, now?: Date): CenterAlert {
    return this.transition(item, "Unread", { now });
  }

  acknowledge(item: CenterAlert, now?: Date): CenterAlert {
    return this.transition(item, "Acknowledged", { now });
  }

  pin(item: CenterAlert, now?: Date): CenterAlert {
    return this.transition(item, "Pinned", { now });
  }

  unpin(item: CenterAlert, now?: Date): CenterAlert {
    const next = this.transition(item, "Read", { now });
    return { ...next, pinned: false };
  }

  snooze(item: CenterAlert, until: Date, now?: Date): CenterAlert {
    return this.transition(item, "Snoozed", { snoozeUntil: until, now });
  }

  resolve(item: CenterAlert, now?: Date): CenterAlert {
    return this.transition(item, "Resolved", { now });
  }

  archive(item: CenterAlert, now?: Date): CenterAlert {
    return this.transition(item, "Archived", { now });
  }

  expire(item: CenterAlert, now?: Date): CenterAlert {
    return this.transition(item, "Expired", { now });
  }

  softDelete(item: CenterAlert, now?: Date): CenterAlert {
    return this.transition(item, "Deleted", { now });
  }

  restore(item: CenterAlert, now?: Date): CenterAlert {
    const restored = this.transition(item, "Unread", { now });
    return {
      ...restored,
      pinned: false,
      snoozedUntil: "",
      timestamps: {
        ...restored.timestamps,
        archived: "",
        deleted: "",
        resolved: "",
        expired: "",
      },
    };
  }
}
