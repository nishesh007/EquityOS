/**
 * Sprint 10C.1 — productivity barrel.
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
  searchNotifications,
  groupNotifications,
  unreadCount,
  markNotificationRead,
  markGroupRead,
  markAllNotificationsRead,
  pinNotification,
  dismissNotification,
  dismissGroup,
  clearNotifications,
  subscribeNotifications,
  seedDemoNotificationsIfEmpty,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  PRIORITY_LABELS,
  type AppNotification,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationStorage,
  type NotificationListFilter,
  type NotificationGroup,
} from "./notificationEngine";
export {
  recordActivity,
  getActivityFeed,
  searchActivity,
  clearActivityFeed,
  seedDemoActivityIfEmpty,
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_LABELS,
  type ActivityCategory,
  type ActivityEvent,
  type ActivityStorage,
} from "./activityFeed";
export { NotificationCenter } from "./NotificationCenter";
export { AICommandCenter } from "./AICommandCenter";
export { ProductivityPanel } from "./ProductivityPanel";
export { SmartEmptyState, type SmartEmptyStateProps, type EmptyStateAction } from "./SmartEmptyState";
export { ContextMenu, type ContextMenuItem, type ContextMenuProps } from "./ContextMenu";
export { FloatingActionMenu } from "./FloatingActionMenu";
