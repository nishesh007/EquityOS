/**
 * Security context for authorization requests (RBAC + ABAC-ready attributes).
 */

import type { SecurityModuleId, SecurityResourceType } from "./SecurityRegistry";

export type SecurityPermissionAction =
  | "read"
  | "write"
  | "execute"
  | "approve"
  | "export"
  | "configure"
  | "manage_policies"
  | "manage_versions"
  | "manage_security"
  | "manage_snapshots"
  | "view_audit_logs"
  | (string & {});

export interface SecuritySubject {
  subjectId: string;
  roles: string[];
  attributes?: Record<string, string | number | boolean>;
}

export interface SecurityResourceRef {
  resourceId?: string;
  type: SecurityResourceType;
  module: SecurityModuleId;
  sensitive?: boolean;
  requiresApproval?: boolean;
}

export interface SecurityContext {
  subject: SecuritySubject;
  action: SecurityPermissionAction;
  resource: SecurityResourceRef;
  /** ABAC-ready environmental attributes (time, network, etc.). */
  environment?: Record<string, string | number | boolean>;
  /** Optional approval token when dual-control / approval policy applies. */
  approvalToken?: string;
  requestId?: string;
  timestamp?: string;
}

export function createSecurityContext(
  input: SecurityContext
): SecurityContext {
  return {
    ...input,
    subject: {
      ...input.subject,
      roles: [...input.subject.roles],
      attributes: input.subject.attributes
        ? { ...input.subject.attributes }
        : undefined,
    },
    resource: { ...input.resource },
    environment: input.environment ? { ...input.environment } : undefined,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };
}
