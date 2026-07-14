/**
 * Cash flow statement parser — operating / investing / financing.
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

export interface ParsedCashFlow {
  statementType: "cash_flow";
  meta: FinancialPeriodMeta;
  values: NormalizedStatementValues;
  lines: NormalizedLineItem[];
  derived: DerivedFinancialFields;
  qualityFlags: ValueQualityFlag[];
  parserWarnings: string[];
  confidenceScore: number;
}

export class CashFlowParser {
  constructor(
    private readonly mapper: FinancialLineMapper,
    private readonly normalizer: FinancialNormalizer
  ) {}

  parse(
    raw: Record<string, unknown> | null | undefined,
    defaults?: Partial<FinancialPeriodMeta>
  ): ParsedCashFlow {
    const parserWarnings: string[] = [];
    const qualityFlags = new Set<ValueQualityFlag>();

    if (!raw || typeof raw !== "object") {
      parserWarnings.push("Missing or malformed cash flow payload");
      qualityFlags.add("MissingData");
      return {
        statementType: "cash_flow",
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
        parserWarnings.push("No recognizable cash flow line items");
        qualityFlags.add("MissingData");
      }

      const { values, lines } = this.normalizer.normalizeMappedValues(mapped, meta);

      if (
        values.netCashChange == null &&
        values.operatingCashFlow != null &&
        values.investingCashFlow != null &&
        values.financingCashFlow != null
      ) {
        values.netCashChange =
          (values.operatingCashFlow ?? 0) +
          (values.investingCashFlow ?? 0) +
          (values.financingCashFlow ?? 0);
        qualityFlags.add("DerivedValue");
        lines.push({
          key: "netCashChange",
          value: values.netCashChange,
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

      // Include PAT if present for cash conversion ratios
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
            isPercentage:
              key.toLowerCase().includes("conversion") ||
              key.toLowerCase().includes("margin"),
          });
        }
      }

      const present = lines.filter((l) => l.value !== null).length;
      return {
        statementType: "cash_flow",
        meta,
        values,
        lines,
        derived,
        qualityFlags: [...qualityFlags],
        parserWarnings,
        confidenceScore: Math.max(
          0,
          Math.min(100, present * 8 - parserWarnings.length * 10)
        ),
      };
    } catch (err) {
      parserWarnings.push(`Cash flow parse error: ${String(err)}`);
      qualityFlags.add("MissingData");
      return {
        statementType: "cash_flow",
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
