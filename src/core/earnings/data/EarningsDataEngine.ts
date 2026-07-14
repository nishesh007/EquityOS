/**
 * Institutional Earnings Data Engine — façade (Sprint 9B.1).
 * Collects, normalizes, validates, caches, and exposes earnings datasets.
 * Does not perform earnings analysis.
 */

import {
  DEFAULT_EARNINGS_CONFIGURATION,
  resolveEarningsConfiguration,
  type EarningsConfiguration,
  type EarningsConfigurationInput,
  type EarningsDatasetKind,
} from "./EarningsConfiguration";
import {
  listEarningsDatasets,
  registerBuiltinEarningsDatasets,
  resetEarningsRegistry,
} from "./EarningsRegistry";
import {
  EarningsNormalizer,
  type EarningsMetadata,
  type NormalizedAnnouncement,
  type NormalizedDividend,
  type NormalizedPeriodRecord,
  type NormalizedSegmentResult,
  type RawEarningsInput,
} from "./EarningsNormalizer";
import { EarningsValidator, type EarningsValidationResult } from "./EarningsValidator";
import {
  EarningsAggregator,
  type AggregatedEarningsView,
  type AggregationView,
} from "./EarningsAggregator";
import { EarningsMetricsTracker, type EarningsOperationalMetrics } from "./EarningsMetrics";
import { QuarterlyResultsProvider } from "./QuarterlyResultsProvider";
import { AnnualResultsProvider } from "./AnnualResultsProvider";
import { FinancialStatementProvider } from "./FinancialStatementProvider";
import { CorporateAnnouncementProvider } from "./CorporateAnnouncementProvider";
import { ShareholdingProvider } from "./ShareholdingProvider";
import { SegmentResultsProvider } from "./SegmentResultsProvider";
import {
  registerTrustEngine,
  registerTrustModule,
} from "../../dataIntegrity/trust";
import {
  getDataIntegrityEngine,
  validate as validateIntegrity,
} from "../../dataIntegrity/DataIntegrityEngine";
import { getValidationPlatform } from "../../dataIntegrity/platform";

export interface EarningsCompanyBundle {
  symbol: string;
  metadata: EarningsMetadata;
  quarterly: NormalizedPeriodRecord[];
  annual: NormalizedPeriodRecord[];
  incomeStatement: NormalizedPeriodRecord[];
  balanceSheet: NormalizedPeriodRecord[];
  cashFlow: NormalizedPeriodRecord[];
  shareholding: NormalizedPeriodRecord[];
  segments: NormalizedSegmentResult[];
  announcements: NormalizedAnnouncement[];
  dividends: NormalizedDividend[];
  highlights: NormalizedPeriodRecord[];
  standalone: NormalizedPeriodRecord[];
  consolidated: NormalizedPeriodRecord[];
  validation: EarningsValidationResult;
  warnings: string[];
  errors: string[];
  version: string;
  lastUpdated: string;
}

export interface IngestEarningsInput {
  symbol: string;
  metadata?: Partial<EarningsMetadata>;
  quarterly?: RawEarningsInput[] | null;
  annual?: RawEarningsInput[] | null;
  incomeStatement?: RawEarningsInput[] | null;
  balanceSheet?: RawEarningsInput[] | null;
  cashFlow?: RawEarningsInput[] | null;
  shareholding?: RawEarningsInput[] | null;
  segments?: RawEarningsInput[] | null;
  announcements?: RawEarningsInput[] | null;
  dividends?: RawEarningsInput[] | null;
  highlights?: RawEarningsInput[] | null;
  standalone?: RawEarningsInput[] | null;
  consolidated?: RawEarningsInput[] | null;
}

export interface EarningsQueryOptions {
  symbol: string;
  view?: AggregationView;
  useCache?: boolean;
  forceRefresh?: boolean;
}

interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt: number;
  version: string;
}

export interface EarningsRegistrationResult {
  registered: boolean;
  skipped: boolean;
  datasetsRegistered: number;
  integrations: {
    trust: boolean;
    dataIntegrity: boolean;
    validationPlatform: boolean;
  };
}

let defaultEngine: EarningsDataEngine | null = null;
let engineRegistered = false;

export class EarningsDataEngine {
  private config: EarningsConfiguration;
  private readonly normalizer = new EarningsNormalizer();
  private validator: EarningsValidator;
  private readonly aggregator = new EarningsAggregator();
  private readonly metrics = new EarningsMetricsTracker();
  private readonly quarterlyProvider: QuarterlyResultsProvider;
  private readonly annualProvider: AnnualResultsProvider;
  private readonly statementProvider: FinancialStatementProvider;
  private readonly announcementProvider: CorporateAnnouncementProvider;
  private readonly shareholdingProvider: ShareholdingProvider;
  private readonly segmentProvider: SegmentResultsProvider;

