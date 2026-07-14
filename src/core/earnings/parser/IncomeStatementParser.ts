/**
 * Income statement parser — maps vendor P&L payloads to institutional models.
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

export interface ParsedIncomeStatement {
  statementType: "income_statement";
  meta: FinancialPeriodMeta;
  values: NormalizedStatementValues;
  lines: NormalizedLineItem[];
  derived: DerivedFinancialFields;
  qualityFlags: ValueQualityFlag[];
  parserWarnings: string[];
  confidenceScore: number;
}

export class IncomeStatementParser {
  constructor(
    private readonly mapper: FinancialLineMapper,
    private readonly normalizer: FinancialNormalizer
  ) {}

  parse(
    raw: Record<string, unknown> | null | undefined,
    defaults?: Partial<FinancialPeriodMeta>
  ): ParsedIncomeStatement {
    const parserWarnings: string[] = [];
    const qualityFlags = new Set<ValueQualityFlag>();

    if (!raw || typeof raw !== "object") {
      parserWarnings.push("Missing or malformed income statement payload");
      qualityFlags.add("MissingData");
      const meta = this.normalizer.normalizeMeta({}, defaults);
      return {
        statementType: "income_statement",
        meta,
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
      const fromRows = this.mapper.mapRows(lineRows);
      const mapped = { ...fromRows, ...fromObject };

      if (Object.keys(mapped).length === 0) {
        parserWarnings.push("No recognizable income statement line items");
        qualityFlags.add("MissingData");
      }

      const { values, lines } = this.normalizer.normalizeMappedValues(mapped, meta);
      for (const line of lines) {
        for (const flag of line.flags) qualityFlags.add(flag);
      }

      const derived = computeDerivedFields(values);
      for (const [key, flag] of Object.entries(derived.quality)) {
        qualityFlags.add(flag);
        if (derived[key as keyof DerivedFinancialFields] !== undefined) {
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
              isPercentage: key.toLowerCase().includes("margin") ||
                key.toLowerCase().includes("conversion"),
            });
          }
        }
      }

      const present = lines.filter((l) => l.value !== null).length;
      const confidenceScore = Math.max(
        0,
        Math.min(100, present * 8 - parserWarnings.length * 10)
      );

      return {
        statementType: "income_statement",
        meta,
        values,
        lines,
        derived,
        qualityFlags: [...qualityFlags],
        parserWarnings,
        confidenceScore,
      };
    } catch (err) {
      parserWarnings.push(`Income parse error: ${String(err)}`);
      qualityFlags.add("MissingData");
      return {
        statementType: "income_statement",
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
