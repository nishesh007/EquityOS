/**
 * License generator / validator — Sprint 12A.
 */

import { getPlan } from "./plans";
import type {
  LicenseRecord,
  LicenseStatus,
  PlanId,
  TrialDays,
} from "./types";
import { OFFLINE_GRACE_DAYS } from "./types";
import { addDays, createId, nowIso, randomToken } from "./utils";

function formatKey(raw: string): string {
  const clean = raw.replace(/[^A-F0-9]/gi, "").toUpperCase().slice(0, 20);
  const parts = clean.match(/.{1,4}/g) ?? ["0000"];
  return `EOS-${parts.join("-")}`;
}

export function generateLicenseKey(planId: PlanId): string {
  return formatKey(`${planId.toUpperCase()}${randomToken(12)}`);
}

export function createLicense(input: {
  userId: string;
  planId: PlanId;
  seats?: number;
  expiresAt?: string | null;
  metadata?: Record<string, string>;
}): LicenseRecord {
  const plan = getPlan(input.planId);
  const issuedAt = nowIso();
  const expiresAt = input.expiresAt ?? null;
  return {
    id: createId("lic"),
    licenseKey: generateLicenseKey(input.planId),
    userId: input.userId,
    planId: input.planId,
    status: "valid",
    issuedAt,
    expiresAt,
    graceEndsAt: expiresAt ? addDays(expiresAt, OFFLINE_GRACE_DAYS) : null,
    seats: input.seats ?? plan.limits.maxSeats,
    seatsUsed: 1,
    maxDevices: plan.limits.maxDevices,
    metadata: {
      issuedBy: "EquityOS License Engine",
      plan: plan.name,
      ...(input.metadata ?? {}),
    },
    revokedAt: null,
    transferToken: null,
  };
}

export function validateLicense(
  license: LicenseRecord,
  now = Date.now()
): { status: LicenseStatus; license: LicenseRecord; message: string } {
  if (license.status === "revoked" || license.revokedAt) {
    return {
      status: "revoked",
      license: { ...license, status: "revoked" },
      message: "License has been revoked.",
    };
  }

  if (!license.licenseKey.startsWith("EOS-") || license.licenseKey.length < 12) {
    return {
      status: "invalid",
      license: { ...license, status: "invalid" },
      message: "License key format is invalid.",
    };
  }

  if (license.expiresAt) {
    const exp = new Date(license.expiresAt).getTime();
    const grace = license.graceEndsAt
      ? new Date(license.graceEndsAt).getTime()
      : exp + OFFLINE_GRACE_DAYS * 86400000;

    if (now > grace) {
      return {
        status: "expired",
        license: { ...license, status: "expired" },
        message: "License expired and grace period ended.",
      };
    }
    if (now > exp) {
      return {
        status: "grace",
        license: { ...license, status: "grace" },
        message: "License expired — offline grace period active.",
      };
    }
  }

  if (license.transferToken) {
    return {
      status: "transfer_pending",
      license: { ...license, status: "transfer_pending" },
      message: "License transfer pending confirmation.",
    };
  }

  return {
    status: "valid",
    license: { ...license, status: "valid" },
    message: "License is valid.",
  };
}

export function revokeLicense(license: LicenseRecord): LicenseRecord {
  return {
    ...license,
    status: "revoked",
    revokedAt: nowIso(),
    transferToken: null,
  };
}

export function beginLicenseTransfer(license: LicenseRecord): LicenseRecord {
  return {
    ...license,
    status: "transfer_pending",
    transferToken: randomToken(12),
  };
}

export function completeLicenseTransfer(
  license: LicenseRecord,
  newUserId: string
): LicenseRecord {
  return {
    ...license,
    userId: newUserId,
    status: "valid",
    transferToken: null,
    metadata: {
      ...license.metadata,
      transferredAt: nowIso(),
    },
  };
}

export function assignSeat(
  license: LicenseRecord
): { license: LicenseRecord; ok: boolean; message: string } {
  if (license.seatsUsed >= license.seats) {
    return { license, ok: false, message: "No seats remaining." };
  }
  return {
    ok: true,
    message: "Seat assigned.",
    license: { ...license, seatsUsed: license.seatsUsed + 1 },
  };
}

export function releaseSeat(license: LicenseRecord): LicenseRecord {
  return {
    ...license,
    seatsUsed: Math.max(0, license.seatsUsed - 1),
  };
}

export function trialExpiry(fromIso: string, days: TrialDays): string {
  return addDays(fromIso, days);
}
