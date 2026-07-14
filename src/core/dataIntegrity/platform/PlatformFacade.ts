/**
 * Institutional Validation Platform — public façade (Prompt 9F.32).
 * Pure orchestration: never mutates underlying validation engine logic.
 */

import {
  resolvePlatformConfiguration,
  type PlatformConfigurationInput,
} from "./PlatformConfiguration";
import { PlatformEngine } from "./PlatformEngine";
import type { PlatformBootstrapResult } from "./PlatformBootstrap";
import type { PlatformHealthReport } from "./PlatformHealth";
import type { PlatformStatus } from "./PlatformStatus";
import type { PlatformOperationalMetrics } from "./PlatformMetrics";
import type { PlatformSnapshot, PlatformSnapshotKind } from "./PlatformSnapshot";
import type { PlatformCertificationResult } from "./PlatformCertification";
import type { PlatformSummary } from "./PlatformSummary";
import type { PlatformIntegrityResult } from "./PlatformEngine";

let defaultEngine: PlatformEngine | null = null;
let platformRegistered = false;

export interface PlatformRegistrationResult {
  registered: boolean;
  skipped: boolean;
  enginesRegistered: number;
}

export function getValidationPlatform(
  options?: PlatformConfigurationInput
): PlatformEngine {
  if (!defaultEngine || options) {
    defaultEngine = new PlatformEngine(options);
  }
  return defaultEngine;
}

export function registerValidationPlatform(options?: {
  engine?: PlatformEngine;
  config?: PlatformConfigurationInput;
  force?: boolean;
}): PlatformRegistrationResult {
  if (platformRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      enginesRegistered: getValidationPlatform().getMetrics().enginesRegistered,
    };
  }

  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new PlatformEngine(options?.config);
  }

  const bootstrap = defaultEngine.initialize({ force: options?.force });
  platformRegistered = true;
  return {
    registered: true,
    skipped: false,
    enginesRegistered: bootstrap.registeredCount,
  };
}

export function resetValidationPlatform(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  platformRegistered = false;
}

/** Public API */

export function initializePlatform(options?: {
  force?: boolean;
  config?: PlatformConfigurationInput;
}): PlatformBootstrapResult {
  if (options?.config) {
    getValidationPlatform(options.config);
  } else {
    registerValidationPlatform();
  }
  return getValidationPlatform().initialize(options);
}

export function getPlatformStatus(): PlatformStatus {
  registerValidationPlatform();
  return getValidationPlatform().getStatus();
}

export function getPlatformHealth(): PlatformHealthReport {
  registerValidationPlatform();
  return getValidationPlatform().getHealth();
}

export function getPlatformMetrics(): PlatformOperationalMetrics {
  registerValidationPlatform();
  return getValidationPlatform().getMetrics();
}

export function createPlatformSnapshot(
  label?: string,
  kind?: PlatformSnapshotKind
): PlatformSnapshot {
  registerValidationPlatform();
  return getValidationPlatform().createSnapshot(label, kind);
}

export function runPlatformCertification(): PlatformCertificationResult {
  registerValidationPlatform();
  return getValidationPlatform().runCertification();
}

export function verifyPlatformIntegrity(): PlatformIntegrityResult {
  registerValidationPlatform();
  return getValidationPlatform().verifyIntegrity();
}

export function getPlatformSummary(): PlatformSummary {
  registerValidationPlatform();
  return getValidationPlatform().getSummary();
}

export {
  PlatformEngine,
  resolvePlatformConfiguration,
};
