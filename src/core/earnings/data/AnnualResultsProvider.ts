/**
 * Annual results provider — loads and normalizes annual earnings periods.
 */

import {
  EarningsNormalizer,
  type EarningsMetadata,
  type NormalizedPeriodRecord,
  type RawEarningsInput,
} from "./EarningsNormalizer";

export interface AnnualLoadResult {
  records: NormalizedPeriodRecord[];
  errors: string[];
  warnings: string[];
}

export class AnnualResultsProvider {
  constructor(private readonly normalizer: EarningsNormalizer) {}

  load(
    rows: RawEarningsInput[] | null | undefined,
    defaults?: Partial<EarningsMetadata>
  ): AnnualLoadResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const records: NormalizedPeriodRecord[] = [];

    if (!rows || !Array.isArray(rows)) {
      errors.push("Missing annual results dataset");
      return { records, errors, warnings };
    }

    for (let i = 0; i < rows.length; i += 1) {
      try {
        const row = rows[i];
        if (!row || typeof row !== "object") {
          warnings.push(`Skipping corrupt annual row at index ${i}`);
          continue;
        }
        records.push(
          this.normalizer.normalizePeriod(
            { ...row, periodType: "annual" },
            "annual_results",
            defaults
          )
        );
      } catch (err) {
        errors.push(`Failed to load annual row ${i}: ${String(err)}`);
      }
    }

    return { records, errors, warnings };
  }
}
