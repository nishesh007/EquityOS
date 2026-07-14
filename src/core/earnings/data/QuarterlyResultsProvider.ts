/**
 * Quarterly results provider — loads and normalizes quarterly earnings periods.
 */

import { EarningsNormalizer, type NormalizedPeriodRecord, type RawEarningsInput, type EarningsMetadata } from "./EarningsNormalizer";

export interface QuarterlyLoadResult {
  records: NormalizedPeriodRecord[];
  errors: string[];
  warnings: string[];
}

export class QuarterlyResultsProvider {
  constructor(private readonly normalizer: EarningsNormalizer) {}

  load(
    rows: RawEarningsInput[] | null | undefined,
    defaults?: Partial<EarningsMetadata>
  ): QuarterlyLoadResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const records: NormalizedPeriodRecord[] = [];

    if (!rows || !Array.isArray(rows)) {
      errors.push("Missing quarterly results dataset");
      return { records, errors, warnings };
    }

    for (let i = 0; i < rows.length; i += 1) {
      try {
        const row = rows[i];
        if (!row || typeof row !== "object") {
          warnings.push(`Skipping corrupt quarterly row at index ${i}`);
          continue;
        }
        const record = this.normalizer.normalizePeriod(
          { ...row, periodType: "quarter" },
          "quarterly_results",
          defaults
        );
        if (!record.quarter) {
          warnings.push(`Unknown quarter for row ${i}; retained with partial metadata`);
        }
        records.push(record);
      } catch (err) {
        errors.push(`Failed to load quarterly row ${i}: ${String(err)}`);
      }
    }

    return { records, errors, warnings };
  }
}
