/**
 * Corporate announcement provider — normalizes exchange filings / announcements.
 */

import {
  EarningsNormalizer,
  type EarningsMetadata,
  type NormalizedAnnouncement,
  type RawEarningsInput,
} from "./EarningsNormalizer";

export interface AnnouncementLoadResult {
  announcements: NormalizedAnnouncement[];
  errors: string[];
  warnings: string[];
}

export class CorporateAnnouncementProvider {
  constructor(private readonly normalizer: EarningsNormalizer) {}

  load(
    rows: RawEarningsInput[] | null | undefined,
    defaults?: Partial<EarningsMetadata>
  ): AnnouncementLoadResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const announcements: NormalizedAnnouncement[] = [];

    if (!rows || !Array.isArray(rows)) {
      errors.push("Missing corporate announcements dataset");
      return { announcements, errors, warnings };
    }

    const seen = new Set<string>();
    for (let i = 0; i < rows.length; i += 1) {
      try {
        const row = rows[i];
        if (!row || typeof row !== "object") {
          warnings.push(`Skipping corrupt announcement at index ${i}`);
          continue;
        }
        const ann = this.normalizer.normalizeAnnouncement(row, defaults);
        const dedupeKey = `${ann.id}|${ann.date}|${ann.title}`;
        if (seen.has(dedupeKey)) {
          warnings.push(`Duplicate announcement skipped: ${ann.id}`);
          continue;
        }
        seen.add(dedupeKey);
        announcements.push(ann);
      } catch (err) {
        errors.push(`Failed to load announcement ${i}: ${String(err)}`);
      }
    }

    return { announcements, errors, warnings };
  }
}
