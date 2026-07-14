/**
 * Institutional Financial Statement Parser — façade (Sprint 9B.2).
 * Converts raw vendor statements into standardized institutional models.
 * Does not modify the Earnings Data Engine.
 */

import {
  DEFAULT_FINANCIAL_CONFIGURATION,
  resolveFinancialConfiguration,
  type FinancialConfiguration,
  type FinancialConfigurationInput,
  type ValueQualityFlag,
} from "./FinancialConfiguration";
import {
  listFinancialLines,
  listFinancialStatements,
  registerBuiltinFinancialCatalog,
  resetFinancialRegistry,
} from "./FinancialRegistry";
import { FinancialLineMapper } from "./FinancialLineMapper";
import {
  FinancialNormalizer,
  type FinancialPeriodMeta,
} from "./FinancialNormalizer";
import {
  FinancialValidator,
  type FinancialValidationResult,
} from "./FinancialValidator";
import {
  FinancialMetricsTracker,
  type FinancialOperationalMetrics,
} from "./FinancialMetrics";
import {
  IncomeStatementParser,
  type ParsedIncomeStatement,
} from "./IncomeStatementParser";
import {
  BalanceSheetParser,
  type ParsedBalanceSheet,
} from "./BalanceSheetParser";
import { CashFlowParser, type ParsedCashFlow } from "./CashFlowParser";
import {
  registerTrustEngine,
  registerTrustModule,
} from "../../dataIntegrity/trust";
import {
  getDataIntegrityEngine,
  validate as validateIntegrity,
} from "../../dataIntegrity/DataIntegrityEngine";
import { getValidationPlatform } from "../../dataIntegrity/platform";
import { registerEarningsData } from "../data";

export interface ParsedFinancialStatements {
  symbol: string;
  meta: FinancialPeriodMeta;
  incomeStatement: ParsedIncomeStatement | null;
  balanceSheet: ParsedBalanceSheet | null;
  cashFlow: ParsedCashFlow | null;
  validation: FinancialValidationResult;
  qualityFlags: ValueQualityFlag[];
  parserWarnings: string[];
  confidenceScore: number;
  version: string;
  lastUpdated: string;
}

export interface ParseStatementsInput {
  symbol?: string;
  metadata?: Partial<FinancialPeriodMeta>;
  incomeStatement?: Record<string, unknown> | null;
  balanceSheet?: Record<string, unknown> | null;
  cashFlow?: Record<string, unknown> | null;
}

export interface FinancialParserRegistrationResult {
  registered: boolean;
  skipped: boolean;
  statementsRegistered: number;
  linesRegistered: number;
  integrations: {
    earningsDataEngine: boolean;
    trust: boolean;
    dataIntegrity: boolean;
    validationPlatform: boolean;
  };
}

let defaultParser: FinancialStatementParser | null = null;
let parserRegistered = false;

export class FinancialStatementParser {
  private config: FinancialConfiguration;
  private readonly mapper = new FinancialLineMapper();
  private normalizer: FinancialNormalizer;
  private validator: FinancialValidator;
  private readonly metrics = new FinancialMetricsTracker();
  private incomeParser: IncomeStatementParser;
  private balanceParser: BalanceSheetParser;
  private cashFlowParser: CashFlowParser;

  private earningsIntegrated = false;
  private trustIntegrated = false;
  private integrityIntegrated = false;
  private platformIntegrated = false;

  constructor(configInput?: FinancialConfigurationInput) {
    this.config = resolveFinancialConfiguration(configInput);
    this.normalizer = new FinancialNormalizer(this.config);
    this.validator = new FinancialValidator(this.config);
    this.incomeParser = new IncomeStatementParser(this.mapper, this.normalizer);
    this.balanceParser = new BalanceSheetParser(this.mapper, this.normalizer);
    this.cashFlowParser = new CashFlowParser(this.mapper, this.normalizer);
  }

  getConfiguration(): FinancialConfiguration {
    return resolveFinancialConfiguration(this.config);
  }

  updateConfiguration(input: FinancialConfigurationInput): void {
    this.config = resolveFinancialConfiguration({ ...this.config, ...input });
    this.normalizer = new FinancialNormalizer(this.config);
    this.validator = new FinancialValidator(this.config);
    this.incomeParser = new IncomeStatementParser(this.mapper, this.normalizer);
    this.balanceParser = new BalanceSheetParser(this.mapper, this.normalizer);
    this.cashFlowParser = new CashFlowParser(this.mapper, this.normalizer);
  }