  private readonly store = new Map<string, EarningsCompanyBundle>();
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private trustIntegrated = false;
  private integrityIntegrated = false;
  private platformIntegrated = false;

  constructor(configInput?: EarningsConfigurationInput) {
    this.config = resolveEarningsConfiguration(configInput);
    this.validator = new EarningsValidator(this.config, this.normalizer);
    this.quarterlyProvider = new QuarterlyResultsProvider(this.normalizer);
    this.annualProvider = new AnnualResultsProvider(this.normalizer);
    this.statementProvider = new FinancialStatementProvider(this.normalizer);
    this.announcementProvider = new CorporateAnnouncementProvider(this.normalizer);
    this.shareholdingProvider = new ShareholdingProvider(this.normalizer);
    this.segmentProvider = new SegmentResultsProvider(this.normalizer);
  }

  getConfiguration(): EarningsConfiguration {
    return resolveEarningsConfiguration(this.config);
  }

  updateConfiguration(input: EarningsConfigurationInput): void {
    this.config = resolveEarningsConfiguration({ ...this.config, ...input });
    this.validator = new EarningsValidator(this.config, this.normalizer);
  }

  /**
   * Soft integrations with Sprint 9F engines via public APIs only.
   * Never mutates platform / trust / integrity internals.
   */
  integrateExternalEngines(): {
    trust: boolean;
    dataIntegrity: boolean;
    validationPlatform: boolean;
  } {
    let trust = this.trustIntegrated;
    let dataIntegrity = this.integrityIntegrated;
    let validationPlatform = this.platformIntegrated;

    if (this.config.integrateTrustEngine && !this.trustIntegrated) {
      try {
        registerTrustEngine();
        registerTrustModule({
          id: "earningsDataQuality",
          name: "Institutional Earnings Data Quality",
          description:
            "Trust signal derived from earnings dataset validation quality",
          defaultWeight: 0.05,
          extractScore: (payload: unknown) =>
            extractEarningsTrustScore(payload),
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

    return { trust, dataIntegrity, validationPlatform };
  }

  ingest(input: IngestEarningsInput): EarningsCompanyBundle {
    const started = Date.now();
    const symbol = (input.symbol || "").toUpperCase();
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      if (!symbol) {
        errors.push("Symbol is required");
        this.metrics.recordError();
        return emptyBundle("", errors);
      }

      // Duplicate upload: replace prior bundle for symbol (idempotent upsert)
      const defaults: Partial<EarningsMetadata> = {
        symbol,
        currency: this.config.defaultCurrency,
        source: input.metadata?.source ?? "institutional",
        version: this.config.engineVersion,
        ...input.metadata,
      };

      const quarterly = this.quarterlyProvider.load(input.quarterly, defaults);
      const annual = this.annualProvider.load(input.annual, defaults);
      const income = this.statementProvider.loadIncomeStatement(
        input.incomeStatement,
        defaults
      );
      const balance = this.statementProvider.loadBalanceSheet(
        input.balanceSheet,
        defaults
      );
      const cashFlow = this.statementProvider.loadCashFlow(
        input.cashFlow,
        defaults
      );
      const shareholding = this.shareholdingProvider.load(
        input.shareholding,
        defaults
      );
      const segments = this.segmentProvider.load(input.segments, defaults);
      const announcements = this.announcementProvider.load(
        input.announcements,
        defaults
      );
      const dividends = this.statementProvider.load(
        "dividend_history",
        input.dividends,
        defaults
      );
      const highlights = this.statementProvider.load(
        "financial_highlights",
        input.highlights,
        defaults
      );
      const standalone = this.statementProvider.load(
        "standalone_results",
        input.standalone,
        defaults
      );
      const consolidated = this.statementProvider.load(
        "consolidated_results",
        input.consolidated,
        defaults
      );

      warnings.push(
        ...quarterly.warnings,
        ...annual.warnings,
        ...income.warnings,
        ...balance.warnings,
        ...cashFlow.warnings,
        ...shareholding.warnings,
        ...segments.warnings,
        ...announcements.warnings,
        ...dividends.warnings,
        ...highlights.warnings,
        ...standalone.warnings,
        ...consolidated.warnings
      );
      errors.push(
        ...quarterly.errors,
        ...annual.errors,
        ...income.errors,
        ...balance.errors,
        ...cashFlow.errors,
        ...shareholding.errors,
        ...segments.errors,
        ...announcements.errors,
        ...dividends.errors,
        ...highlights.errors,
        ...standalone.errors,
        ...consolidated.errors
      );

      this.metrics.recordNormalization();

      const allPeriods = [
        ...quarterly.records,
        ...annual.records,
        ...income.records,
        ...balance.records,
        ...cashFlow.records,
        ...shareholding.records,
        ...highlights.records,
        ...standalone.records,
        ...consolidated.records,
      ];

      const validation = this.validator.validatePeriods(allPeriods);
      this.metrics.recordValidation(validation.valid && !validation.rejected);

      if (validation.rejected && this.config.rejectMalformed) {
        warnings.push("Malformed period dataset rejected; storing accepted subset only");
      }

      const acceptedKeys = new Set(
        validation.acceptedRecords.map(
          (r) => `${r.datasetKind}:${r.periodKey}:${r.statementBasis}`
        )
      );

      const keep = (records: NormalizedPeriodRecord[]) =>
        this.config.rejectMalformed
          ? records.filter((r) =>
              acceptedKeys.has(
                `${r.datasetKind}:${r.periodKey}:${r.statementBasis}`
              )
            )
          : records;

      const metadata = this.normalizer.normalizeMetadata(
        { symbol, ...input.metadata },
        defaults
      );

      const bundle: EarningsCompanyBundle = {
        symbol,
        metadata,
        quarterly: keep(quarterly.records),
        annual: keep(annual.records),
        incomeStatement: keep(income.records),
        balanceSheet: keep(balance.records),
        cashFlow: keep(cashFlow.records),
        shareholding: keep(shareholding.records),
        segments: segments.segments,
        announcements: announcements.announcements,
        dividends: dividends.dividends,
        highlights: keep(highlights.records),
        standalone: keep(standalone.records),
        consolidated: keep(consolidated.records),
        validation,
        warnings,
        errors,
        version: this.config.engineVersion,
        lastUpdated: new Date().toISOString(),
      };

      this.store.set(symbol, bundle);
      this.invalidateCache(symbol);
      this.metrics.recordLoad(Date.now() - started);

      // Soft integrity validation of a representative payload (non-blocking)
      this.softValidateWithIntegrity(bundle);

      return cloneBundle(bundle);
    } catch (err) {
      this.metrics.recordError();
      errors.push(`ingest failed: ${String(err)}`);
      return emptyBundle(symbol, errors);
    }
  }

  getQuarterlyResults(
    options: EarningsQueryOptions
  ): AggregatedEarningsView | NormalizedPeriodRecord[] {
    return this.queryPeriods(options, "quarterly", options.view ?? "complete");
  }

  getAnnualResults(
    options: EarningsQueryOptions
  ): AggregatedEarningsView | NormalizedPeriodRecord[] {
    return this.queryPeriods(options, "annual", options.view ?? "complete");
  }

  getIncomeStatement(options: EarningsQueryOptions): NormalizedPeriodRecord[] {
    return this.queryList(options, "incomeStatement");
  }

  getBalanceSheet(options: EarningsQueryOptions): NormalizedPeriodRecord[] {
    return this.queryList(options, "balanceSheet");
  }

  getCashFlow(options: EarningsQueryOptions): NormalizedPeriodRecord[] {
    return this.queryList(options, "cashFlow");
  }

  getShareholding(options: EarningsQueryOptions): NormalizedPeriodRecord[] {
    return this.queryList(options, "shareholding");
  }

  getSegmentResults(options: EarningsQueryOptions): NormalizedSegmentResult[] {
    const symbol = options.symbol.toUpperCase();
    const cacheKey = `segments:${symbol}`;
    if (options.useCache !== false && !options.forceRefresh) {
      const cached = this.cacheGet<NormalizedSegmentResult[]>(cacheKey);
      if (cached) return cached;
    }
    const bundle = this.store.get(symbol);
    if (!bundle) return [];
    const value = bundle.segments.map((s) => ({ ...s, metadata: { ...s.metadata } }));
    this.cacheSet(cacheKey, value);
    return value;
  }

  getCorporateAnnouncements(
    options: EarningsQueryOptions
  ): NormalizedAnnouncement[] {
    const symbol = options.symbol.toUpperCase();
    const cacheKey = `announcements:${symbol}`;
    if (options.useCache !== false && !options.forceRefresh) {
      const cached = this.cacheGet<NormalizedAnnouncement[]>(cacheKey);
      if (cached) return cached;
    }
    const bundle = this.store.get(symbol);
    if (!bundle) return [];
    const value = bundle.announcements.map((a) => ({
      ...a,
      metadata: { ...a.metadata },
    }));
    this.cacheSet(cacheKey, value);
    return value;
  }

  getFinancialHistory(options: EarningsQueryOptions & { years?: number }) {
    const symbol = options.symbol.toUpperCase();
    const cacheKey = `history:${symbol}:${options.years ?? "all"}`;
    if (options.useCache !== false && !options.forceRefresh) {
      const cached = this.cacheGet<NormalizedPeriodRecord[]>(cacheKey);
      if (cached) {
        this.metrics.recordAggregation();
        return cached;
      }
    }
    const bundle = this.store.get(symbol);
    if (!bundle) return [];
    const records = [...bundle.quarterly, ...bundle.annual];
    const history = this.aggregator.getFinancialHistory(records, {
      symbol,
      years: options.years,
    });
    this.metrics.recordAggregation();
    this.cacheSet(cacheKey, history);
    return history;
  }

  getBundle(symbol: string): EarningsCompanyBundle | null {
    const bundle = this.store.get(symbol.toUpperCase());
    return bundle ? cloneBundle(bundle) : null;
  }

  getMetrics(): EarningsOperationalMetrics {
    return this.metrics.getMetrics();
  }

  listSupportedDatasets(): EarningsDatasetKind[] {
    return listEarningsDatasets().map((d) => d.kind);
  }

  invalidateCache(symbol?: string): void {
    if (!symbol) {
      this.cache.clear();
      return;
    }
    const prefix = symbol.toUpperCase();
    for (const key of [...this.cache.keys()]) {
      if (key.includes(`:${prefix}`) || key.endsWith(`:${prefix}`)) {
        this.cache.delete(key);
      }
    }
  }

  incrementalRefresh(
    symbol: string,
    compute: () => EarningsCompanyBundle
  ): { bundle: EarningsCompanyBundle; refreshed: boolean } {
    const key = `bundle:${symbol.toUpperCase()}`;
    const entry = this.cache.get(key);
    if (entry && Date.now() <= entry.expiresAt) {
      this.metrics.recordCacheHit();
      return {
        bundle: entry.value as EarningsCompanyBundle,
        refreshed: false,
      };
    }
    this.metrics.recordCacheMiss();
    const bundle = compute();
    this.cacheSet(key, bundle);
    return { bundle, refreshed: true };
  }

  resetOperationalState(): void {
    this.store.clear();
    this.cache.clear();
    this.metrics.reset();
    this.trustIntegrated = false;
    this.integrityIntegrated = false;
    this.platformIntegrated = false;
  }

  private queryPeriods(
    options: EarningsQueryOptions,
    field: "quarterly" | "annual",
    view: AggregationView
  ): AggregatedEarningsView | NormalizedPeriodRecord[] {
    const symbol = options.symbol.toUpperCase();
    const cacheKey = `${field}:${view}:${symbol}`;
    if (options.useCache !== false && !options.forceRefresh) {
      const cached = this.cacheGet<AggregatedEarningsView>(cacheKey);
      if (cached) {
        this.metrics.recordAggregation();
        return view === "complete" ? cached.records : cached;
      }
    }

    const bundle = this.store.get(symbol);
    if (!bundle) {
      return view === "complete"
        ? []
        : { view, symbol, records: [], asOf: new Date().toISOString() };
    }

    const aggregated = this.aggregator.aggregate(bundle[field], view, symbol);
    this.metrics.recordAggregation();
    this.cacheSet(cacheKey, aggregated);
    return view === "complete" ? aggregated.records : aggregated;
  }

  private queryList(
    options: EarningsQueryOptions,
    field:
      | "incomeStatement"
      | "balanceSheet"
      | "cashFlow"
      | "shareholding"
  ): NormalizedPeriodRecord[] {
    const symbol = options.symbol.toUpperCase();
    const cacheKey = `${field}:${symbol}`;
    if (options.useCache !== false && !options.forceRefresh) {
      const cached = this.cacheGet<NormalizedPeriodRecord[]>(cacheKey);
      if (cached) return cached;
    }
    const bundle = this.store.get(symbol);
    if (!bundle) return [];
    const value = bundle[field].map((r) => ({
      ...r,
      metrics: { ...r.metrics },
      metadata: { ...r.metadata },
    }));
    this.cacheSet(cacheKey, value);
    return value;
  }

  private cacheGet<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.recordCacheMiss();
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.metrics.recordCacheMiss();
      return undefined;
    }
    this.metrics.recordCacheHit();
    return entry.value as T;
  }

  private cacheSet<T>(key: string, value: T): void {
    if (this.cache.size >= this.config.maxCacheEntries) {
      const first = this.cache.keys().next().value;
      if (first) this.cache.delete(first);
    }
    const now = Date.now();
    this.cache.set(key, {
      value,
      createdAt: now,
      expiresAt: now + this.config.cacheTtlMs,
      version: this.config.engineVersion,
    });
  }

  private softValidateWithIntegrity(bundle: EarningsCompanyBundle): void {
    if (!this.config.integrateDataIntegrity) return;
    try {
      void validateIntegrity({
        data: {
          symbol: bundle.symbol,
          quarterly: bundle.quarterly,
          annual: bundle.annual,
          earningsValidationScore: scoreFromValidation(bundle.validation),
        },
        datasetType: "FINANCIAL_STATEMENT",
        dataSource: "EarningsDataEngine",
        metadata: {
          objectId: bundle.symbol,
          engineVersion: this.config.engineVersion,
        },
      }).catch(() => {
        // Never crash consumers
      });
    } catch {
      // Never crash consumers
    }
  }
}

function emptyBundle(symbol: string, errors: string[]): EarningsCompanyBundle {
  const now = new Date().toISOString();
  return {
    symbol,
    metadata: {
      company: "",
      exchange: "",
      symbol,
      isin: "",
      sector: "",
      industry: "",
      currency: "INR",
      financialYear: "",
      source: "unknown",
      lastUpdated: now,
      version: DEFAULT_EARNINGS_CONFIGURATION.engineVersion,
    },
    quarterly: [],
    annual: [],
    incomeStatement: [],
    balanceSheet: [],
    cashFlow: [],
    shareholding: [],
    segments: [],
    announcements: [],
    dividends: [],
    highlights: [],
    standalone: [],
    consolidated: [],
    validation: {
      valid: false,
      rejected: true,
      issues: [
        {
          code: "INGEST_ERROR",
          severity: "error",
          message: errors[0] ?? "Unknown ingest error",
        },
      ],
      acceptedRecords: [],
      rejectedRecords: [],
    },
    warnings: [],
    errors,
    version: DEFAULT_EARNINGS_CONFIGURATION.engineVersion,
    lastUpdated: now,
  };
}

function cloneBundle(bundle: EarningsCompanyBundle): EarningsCompanyBundle {
  return {
    ...bundle,
    metadata: { ...bundle.metadata },
    quarterly: bundle.quarterly.map((r) => ({
      ...r,
      metrics: { ...r.metrics },
      metadata: { ...r.metadata },
    })),
    annual: bundle.annual.map((r) => ({
      ...r,
      metrics: { ...r.metrics },
      metadata: { ...r.metadata },
    })),
    incomeStatement: bundle.incomeStatement.map((r) => ({
      ...r,
      metrics: { ...r.metrics },
      metadata: { ...r.metadata },
    })),
    balanceSheet: bundle.balanceSheet.map((r) => ({
      ...r,
      metrics: { ...r.metrics },
      metadata: { ...r.metadata },
    })),
    cashFlow: bundle.cashFlow.map((r) => ({
      ...r,
      metrics: { ...r.metrics },
      metadata: { ...r.metadata },
    })),
    shareholding: bundle.shareholding.map((r) => ({
      ...r,
      metrics: { ...r.metrics },
      metadata: { ...r.metadata },
    })),
    segments: bundle.segments.map((s) => ({
      ...s,
      metadata: { ...s.metadata },
    })),
    announcements: bundle.announcements.map((a) => ({
      ...a,
      metadata: { ...a.metadata },
    })),
    dividends: bundle.dividends.map((d) => ({
      ...d,
      metadata: { ...d.metadata },
    })),
    highlights: bundle.highlights.map((r) => ({
      ...r,
      metrics: { ...r.metrics },
      metadata: { ...r.metadata },
    })),
    standalone: bundle.standalone.map((r) => ({
      ...r,
      metrics: { ...r.metrics },
      metadata: { ...r.metadata },
    })),
    consolidated: bundle.consolidated.map((r) => ({
      ...r,
      metrics: { ...r.metrics },
      metadata: { ...r.metadata },
    })),
    validation: {
      ...bundle.validation,
      issues: [...bundle.validation.issues],
      acceptedRecords: [...bundle.validation.acceptedRecords],
      rejectedRecords: [...bundle.validation.rejectedRecords],
    },
    warnings: [...bundle.warnings],
    errors: [...bundle.errors],
  };
}

function scoreFromValidation(validation: EarningsValidationResult): number {
  if (validation.rejected) return 20;
  const errors = validation.issues.filter((i) => i.severity === "error").length;
  const warnings = validation.issues.filter((i) => i.severity === "warning").length;
  return Math.max(0, Math.min(100, 100 - errors * 15 - warnings * 5));
}

function extractEarningsTrustScore(payload: unknown): number | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const p = payload as Record<string, unknown>;
  if (typeof p.earningsValidationScore === "number") {
    return p.earningsValidationScore;
  }
  if (
    p.moduleScores &&
    typeof p.moduleScores === "object" &&
    p.moduleScores !== null &&
    typeof (p.moduleScores as Record<string, unknown>).earningsDataQuality ===
      "number"
  ) {
    return (p.moduleScores as Record<string, number>).earningsDataQuality;
  }
  return undefined;
}

