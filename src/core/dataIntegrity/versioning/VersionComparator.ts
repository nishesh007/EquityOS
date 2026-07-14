/**
 * Semantic / structural version comparator.
 */

import type { VersionConfiguration } from "./VersionConfiguration";
import { compareSemver } from "./VersionManager";
import type { VersionRecord } from "./VersionRegistry";
import { parseSemanticVersion } from "./VersionRegistry";

export type VersionComparisonKind =
  | "ENGINE"
  | "CONFIGURATION"
  | "POLICY"
  | "SCHEMA"
  | "MODULE"
  | "RULE"
  | "SNAPSHOT"
  | "MIGRATION_PLAN";

export interface VersionComparisonResult {
  kind: VersionComparisonKind;
  leftId: string;
  rightId: string;
  leftVersion: string;
  rightVersion: string;
  equal: boolean;
  leftNewer: boolean;
  majorDelta: number;
  minorDelta: number;
  patchDelta: number;
  breakingLikely: boolean;
  differences: string[];
  warnings: string[];
  errors: string[];
}

export class VersionComparator {
  constructor(private config: VersionConfiguration) {}

  setConfiguration(config: VersionConfiguration): void {
    this.config = config;
  }

  compareRecords(
    left: VersionRecord,
    right: VersionRecord,
    kind: VersionComparisonKind = "ENGINE"
  ): VersionComparisonResult {
    return this.compareParsed(
      kind,
      left.versionId,
      right.versionId,
      left.version.raw,
      right.version.raw,
      left,
      right
    );
  }

  compareVersions(
    kind: VersionComparisonKind,
    leftId: string,
    rightId: string,
    leftVersion: string,
    rightVersion: string
  ): VersionComparisonResult {
    return this.compareParsed(
      kind,
      leftId,
      rightId,
      leftVersion,
      rightVersion
    );
  }

  private compareParsed(
    kind: VersionComparisonKind,
    leftId: string,
    rightId: string,
    leftVersion: string,
    rightVersion: string,
    leftRecord?: VersionRecord,
    rightRecord?: VersionRecord
  ): VersionComparisonResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const differences: string[] = [];

    try {
      const left = parseSemanticVersion(leftVersion);
      const right = parseSemanticVersion(rightVersion);
      if (!left || !right) {
        errors.push("One or both versions are not valid semantic versions.");
        return {
          kind,
          leftId,
          rightId,
          leftVersion,
          rightVersion,
          equal: false,
          leftNewer: false,
          majorDelta: 0,
          minorDelta: 0,
          patchDelta: 0,
          breakingLikely: true,
          differences: ["unparseable"],
          warnings,
          errors,
        };
      }

      const cmp = compareSemver(left, right);
      const majorDelta = left.major - right.major;
      const minorDelta = left.minor - right.minor;
      const patchDelta = left.patch - right.patch;

      if (cmp !== 0) differences.push(`version ${left.raw} vs ${right.raw}`);
      if (leftRecord?.schemaVersion !== rightRecord?.schemaVersion) {
        differences.push(
          `schema ${leftRecord?.schemaVersion ?? "?"} vs ${rightRecord?.schemaVersion ?? "?"}`
        );
      }
      if (Boolean(leftRecord?.deprecated) !== Boolean(rightRecord?.deprecated)) {
        differences.push("deprecation flag differs");
      }
      if (leftRecord?.breaking || rightRecord?.breaking) {
        differences.push("breaking flag present");
      }

      const breakingLikely =
        Math.abs(majorDelta) > 0 ||
        Boolean(leftRecord?.breaking) ||
        Boolean(rightRecord?.breaking);

      if (
        breakingLikely &&
        this.config.compatibilityStrictness === "strict"
      ) {
        warnings.push("Major or breaking version delta detected under strict compatibility.");
      }

      return {
        kind,
        leftId,
        rightId,
        leftVersion: left.raw,
        rightVersion: right.raw,
        equal: cmp === 0 && differences.length === 0,
        leftNewer: cmp > 0,
        majorDelta,
        minorDelta,
        patchDelta,
        breakingLikely,
        differences,
        warnings,
        errors,
      };
    } catch (err) {
      errors.push(`compareVersions failed: ${String(err)}`);
      return {
        kind,
        leftId,
        rightId,
        leftVersion,
        rightVersion,
        equal: false,
        leftNewer: false,
        majorDelta: 0,
        minorDelta: 0,
        patchDelta: 0,
        breakingLikely: true,
        differences: [],
        warnings,
        errors,
      };
    }
  }
}