  /** Read-only integrations with existing engines via public APIs. */
  integrateExternalEngines(): FinancialParserRegistrationResult["integrations"] {
    let earningsDataEngine = this.earningsIntegrated;
    let trust = this.trustIntegrated;
    let dataIntegrity = this.integrityIntegrated;
    let validationPlatform = this.platformIntegrated;

    if (this.config.integrateEarningsDataEngine && !this.earningsIntegrated) {
      try {
        registerEarningsData();
        this.earningsIntegrated = true;
        earningsDataEngine = true;
      } catch {
        earningsDataEngine = false;
      }
    }

    if (this.config.integrateTrustEngine && !this.trustIntegrated) {
      try {
        registerTrustEngine();
        registerTrustModule({
          id: "financialStatementParser",
          name: "Institutional Financial Statement Parser",
          description: "Trust signal from parsed financial statement quality",
          defaultWeight: 0.05,
          extractScore: (payload: unknown) =>
            extractParserTrustScore(payload),
        });
        this.trustIntegrated = true;
        trust = true;
      } catch {
        trust = false;
      }
    }

    if (this.config.integrateDataIntegrity && !this.integrityIntegrated) {
      try {
        getDataIntegrityEngine();
        this.integrityIntegrated = true;
        dataIntegrity = true;
      } catch {
        dataIntegrity = false;
      }
    }

    if (
      this.config.integrateValidationPlatform &&
      !this.platformIntegrated
    ) {
      try {
        getValidationPlatform();
        this.platformIntegrated = true;
        validationPlatform = true;
      } catch {
        validationPlatform = false;
      }
    }

    return { earningsDataEngine, trust, dataIntegrity, validationPlatform };
  }

  parseIncomeStatement(
    raw: Record<string, unknown> | null | undefined,
    defaults?: Partial<FinancialPeriodMeta>
  ): ParsedIncomeStatement {
    try {
      const started = Date.now();
      const parsed = this.incomeParser.parse(raw, defaults);
      this.metrics.recordIncome();
      this.metrics.recordParse(Date.now() - started);
      return parsed;
    } catch (err) {
      this.metrics.recordError();
      return this.incomeParser.parse(null, {
        ...defaults,
        source: `error:${String(err)}`,
      });
    }
  }

  parseBalanceSheet(
    raw: Record<string, unknown> | null | undefined,
    defaults?: Partial<FinancialPeriodMeta>
  ): ParsedBalanceSheet {
    try {
      const started = Date.now();
      const parsed = this.balanceParser.parse(raw, defaults);
      this.metrics.recordBalance();
      this.metrics.recordParse(Date.now() - started);
      return parsed;
    } catch (err) {
      this.metrics.recordError();
      return this.balanceParser.parse(null, {
        ...defaults,
        source: `error:${String(err)}`,
      });
    }
  }

  parseCashFlow(
    raw: Record<string, unknown> | null | undefined,
    defaults?: Partial<FinancialPeriodMeta>
  ): ParsedCashFlow {
    try {
      const started = Date.now();
      const parsed = this.cashFlowParser.parse(raw, defaults);
      this.metrics.recordCashFlow();
      this.metrics.recordParse(Date.now() - started);
      return parsed;
    } catch (err) {
      this.metrics.recordError();
      return this.cashFlowParser.parse(null, {
        ...defaults,
        source: `error:${String(err)}`,
      });
    }
  }

