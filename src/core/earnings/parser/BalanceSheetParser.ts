/**
 * Balance sheet parser — assets, liabilities and equity.
 */

import type { ValueQualityFlag } from "./FinancialConfiguration";
import { FinancialLineMapper } from "./FinancialLineMapper";
import {
  FinancialNormalizer,
  type FinancialPeriodMeta,
  type NormalizedLineItem,
  type NormalizedStatementValues,
} from "./FinancialNormalizer";
import { computeDerivedFields, type DerivedFinancialFields } from "./FinancialMetrics";

export interface ParsedBalanceSheet {
  statementType: "balance_sheet";
  meta: FinancialPeriodMeta;
  values: NormalizedStatementValues;
  lines: NormalizedLineItem[];
  derived: DerivedFinancialFields;
  qualityFlags: ValueQualityFlag[];
  parserWarnings: string[];
  confidenceScore: number;
}

export class BalanceSheetParser {
  constructor(
    private readonly mapper: FinancialLineMapper,
    private readonly normalizer: FinancialNormalizer
  ) {}

  parse(
    raw: Record<string, unknown> | null | undefined,
    defaults?: Partial<FinancialPeriodMeta>
  ): ParsedBalanceSheet {
    const parserWarnings: string[] = [];
    const qualityFlags = new Set<ValueQualityFlag>();

    if (!raw || typeof raw !== "object") {
      parserWarnings.push("Missing or malformed balance sheet payload");
      qualityFlags.add("MissingData");
      return {
        statementType: "balance_sheet",
        meta: this.normalizer.normalizeMeta({}, defaults),
        values: {},
        lines: [],
        derived: { quality: {} },
        qualityFlags: [...qualityFlags],
        parserWarnings,
        confidenceScore: 0,
      };
    }

    try {
      const meta = this.normalizer.normalizeMeta(raw, defaults);
      const fromObject = this.mapper.mapObject(raw);
      const lineRows = Array.isArray(raw.lines)
        ? (raw.lines as Array<Record<string, unknown>>)
        : Array.isArray(raw.items)
          ? (raw.items as Array<Record<string, unknown>>)
          : [];
      const mapped = { ...this.mapper.mapRows(lineRows), ...fromObject };

      if (Object.keys(mapped).length === 0) {
        parserWarnings.push("No recognizable balance sheet line items");
        qualityFlags.add("MissingData");
      }

      const { values, lines } = this.normalizer.normalizeMappedValues(mapped, meta);

      // Derive total liabilities when only components present
      if (
        values.totalLiabilities == null &&
        (values.currentLiabilities != null || values.nonCurrentLiabilities != null)
      ) {
        values.totalLiabilities =
          (values.currentLiabilities ?? 0) + (values.nonCurrentLiabilities ?? 0);
        qualityFlags.add("DerivedValue");
        lines.push({
          key: "totalLiabilities",
          value: values.totalLiabilities,
          rawValue: null,
          unit: meta.unit,
          currency: meta.currency,
          quality: "DerivedValue",
          flags: ["DerivedValue"],
          isPercentage: false,
        });
      }

      if (
        values.netWorth == null &&
        (values.shareCapital != null || values.reserves != null)
      ) {
        values.netWorth = (values.shareCapital ?? 0) + (values.reserves ?? 0);
        qualityFlags.add("DerivedValue");
        lines.push({
          key: "netWorth",
          value: values.netWorth,
          rawValue: null,
          unit: meta.unit,
          currency: meta.currency,
          quality: "DerivedValue",
          flags: ["DerivedValue"],
          isPercentage: false,
        });
      }

      for (const line of lines) {
        for (const flag of line.flags) qualityFlags.add(flag);
      }

      const derived = computeDerivedFields(values);
      for (const [key, flag] of Object.entries(derived.quality)) {
        qualityFlags.add(flag);
        const derivedValue = derived[key as keyof DerivedFinancialFields];
        if (typeof derivedValue === "number" || derivedValue === null) {
          values[key] = derivedValue as number | null;
          lines.push({
            key,
            value: derivedValue as number | null,
            rawValue: null,
            unit: meta.unit,
            currency: meta.currency,
            quality: flag,
            flags: [flag],
            isPercentage: false,
          });
        }
      }

      const present = lines.filter((l) => l.value !== null).length;
      return {
        statementType: "balance_sheet",
        meta,
        values,
        lines,
        derived,
        qualityFlags: [...qualityFlags],
        parserWarnings,
        confidenceScore: Math.max(
          0,
          Math.min(100, present * 7 - parserWarnings.length * 10)
        ),
      };
    } catch (err) {
      parserWarnings.push(`Balance sheet parse error: ${String(err)}`);
      qualityFlags.add("MissingData");
      return {
        statementType: "balance_sheet",
        meta: this.normalizer.normalizeMeta({}, defaults),
        values: {},
        lines: [],
        derived: { quality: {} },
        qualityFlags: [...qualityFlags],
        parserWarnings,
        confidenceScore: 0,
      };
    }
  }
}
