/**
 * Segment results provider — business / geographic segment earnings.
 */

import {
  EarningsNormalizer,
  type EarningsMetadata,
  type NormalizedSegmentResult,
  type RawEarningsInput,
} from "./EarningsNormalizer";

export interface SegmentLoadResult {
  segments: NormalizedSegmentResult[];
  errors: string[];
  warnings: string[];
}

export class SegmentResultsProvider {
  constructor(private readonly normalizer: EarningsNormalizer) {}

  load(
    rows: RawEarningsInput[] | null | undefined,
    defaults?: Partial<EarningsMetadata>
  ): SegmentLoadResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const segments: NormalizedSegmentResult[] = [];

    if (!rows || !Array.isArray(rows)) {
      errors.push("Missing segment results dataset");
      return { segments, errors, warnings };
    }

    for (let i = 0; i < rows.length; i += 1) {
      try {
        const row = rows[i];
        if (!row || typeof row !== "object") {
          warnings.push(`Skipping corrupt segment row at index ${i}`);
          continue;
        }
        segments.push(this.normalizer.normalizeSegment(row, defaults));
      } catch (err) {
        errors.push(`Failed to load segment row ${i}: ${String(err)}`);
      }
    }

    return { segments, errors, warnings };
  }
}
