/**
 * Institutional Validation Event Bus — public exports (Prompt 9F.13).
 */

export {
  createEventId,
  defaultSeverityForType,
  BUILTIN_EVENT_TYPES,
} from "./ValidationEventTypes";

export type {
  ValidationEventSeverity,
  ValidationEventType,
  ValidationEvent,
  ValidationEventInput,
} from "./ValidationEventTypes";

export {
  DEFAULT_VALIDATION_EVENT_CONFIGURATION,
  resolveValidationEventConfiguration,
} from "./ValidationEventConfiguration";

export type {
  EventDispatchMode,
  ValidationEventConfiguration,
  ValidationEventConfigurationInput,
} from "./ValidationEventConfiguration";

export {
  normalizeEventFilters,
  eventMatchesFilters,
} from "./ValidationEventFilters";

export type { ValidationEventFilters } from "./ValidationEventFilters";

export { ValidationEventSubscriber } from "./ValidationEventSubscriber";
export type {
  ValidationEventHandler,
  ValidationSubscription,
  SubscribeOptions,
} from "./ValidationEventSubscriber";

export {
  registerEventType,
  getRegisteredEventTypes,
  isEventTypeRegistered,
  registerBuiltinEventTypes,
  resetEventTypeRegistrationState,
} from "./ValidationEventRegistry";

export type { RegisteredEventType } from "./ValidationEventRegistry";

export { ValidationEventEmitter } from "./ValidationEventEmitter";
export { ValidationEventHistory } from "./ValidationEventHistory";
export { ValidationEventReplay } from "./ValidationEventReplay";
export type {
  ReplayMode,
  ReplayRequest,
  ReplayResult,
} from "./ValidationEventReplay";

export { createEventSnapshotId } from "./ValidationEventSnapshot";
export type { ValidationEventSnapshot } from "./ValidationEventSnapshot";

export { ValidationEventMetrics } from "./ValidationEventMetrics";
export type {
  EventBusMetricsSnapshot,
  HealthStatus,
  EventBusHealth,
} from "./ValidationEventMetrics";

export { ValidationEventAuditLogger } from "./ValidationEventAuditLogger";
export type { EventBusAuditEntry } from "./ValidationEventAuditLogger";

export { ValidationEventDispatcher } from "./ValidationEventDispatcher";
export type { DispatchResult } from "./ValidationEventDispatcher";

export {
  ValidationEventBus,
  registerValidationEventBus,
  getValidationEventBus,
  resetValidationEventBus,
  publishEvent,
  subscribe,
  unsubscribe,
  getEventHistory,
  replayEvents,
  getEventMetrics,
  getEventHealth,
  safePublishEvent,
} from "./ValidationEventBus";

export type {
  PublishResult,
  EventBusRegistrationResult,
} from "./ValidationEventBus";