export function registerEarningsData(options?: {
  engine?: EarningsDataEngine;
  config?: EarningsConfigurationInput;
  force?: boolean;
}): EarningsRegistrationResult {
  if (engineRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      datasetsRegistered: listEarningsDatasets().length,
      integrations: {
        trust: false,
        dataIntegrity: false,
        validationPlatform: false,
      },
    };
  }

  if (options?.engine) {
    defaultEngine = options.engine;
  } else if (!defaultEngine || options?.config || options?.force) {
    defaultEngine = new EarningsDataEngine(options?.config);
  }

  const builtins = registerBuiltinEarningsDatasets({ force: options?.force });
  const integrations = defaultEngine.integrateExternalEngines();
  engineRegistered = true;

  return {
    registered: true,
    skipped: false,
    datasetsRegistered: builtins.total,
    integrations,
  };
}

export function getEarningsDataEngine(
  options?: EarningsConfigurationInput
): EarningsDataEngine {
  if (!defaultEngine || options) {
    defaultEngine = new EarningsDataEngine(options);
    registerBuiltinEarningsDatasets();
  }
  return defaultEngine;
}

export function resetEarningsDataEngine(): void {
  if (defaultEngine) defaultEngine.resetOperationalState();
  defaultEngine = null;
  engineRegistered = false;
  resetEarningsRegistry();
}

