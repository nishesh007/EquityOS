/**
 * Sprint 12C — Ops / admin public API.
 */

export type * from "./types";
export { collectSystemHealth } from "./health";
export { createAuditEntry, filterAudit } from "./audit";
export { evaluateFlag } from "./feature-flags";
export { renderEmailTemplate, listEmailTemplates } from "./email-templates";
export { applySecurityHeaders } from "./security-headers";
export { computeOpsAnalytics, computeApiHealth } from "./analytics";
export {
  createBackupRecord,
  completeBackup,
  failBackup,
  applyRetention,
} from "./backup";
export {
  auditToCsv,
  healthToCsv,
  downloadText,
  buildSystemReportText,
} from "./reporting";
export {
  emptyOpsState,
  resetOpsMemory,
  loadOpsState,
  saveOpsState,
} from "./persistence";
export {
  adminService,
  healthService,
  auditService,
  monitoringService,
  featureFlagService,
  notificationService,
  emailService,
  backupService,
  maintenanceService,
  deploymentService,
  settingsService,
  analyticsOpsService,
} from "./services";
export {
  OpsProvider,
  useAdmin,
  useMonitoring,
  useAudit,
  useNotifications,
  useSystemHealth,
  useFeatureFlags,
} from "./context";
