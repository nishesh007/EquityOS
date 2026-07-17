/**
 * Sprint 10C.R7 — productivity barrel.
 */

export {
  recordRecent,
  getRecents,
  clearRecents,
  toggleFavorite,
  isFavorite,
  getFavorites,
  type RecentItem,
  type RecentKind,
  type FavoriteItem,
  type ProductivityStorage,
} from "./recentItems";
export {
  pushNotification,
  listNotifications,
  unreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  pinNotification,
  dismissNotification,
  clearNotifications,
  subscribeNotifications,
  NOTIFICATION_CATEGORIES,
  type AppNotification,
  type NotificationCategory,
  type NotificationStorage,
} from "./notificationEngine";
export {
  recordActivity,
  getActivityFeed,
  clearActivityFeed,
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  type ActivityCategory,
  type ActivityEvent,
  type ActivityStorage,
} from "./activityFeed";
export { NotificationCenter } from "./NotificationCenter";
export { SmartEmptyState, type SmartEmptyStateProps, type EmptyStateAction } from "./SmartEmptyState";
export { ContextMenu, type ContextMenuItem, type ContextMenuProps } from "./ContextMenu";
export { FloatingActionMenu } from "./FloatingActionMenu";
