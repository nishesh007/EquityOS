"use client";

/**
 * Ops stores + hooks — Sprint 12C.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth, useCurrentUser, useSubscription } from "@/lib/saas";
import {
  adminService,
  analyticsOpsService,
  auditService,
  backupService,
  featureFlagService,
  healthService,
  maintenanceService,
  monitoringService,
  notificationService,
  settingsService,
} from "./services";
import type {
  ApiHealthStats,
  AuditLogEntry,
  BackupRecord,
  FeatureFlag,
  MaintenanceState,
  MonitoringMetric,
  OpsAnalytics,
  OpsNotification,
  StructuredLogEntry,
  SystemHealthSnapshot,
  SystemSettings,
} from "./types";

interface OpsContextValue {
  hydrated: boolean;
  health: SystemHealthSnapshot | null;
  apiHealth: ApiHealthStats | null;
  metrics: MonitoringMetric[];
  logs: StructuredLogEntry[];
  audit: AuditLogEntry[];
  flags: FeatureFlag[];
  notifications: OpsNotification[];
  unreadCount: number;
  backups: BackupRecord[];
  maintenance: MaintenanceState;
  settings: SystemSettings;
  analytics: OpsAnalytics;
  refresh: () => void;
  isFlagEnabled: (key: string) => boolean;
  setMaintenance: (patch: Partial<MaintenanceState>) => Promise<boolean>;
  createBackup: (label: string) => Promise<boolean>;
  upsertFlag: (flag: FeatureFlag) => Promise<boolean>;
  emergencyDisableFlag: (key: string) => Promise<boolean>;
  markNotificationRead: (id: string) => void;
  pushNotification: (input: {
    kind: OpsNotification["kind"];
    title: string;
    body: string;
  }) => Promise<boolean>;
  updateSettings: (patch: Partial<SystemSettings>) => Promise<boolean>;
  recordAudit: (input: Parameters<typeof auditService.record>[0]) => void;
}

const OpsContext = createContext<OpsContextValue | null>(null);

export function OpsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { profile } = useCurrentUser();
  const { subscription } = useSubscription();
  const [hydrated, setHydrated] = useState(false);
  const [health, setHealth] = useState<SystemHealthSnapshot | null>(null);
  const [apiHealth, setApiHealth] = useState<ApiHealthStats | null>(null);
  const [metrics, setMetrics] = useState<MonitoringMetric[]>([]);
  const [logs, setLogs] = useState<StructuredLogEntry[]>([]);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [notifications, setNotifications] = useState<OpsNotification[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [maintenance, setMaintenanceState] = useState<MaintenanceState>(
    () => maintenanceService.get()
  );
  const [settings, setSettings] = useState<SystemSettings>(() =>
    settingsService.get()
  );
  const [analytics, setAnalytics] = useState<OpsAnalytics>(() =>
    analyticsOpsService.compute()
  );

  const refresh = useCallback(() => {
    monitoringService.refreshSynthetic();
    setHealth(healthService.snapshot());
    setApiHealth(healthService.api());
    setMetrics(monitoringService.metrics());
    setLogs(monitoringService.logs(80));
    setAudit(auditService.list());
    setFlags(featureFlagService.list());
    setNotifications(notificationService.list(profile?.id));
    setBackups(backupService.list());
    setMaintenanceState(maintenanceService.get());
    setSettings(settingsService.get());
    setAnalytics(analyticsOpsService.compute());
  }, [profile?.id]);

  useEffect(() => {
    refresh();
    setHydrated(true);
  }, [refresh, isAuthenticated]);

  const isFlagEnabled = useCallback(
    (key: string) =>
      featureFlagService.isEnabled(key, {
        userId: profile?.id,
        planId: subscription?.planId,
      }),
    [profile?.id, subscription?.planId]
  );

  const setMaintenance = useCallback(
    async (patch: Partial<MaintenanceState>) => {
      const res = maintenanceService.set(patch);
      if (!res.ok) return false;
      refresh();
      return true;
    },
    [refresh]
  );

  const createBackup = useCallback(
    async (label: string) => {
      const res = backupService.create(label, false);
      refresh();
      return res.ok;
    },
    [refresh]
  );

  const upsertFlag = useCallback(
    async (flag: FeatureFlag) => {
      const res = featureFlagService.upsert(flag);
      refresh();
      return res.ok;
    },
    [refresh]
  );

  const emergencyDisableFlag = useCallback(
    async (key: string) => {
      const res = featureFlagService.emergencyDisable(key);
      refresh();
      return res.ok;
    },
    [refresh]
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      notificationService.markRead(id);
      refresh();
    },
    [refresh]
  );

  const pushNotification = useCallback(
    async (input: {
      kind: OpsNotification["kind"];
      title: string;
      body: string;
    }) => {
      const res = notificationService.push(input);
      refresh();
      return res.ok;
    },
    [refresh]
  );

  const updateSettings = useCallback(
    async (patch: Partial<SystemSettings>) => {
      const res = settingsService.update(patch);
      refresh();
      return res.ok;
    },
    [refresh]
  );

  const recordAudit = useCallback(
    (input: Parameters<typeof auditService.record>[0]) => {
      auditService.record({
        ...input,
        actorUserId: input.actorUserId ?? profile?.id,
        actorEmail: input.actorEmail ?? profile?.email,
      });
      refresh();
    },
    [profile, refresh]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = useMemo<OpsContextValue>(
    () => ({
      hydrated,
      health,
      apiHealth,
      metrics,
      logs,
      audit,
      flags,
      notifications,
      unreadCount,
      backups,
      maintenance,
      settings,
      analytics,
      refresh,
      isFlagEnabled,
      setMaintenance,
      createBackup,
      upsertFlag,
      emergencyDisableFlag,
      markNotificationRead,
      pushNotification,
      updateSettings,
      recordAudit,
    }),
    [
      hydrated,
      health,
      apiHealth,
      metrics,
      logs,
      audit,
      flags,
      notifications,
      unreadCount,
      backups,
      maintenance,
      settings,
      analytics,
      refresh,
      isFlagEnabled,
      setMaintenance,
      createBackup,
      upsertFlag,
      emergencyDisableFlag,
      markNotificationRead,
      pushNotification,
      updateSettings,
      recordAudit,
    ]
  );

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

function useOpsContext(): OpsContextValue {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error("Ops hooks require OpsProvider");
  return ctx;
}

export function useAdmin() {
  const ctx = useOpsContext();
  return {
    hydrated: ctx.hydrated,
    analytics: ctx.analytics,
    settings: ctx.settings,
    updateSettings: ctx.updateSettings,
    refresh: ctx.refresh,
    recordAudit: ctx.recordAudit,
    search: adminService.search,
    listUsers: adminService.listUsers,
    licensePool: adminService.licensePool,
    forceLogout: adminService.forceLogout,
    suspendUser: adminService.suspendUser,
    reactivateUser: adminService.reactivateUser,
    setRole: adminService.setRole,
  };
}

export function useMonitoring() {
  const ctx = useOpsContext();
  return {
    metrics: ctx.metrics,
    logs: ctx.logs,
    apiHealth: ctx.apiHealth,
    refresh: ctx.refresh,
  };
}

export function useAudit() {
  const ctx = useOpsContext();
  return { audit: ctx.audit, recordAudit: ctx.recordAudit };
}

export function useNotifications() {
  const ctx = useOpsContext();
  return {
    notifications: ctx.notifications,
    unreadCount: ctx.unreadCount,
    markRead: ctx.markNotificationRead,
    push: ctx.pushNotification,
  };
}

export function useSystemHealth() {
  const ctx = useOpsContext();
  return {
    health: ctx.health,
    maintenance: ctx.maintenance,
    setMaintenance: ctx.setMaintenance,
    backups: ctx.backups,
    createBackup: ctx.createBackup,
    refresh: ctx.refresh,
  };
}

export function useFeatureFlags() {
  const ctx = useOpsContext();
  return {
    flags: ctx.flags,
    isEnabled: ctx.isFlagEnabled,
    upsertFlag: ctx.upsertFlag,
    emergencyDisable: ctx.emergencyDisableFlag,
  };
}
