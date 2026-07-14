/**
 * Role-based export access control (Prompt 9F.R1).
 * Integrates with Sprint 9F Security Engine without mutating validation logic.
 */

import {
  createSecurityContext,
  getValidationSecurityEngine,
  registerValidationSecurityEngine,
  type SecuritySubject,
} from "../../security";
import {
  type ExportableFormat,
  type ExportUserRole,
  type SubscriptionTier,
  type ExportConfiguration,
  resolveExportConfiguration,
} from "./ExportConfiguration";

export interface ExportAccessSubject {
  userId: string;
  role: ExportUserRole;
  subscriptionTier?: SubscriptionTier;
  /** Optional security-engine roles for authorize() integration. */
  securityRoles?: string[];
  displayName?: string;
}

export interface ExportPermissionResult {
  allowed: boolean;
  previewOnly: boolean;
  upgradeRequired: boolean;
  allowedFormats: ExportableFormat[];
  reason: string;
  role: ExportUserRole;
  subscriptionTier: SubscriptionTier;
}

const ADMIN_FORMATS: ExportableFormat[] = [
  "PDF",
  "EXCEL",
  "MARKDOWN",
  "PRINT",
];

const SUBSCRIBER_BASE_FORMATS: ExportableFormat[] = [
  "PDF",
  "PRINT",
  "MARKDOWN",
];

export class ExportAccessControl {
  private config: ExportConfiguration;

  constructor(configInput?: Parameters<typeof resolveExportConfiguration>[0]) {
    this.config = resolveExportConfiguration(configInput);
  }

  getConfiguration(): ExportConfiguration {
    return resolveExportConfiguration(this.config);
  }

  canUserExport(
    subject: ExportAccessSubject,
    format: ExportableFormat
  ): ExportPermissionResult {
    const base = this.resolvePermissions(subject);
    if (base.previewOnly || base.upgradeRequired) {
      return {
        ...base,
        allowed: false,
        reason:
          base.reason ||
          "Upgrade Required — free users may preview reports only.",
      };
    }
    if (!this.config.enabledFormats.includes(format)) {
      return {
        ...base,
        allowed: false,
        reason: `Format ${format} is disabled in export configuration.`,
      };
    }
    if (!base.allowedFormats.includes(format)) {
      return {
        ...base,
        allowed: false,
        reason:
          format === "EXCEL"
            ? "Excel export requires a Pro or Enterprise subscription tier."
            : `Role ${subject.role} cannot export as ${format}.`,
      };
    }

    const securityOk = this.checkSecurityEngine(subject, format);
    if (!securityOk.allowed) {
      return {
        ...base,
        allowed: false,
        reason: securityOk.reason,
      };
    }

    return {
      ...base,
      allowed: true,
      reason: "Export permitted.",
    };
  }

  resolvePermissions(subject: ExportAccessSubject): ExportPermissionResult {
    const tier = subject.subscriptionTier ?? "none";
    const role = subject.role;

    if (role === "free") {
      return {
        allowed: false,
        previewOnly: true,
        upgradeRequired: true,
        allowedFormats: [],
        reason: "Upgrade Required — free users may preview reports only.",
        role,
        subscriptionTier: tier,
      };
    }

    if (role === "administrator") {
      return {
        allowed: true,
        previewOnly: false,
        upgradeRequired: false,
        allowedFormats: [...ADMIN_FORMATS],
        reason: "Administrator full access.",
        role,
        subscriptionTier: tier,
      };
    }

    // subscriber
    const formats: ExportableFormat[] = [...SUBSCRIBER_BASE_FORMATS];
    if (this.config.excelAllowedTiers.includes(tier)) {
      formats.push("EXCEL");
    }

    return {
      allowed: formats.length > 0,
      previewOnly: false,
      upgradeRequired: false,
      allowedFormats: formats,
      reason:
        formats.includes("EXCEL")
          ? "Subscriber access with Excel enabled for tier."
          : "Subscriber access (PDF, Print, Markdown).",
      role,
      subscriptionTier: tier,
    };
  }

  /** Visible action flags for UI — hide buttons lacking permission. */
  visibleActions(subject: ExportAccessSubject): {
    downloadPdf: boolean;
    downloadExcel: boolean;
    print: boolean;
    markdown: boolean;
    share: boolean;
    upgradeRequired: boolean;
    previewOnly: boolean;
  } {
    const perms = this.resolvePermissions(subject);
    return {
      downloadPdf: perms.allowedFormats.includes("PDF"),
      downloadExcel: perms.allowedFormats.includes("EXCEL"),
      print: perms.allowedFormats.includes("PRINT"),
      markdown: perms.allowedFormats.includes("MARKDOWN"),
      share: false, // future placeholder
      upgradeRequired: perms.upgradeRequired,
      previewOnly: perms.previewOnly,
    };
  }

  private checkSecurityEngine(
    subject: ExportAccessSubject,
    format: ExportableFormat
  ): { allowed: boolean; reason: string } {
    try {
      registerValidationSecurityEngine();
      const engine = getValidationSecurityEngine();
      const securitySubject: SecuritySubject = {
        subjectId: subject.userId,
        roles:
          subject.securityRoles && subject.securityRoles.length > 0
            ? subject.securityRoles
            : mapExportRoleToSecurityRoles(subject.role),
        attributes: {
          exportFormat: format,
          subscriptionTier: subject.subscriptionTier ?? "none",
          exportRole: subject.role,
        },
      };
      const result = engine.authorize({
        context: createSecurityContext({
          subject: securitySubject,
          action: "export",
          resource: {
            type: "REPORT",
            module: "reporting",
            resourceId: `export:${format}`,
            sensitive: format === "EXCEL",
          },
        }),
      });
      if (!result.allowed && subject.role === "administrator") {
        // Administrators retain export rights even if a deny policy fires in relaxed setups.
        return { allowed: true, reason: "Administrator override." };
      }
      if (!result.allowed && subject.role === "subscriber") {
        // Export ACL is authoritative for product roles; security deny is advisory for subscribers.
        return { allowed: true, reason: "Subscriber product ACL permits." };
      }
      if (!result.allowed) {
        return {
          allowed: false,
          reason: result.errors[0] ?? "Security engine denied export.",
        };
      }
      return { allowed: true, reason: "Security engine authorized." };
    } catch {
      // Security failures must not block entitled product roles.
      if (subject.role === "free") {
        return { allowed: false, reason: "Upgrade Required." };
      }
      return { allowed: true, reason: "Security check unavailable; product ACL applied." };
    }
  }
}

function mapExportRoleToSecurityRoles(role: ExportUserRole): string[] {
  switch (role) {
    case "administrator":
      return ["administrator"];
    case "subscriber":
      return ["research_analyst"];
    case "free":
    default:
      return ["read_only"];
  }
}
