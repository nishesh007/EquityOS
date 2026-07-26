/**
 * Sprint 12C — Production operations & enterprise admin types.
 */

export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

export type AuditAction =
  | "user.login"
  | "user.logout"
  | "user.password_change"
  | "user.profile_update"
  | "subscription.change"
  | "license.assign"
  | "license.revoke"
  | "license.transfer"
  | "role.change"
  | "permission.change"
  | "invoice.download"
  | "report.export"
  | "research.generate"
  | "backtest.execute"
  | "optimization.execute"
  | "paper_trading.action"
  | "admin.action"
  | "feature_flag.change"
  | "maintenance.toggle"
  | "backup.create"
  | "notification.send";

export type NotificationKind =
  | "system"
  | "billing"
  | "trial_expiry"
  | "license_expiry"
  | "payment_failure"
  | "subscription_renewal"
  | "maintenance"
  | "feature_release"
  | "security";

export type EmailTemplateId =
  | "welcome"
  | "verify_email"
  | "password_reset"
  | "trial_started"
  | "trial_expiring"
  | "subscription_activated"
  | "subscription_renewed"
  | "subscription_cancelled"
  | "payment_failed"
  | "invoice_generated"
  | "license_assigned"
  | "research_shared";

export type FeatureFlagScope = "global" | "user" | "plan" | "beta" | "canary";

export type BackupStatus = "pending" | "running" | "completed" | "failed";

export interface ComponentHealth {
  id: string;
  label: string;
  status: HealthStatus;
  latencyMs: number | null;
  message: string;
  checkedAt: string;
}

export interface SystemHealthSnapshot {
  overall: HealthStatus;
  environment: "development" | "staging" | "production";
  buildVersion: string;
  deploymentVersion: string;
  lastDeploymentAt: string;
  memoryUsagePct: number;
  cpuUsagePct: number;
  diskUsagePct: number;
  components: ComponentHealth[];
}

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actorUserId: string | null;
  actorEmail: string | null;
  targetId: string | null;
  summary: string;
  metadata: Record<string, string>;
  ip: string | null;
  createdAt: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  description: string;
  enabled: boolean;
  scope: FeatureFlagScope;
  rolloutPercent: number;
  planIds: string[];
  userIds: string[];
  emergencyDisabled: boolean;
  updatedAt: string;
}

export interface OpsNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  userId: string | null;
  read: boolean;
  createdAt: string;
  expiresAt: string | null;
}

export interface EmailOutboxItem {
  id: string;
  templateId: EmailTemplateId;
  to: string;
  subject: string;
  body: string;
  status: "queued" | "sent" | "failed";
  createdAt: string;
  error: string | null;
}

export interface BackupRecord {
  id: string;
  label: string;
  status: BackupStatus;
  sizeBytes: number;
  retentionDays: number;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
  scheduled: boolean;
}

export interface MaintenanceState {
  enabled: boolean;
  message: string;
  estimatedCompletionAt: string | null;
  allowAdminLogin: boolean;
  whitelistUserIds: string[];
  updatedAt: string;
}

export interface SystemSettings {
  companyName: string;
  logoUrl: string | null;
  supportEmail: string;
  supportUrl: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  cookiePolicyUrl: string;
  timezone: string;
  defaultCurrency: "INR" | "USD";
  updatedAt: string;
}

export interface MonitoringMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trendPct: number;
  updatedAt: string;
}

export interface ApiHealthStats {
  latencyMs: number;
  availabilityPct: number;
  errorRatePct: number;
  successRatePct: number;
  requestVolume: number;
  webhookHealthy: boolean;
}

export interface OpsAnalytics {
  dau: number;
  mau: number;
  activeSessions: number;
  subscriberGrowthPct: number;
  revenueTrendPct: number;
  planDistribution: Record<string, number>;
  licenseUtilizationPct: number;
  researchUsage: number;
  aiUsage: number;
  featureAdoption: Record<string, number>;
}

export interface StructuredLogEntry {
  id: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  service: string;
  context: Record<string, unknown>;
  createdAt: string;
}

export interface OpsPersistedState {
  version: 1;
  audit: AuditLogEntry[];
  flags: FeatureFlag[];
  notifications: OpsNotification[];
  emailOutbox: EmailOutboxItem[];
  backups: BackupRecord[];
  maintenance: MaintenanceState;
  settings: SystemSettings;
  metrics: MonitoringMetric[];
  logs: StructuredLogEntry[];
  deployment: {
    buildVersion: string;
    deploymentVersion: string;
    lastDeploymentAt: string;
    environment: SystemHealthSnapshot["environment"];
  };
}

export const OPS_STORAGE_KEY = "equityos.ops.platform.v1";
export const PACKAGE_VERSION = "0.1.0";