  parseFinancialStatements(input: ParseStatementsInput): ParsedFinancialStatements {
    const started = Date.now();
    const warnings: string[] = [];
    const qualityFlags = new Set<ValueQualityFlag>();

    try {
      const defaults: Partial<FinancialPeriodMeta> = {
        symbol: input.symbol,
        currency: this.config.defaultCurrency,
        unit: this.config.defaultUnit,
        version: this.config.engineVersion,
        ...input.metadata,
      };

      const income = input.incomeStatement
        ? this.parseIncomeStatement(input.incomeStatement, defaults)
        : null;
      const balance = input.balanceSheet
        ? this.parseBalanceSheet(input.balanceSheet, defaults)
        : null;
      const cash = input.cashFlow
        ? this.parseCashFlow(input.cashFlow, defaults)
        : null;

      if (income) {
        warnings.push(...income.parserWarnings);
        income.qualityFlags.forEach((f) => qualityFlags.add(f));
      }
      if (balance) {
        warnings.push(...balance.parserWarnings);
        balance.qualityFlags.forEach((f) => qualityFlags.add(f));
      }
      if (cash) {
        warnings.push(...cash.parserWarnings);
        cash.qualityFlags.forEach((f) => qualityFlags.add(f));
      }

      // Enrich cash conversion using income PAT when available
      if (cash && income && cash.values.pat == null && income.values.pat != null) {
        cash.values.pat = income.values.pat;
      }

      const validation = this.validateFinancialStatements({
        incomeStatement: income,
        balanceSheet: balance,
        cashFlow: cash,
      });
      this.metrics.recordValidation(validation.valid);

      const confidenceScore = round2(
        average([
          income?.confidenceScore,
          balance?.confidenceScore,
          cash?.confidenceScore,
          validation.confidenceScore,
        ])
      );

      const meta =
        income?.meta ??
        balance?.meta ??
        cash?.meta ??
        this.normalizer.normalizeMeta({}, defaults);

      const result: ParsedFinancialStatements = {
        symbol: meta.symbol,
        meta,
        incomeStatement: income,
        balanceSheet: balance,
        cashFlow: cash,
        validation,
        qualityFlags: [...qualityFlags],
        parserWarnings: warnings,
        confidenceScore,
        version: this.config.engineVersion,
        lastUpdated: new Date().toISOString(),
      };

      this.softValidateWithIntegrity(result);
      this.metrics.recordParse(Date.now() - started);
      return result;
    } catch (err) {
      this.metrics.recordError();
      warnings.push(`parseFinancialStatements failed: ${String(err)}`);
      return {
        symbol: (input.symbol ?? "").toUpperCase(),
        meta: this.normalizer.normalizeMeta({}, { symbol: input.symbol }),
        incomeStatement: null,
        balanceSheet: null,
        cashFlow: null,
        validation: {
          valid: false,
          issues: [
            {
              code: "PARSE_ERROR",
              severity: "error",
              message: String(err),
            },
          ],
          confidenceScore: 0,
        },
        qualityFlags: ["MissingData"],
        parserWarnings: warnings,
        confidenceScore: 0,
        version: this.config.engineVersion,
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  validateFinancialStatements(input: {
    incomeStatement?: ParsedIncomeStatement | null;
    balanceSheet?: ParsedBalanceSheet | null;
    cashFlow?: ParsedCashFlow | null;
  }): FinancialValidationResult {
    try {
      const payloads = [];
      if (input.incomeStatement) {
        payloads.push({
          statementType: "income_statement" as const,
          values: input.incomeStatement.values,
          meta: input.incomeStatement.meta,
          lineLabels: input.incomeStatement.lines.map((l) => String(l.key)),
        });
      }
      if (input.balanceSheet) {
        payloads.push({
          statementType: "balance_sheet" as const,
          values: input.balanceSheet.values,
          meta: input.balanceSheet.meta,
          lineLabels: input.balanceSheet.lines.map((l) => String(l.key)),
        });
      }
      if (input.cashFlow) {
        payloads.push({
          statementType: "cash_flow" as const,
          values: input.cashFlow.values,
          meta: input.cashFlow.meta,
          lineLabels: input.cashFlow.lines.map((l) => String(l.key)),
        });
      }
      return this.validator.validateStatements(payloads);
    } catch (err) {
      this.metrics.recordError();
      return {
        valid: false,
        issues: [
          {
            code: "VALIDATION_ERROR",
            severity: "error",
            message: String(err),
          },
        ],
        confidenceScore: 0,
      };
    }
  }

  getFinancialMetrics(): FinancialOperationalMetrics {
    return this.metrics.getMetrics();
  }

  listCatalog() {
    return {
      statements: listFinancialStatements(),
      lines: listFinancialLines(),
    };
  }

  resetOperationalState(): void {
    this.metrics.reset();
    this.earningsIntegrated = false;
    this.trustIntegrated = false;
    this.integrityIntegrated = false;
    this.platformIntegrated = false;
  }

  private softValidateWithIntegrity(parsed: ParsedFinancialStatements): void {
    if (!this.config.integrateDataIntegrity) return;
    try {
      void validateIntegrity({
        data: {
          symbol: parsed.symbol,
          income: parsed.incomeStatement?.values,
          balance: parsed.balanceSheet?.values,
          cashFlow: parsed.cashFlow?.values,
          parserConfidence: parsed.confidenceScore,
        },
        datasetType: "FINANCIAL_STATEMENT",
        dataSource: "FinancialStatementParser",
        metadata: {
          objectId: parsed.symbol,
          engineVersion: this.config.engineVersion,
        },
      }).catch(() => {
        // never crash
      });
    } catch {
      // never crash
    }
  }
}

function extractParserTrustScore(payload: unknown): number | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const p = payload as Record<string, unknown>;
  if (typeof p.parserConfidence === "number") return p.parserConfidence;
  if (
    p.moduleScores &&
    typeof p.moduleScores === "object" &&
    p.moduleScores !== null &&
    typeof (p.moduleScores as Record<string, unknown>).financialStatementParser ===
      "number"
  ) {
    return (p.moduleScores as Record<string, number>).financialStatementParser;
  }
  return undefined;
}

function average(values: Array<number | undefined | null>): number {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function registerFinancialParser(options?: {
  parser?: FinancialStatementParser;
  config?: FinancialConfigurationInput;
  force?: boolean;
}): FinancialParserRegistrationResult {
  if (parserRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      statementsRegistered: listFinancialStatements().length,
      linesRegistered: listFinancialLines().length,
      integrations: {
        earningsDataEngine: false,
        trust: false,
        dataIntegrity: false,
        validationPlatform: false,
      },
    };
  }

  if (options?.parser) {
    defaultParser = options.parser;
  } else if (!defaultParser || options?.config || options?.force) {
    defaultParser = new FinancialStatementParser(options?.config);
  }

  const catalog = registerBuiltinFinancialCatalog({ force: options?.force });
  const integrations = defaultParser.integrateExternalEngines();
  parserRegistered = true;

  return {
    registered: true,
    skipped: false,
    statementsRegistered: catalog.statements,
    linesRegistered: catalog.lines,
    integrations,
  };
}

export function getFinancialStatementParser(
  options?: FinancialConfigurationInput
): FinancialStatementParser {
  if (!defaultParser || options) {
    defaultParser = new FinancialStatementParser(options);
    registerBuiltinFinancialCatalog();
  }
  return defaultParser;
}

export function resetFinancialParser(): void {
  if (defaultParser) defaultParser.resetOperationalState();
  defaultParser = null;
  parserRegistered = false;
  resetFinancialRegistry();
}

/** Public API convenience wrappers — never throw. */
export function parseIncomeStatement(
  raw: Record<string, unknown> | null | undefined,
  defaults?: Partial<FinancialPeriodMeta>
) {
  try {
    registerFinancialParser();
    return getFinancialStatementParser().parseIncomeStatement(raw, defaults);
  } catch {
    return getFinancialStatementParser().parseIncomeStatement(null, defaults);
  }
}

export function parseBalanceSheet(
  raw: Record<string, unknown> | null | undefined,
  defaults?: Partial<FinancialPeriodMeta>
) {
  try {
    registerFinancialParser();
    return getFinancialStatementParser().parseBalanceSheet(raw, defaults);
  } catch {
    return getFinancialStatementParser().parseBalanceSheet(null, defaults);
  }
}

export function parseCashFlow(
  raw: Record<string, unknown> | null | undefined,
  defaults?: Partial<FinancialPeriodMeta>
) {
  try {
    registerFinancialParser();
    return getFinancialStatementParser().parseCashFlow(raw, defaults);
  } catch {
    return getFinancialStatementParser().parseCashFlow(null, defaults);
  }
}

export function parseFinancialStatements(input: ParseStatementsInput) {
  try {
    registerFinancialParser();
    return getFinancialStatementParser().parseFinancialStatements(input);
  } catch (err) {
    return {
      symbol: (input.symbol ?? "").toUpperCase(),
      meta: {
        symbol: (input.symbol ?? "").toUpperCase(),
        currency: DEFAULT_FINANCIAL_CONFIGURATION.defaultCurrency,
        financialYear: "",
        unit: DEFAULT_FINANCIAL_CONFIGURATION.defaultUnit,
      },
      incomeStatement: null,
      balanceSheet: null,
      cashFlow: null,
      validation: {
        valid: false,
        issues: [
          {
            code: "PARSE_ERROR",
            severity: "error" as const,
            message: String(err),
          },
        ],
        confidenceScore: 0,
      },
      qualityFlags: ["MissingData" as const],
      parserWarnings: [String(err)],
      confidenceScore: 0,
      version: DEFAULT_FINANCIAL_CONFIGURATION.engineVersion,
      lastUpdated: new Date().toISOString(),
    };
  }
}

export function validateFinancialStatements(input: {
  incomeStatement?: ParsedIncomeStatement | null;
  balanceSheet?: ParsedBalanceSheet | null;
  cashFlow?: ParsedCashFlow | null;
}) {
  try {
    registerFinancialParser();
    return getFinancialStatementParser().validateFinancialStatements(input);
  } catch {
    return { valid: false, issues: [], confidenceScore: 0 };
  }
}

export function getFinancialMetrics() {
  try {
    registerFinancialParser();
    return getFinancialStatementParser().getFinancialMetrics();
  } catch {
    return {
      parseRuns: 0,
      incomeParsed: 0,
      balanceParsed: 0,
      cashFlowParsed: 0,
      validations: 0,
      validationFailures: 0,
      derivedFieldsComputed: 0,
      errors: 0,
      averageRuntimeMs: 0,
      lastParseAt: null,
    };
  }
}

export {
  DEFAULT_FINANCIAL_CONFIGURATION,
  resolveFinancialConfiguration,
};