/** Public API convenience wrappers — never throw to consumers. */
export function getQuarterlyResults(options: EarningsQueryOptions) {
  try {
    registerEarningsData();
    return getEarningsDataEngine().getQuarterlyResults(options);
  } catch {
    return [];
  }
}

export function getAnnualResults(options: EarningsQueryOptions) {
  try {
    registerEarningsData();
    return getEarningsDataEngine().getAnnualResults(options);
  } catch {
    return [];
  }
}

export function getIncomeStatement(options: EarningsQueryOptions) {
  try {
    registerEarningsData();
    return getEarningsDataEngine().getIncomeStatement(options);
  } catch {
    return [];
  }
}

export function getBalanceSheet(options: EarningsQueryOptions) {
  try {
    registerEarningsData();
    return getEarningsDataEngine().getBalanceSheet(options);
  } catch {
    return [];
  }
}

export function getCashFlow(options: EarningsQueryOptions) {
  try {
    registerEarningsData();
    return getEarningsDataEngine().getCashFlow(options);
  } catch {
    return [];
  }
}

export function getShareholding(options: EarningsQueryOptions) {
  try {
    registerEarningsData();
    return getEarningsDataEngine().getShareholding(options);
  } catch {
    return [];
  }
}

export function getSegmentResults(options: EarningsQueryOptions) {
  try {
    registerEarningsData();
    return getEarningsDataEngine().getSegmentResults(options);
  } catch {
    return [];
  }
}

export function getCorporateAnnouncements(options: EarningsQueryOptions) {
  try {
    registerEarningsData();
    return getEarningsDataEngine().getCorporateAnnouncements(options);
  } catch {
    return [];
  }
}

export function getFinancialHistory(
  options: EarningsQueryOptions & { years?: number }
) {
  try {
    registerEarningsData();
    return getEarningsDataEngine().getFinancialHistory(options);
  } catch {
    return [];
  }
}

export { DEFAULT_EARNINGS_CONFIGURATION, resolveEarningsConfiguration };
