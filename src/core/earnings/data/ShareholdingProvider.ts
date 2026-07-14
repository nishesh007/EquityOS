/**
 * Shareholding pattern provider — promoter / FII / DII / public holdings.
 */

import {
  EarningsNormalizer,
  type EarningsMetadata,
  type NormalizedPeriodRecord,
  type RawEarningsInput,
} from "./EarningsNormalizer";

export interface ShareholdingLoadResult {
  records: NormalizedPeriodRecord[];
  errors: string[];
  warnings: string[];
}

export class ShareholdingProvider {
  constructor(private readonly normalizer: EarningsNormalizer) {}

  load(
    rows: RawEarningsInput[] | null | undefined,
    defaults?: Partial<EarningsMetadata>
  ): ShareholdingLoadResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const records: NormalizedPeriodRecord[] = [];

    if (!rows || !Array.isArray(rows)) {
      // Support single-object payloads
      if (rows && typeof rows === "object") {
        try {
          records.push(
            this.normalizer.normalizePeriod(
              rows as RawEarningsInput,
              "shareholding_pattern",
              defaults
            )
          );
          return { records, errors, warnings };
        } catch (err) {
          errors.push(`Failed to load shareholding: ${String(err)}`);
          return { records, errors, warnings };
        }
      }
      errors.push("Missing shareholding pattern dataset");
      return { records, errors, warnings };
    }

    for (let i = 0; i < rows.length; i += 1) {
      try {
        const row = rows[i];
        if (!row || typeof row !== "object") {
          warnings.push(`Skipping corrupt shareholding row at index ${i}`);
          continue;
        }
        records.push(
          this.normalizer.normalizePeriod(
            row,
            "shareholding_pattern",
            defaults
          )
        );
      } catch (err) {
        errors.push(`Failed to load shareholding row ${i}: ${String(err)}`);
      }
    }

    return { records, errors, warnings };
  }
}
