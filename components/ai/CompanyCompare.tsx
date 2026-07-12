"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Loader2,
  Plus,
  Scale,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { StockLink } from "@/components/ui/StockLink";
import {
  COMPARE_DIMENSIONS,
  type CompareRadarDimension,
} from "@/lib/compare/scorecardEngine";
import type { CompareResult } from "@/lib/compare/compareEngine";
import {
  preloadCompanySearch,
  searchCompanies,
  type SearchableCompany,
} from "@/lib/company-search";
import { cn } from "@/lib/utils";
import type { RecommendationLevel } from "@/types";

const COMPANY_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#f97316",
] as const;

const PRESETS = [
  ["TCS", "INFY"],
  ["HDFCBANK", "ICICIBANK"],
  ["RELIANCE", "ONGC"],
  ["TATAMOTORS", "M&M"],
] as const;

function recommendationVariant(
  rec: RecommendationLevel
): "gain" | "loss" | "accent" | "neutral" {
  if (rec === "Strong Buy" || rec === "Buy" || rec === "Accumulate") return "gain";
  if (rec === "Sell" || rec === "Strong Sell" || rec === "Reduce") return "loss";
  return "neutral";
}

interface CompareRadarChartProps {
  dimensions: CompareRadarDimension[];
  symbols: string[];
  names: Record<string, string>;
  size?: number;
  className?: string;
}

/**
 * Multi-company radar chart — component-ready architecture using CompareRadarDimension[].
 */
export function CompareRadarChart({
  dimensions,
  symbols,
  names,
  size = 320,
  className,
}: CompareRadarChartProps) {
  const axisCount = dimensions.length;
  const center = size / 2;
  const radius = size * 0.34;
  const labelRadius = radius + 28;

  const angles = useMemo(
    () =>
      dimensions.map((_, index) => (Math.PI * 2 * index) / axisCount - Math.PI / 2),
    [dimensions, axisCount]
  );

  const gridLevels = [25, 50, 75, 100];

  function point(angle: number, value: number): { x: number; y: number } {
    const ratio = value / 100;
    return {
      x: center + Math.cos(angle) * radius * ratio,
      y: center + Math.sin(angle) * radius * ratio,
    };
  }

  function polygonPath(symbol: string): string {
    return dimensions
      .map((dimension, index) => {
        const value = dimension.values[symbol] ?? 0;
        const { x, y } = point(angles[index], value);
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ")
      .concat(" Z");
  }

  if (axisCount === 0) return null;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={angles
              .map((angle) => {
                const { x, y } = point(angle, level);
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}

        {angles.map((angle, index) => {
          const outer = point(angle, 100);
          return (
            <line
              key={dimensions[index].key}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          );
        })}

        {symbols.map((symbol, symbolIndex) => (
          <path
            key={symbol}
            d={polygonPath(symbol)}
            fill={`${COMPANY_COLORS[symbolIndex % COMPANY_COLORS.length]}22`}
            stroke={COMPANY_COLORS[symbolIndex % COMPANY_COLORS.length]}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}

        {dimensions.map((dimension, index) => {
          const angle = angles[index];
          const { x, y } = {
            x: center + Math.cos(angle) * labelRadius,
            y: center + Math.sin(angle) * labelRadius,
          };
          return (
            <text
              key={dimension.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-text-muted text-[9px] font-medium"
            >
              {dimension.label}
            </text>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {symbols.map((symbol, index) => (
          <div key={symbol} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COMPANY_COLORS[index % COMPANY_COLORS.length] }}
            />
            <span className="font-mono font-semibold">{symbol}</span>
            <span className="text-text-muted">{names[symbol]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface SymbolSlotProps {
  symbol: string;
  onChange: (symbol: string) => void;
  onRemove?: () => void;
  removable?: boolean;
  index: number;
}

function SymbolSlot({ symbol, onChange, onRemove, removable, index }: SymbolSlotProps) {
  const [query, setQuery] = useState(symbol);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(symbol);
  }, [symbol]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchCompanies(query, 6);
  }, [query]);

  function selectCompany(company: SearchableCompany) {
    onChange(company.displaySymbol);
    setQuery(company.displaySymbol);
    setOpen(false);
  }

  return (
    <div className="relative flex-1 min-w-[140px]">
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-muted">
        Company {index + 1}
      </label>
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value.toUpperCase());
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Symbol or name"
          className="w-full rounded-lg border border-surface-border-subtle bg-surface-overlay/40 px-3 py-2 font-mono text-sm text-text-primary outline-none transition focus:border-accent/40"
        />
        {removable && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-surface-border-subtle p-2 text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
            aria-label="Remove company"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-surface-border-subtle bg-surface-raised shadow-xl">
          {results.map((company) => (
            <button
              key={company.displaySymbol}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-surface-hover"
              onMouseDown={() => selectCompany(company)}
            >
              <span className="font-mono font-semibold text-text-primary">
                {company.displaySymbol}
              </span>
              <span className="truncate pl-3 text-xs text-text-muted">{company.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface CompanyCompareProps {
  className?: string;
}

export function CompanyCompare({ className }: CompanyCompareProps) {
  const [symbols, setSymbols] = useState<string[]>(["TCS", "INFY"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);

  useEffect(() => {
    preloadCompanySearch();
  }, []);

  const canAdd = symbols.length < 5;
  const canCompare = symbols.filter(Boolean).length >= 2;

  const updateSymbol = useCallback((index: number, value: string) => {
    setSymbols((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }, []);

  const addSlot = useCallback(() => {
    setSymbols((current) => (current.length < 5 ? [...current, ""] : current));
  }, []);

  const removeSlot = useCallback((index: number) => {
    setSymbols((current) =>
      current.length > 2 ? current.filter((_, i) => i !== index) : current
    );
  }, []);

  async function runCompare(nextSymbols?: string[]) {
    const payload = (nextSymbols ?? symbols).map((s) => s.trim()).filter(Boolean);
    if (payload.length < 2) {
      setError("Select at least 2 companies to compare.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: payload }),
      });

      const data = (await response.json()) as CompareResult | { error?: string };
      if (!response.ok) {
        throw new Error("error" in data && data.error ? data.error : "Compare failed");
      }

      setResult(data as CompareResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compare failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const nameMap = useMemo(() => {
    if (!result) return {};
    return Object.fromEntries(result.companies.map((c) => [c.symbol, c.name]));
  }, [result]);

  return (
    <div className={cn("mx-auto flex w-full max-w-6xl flex-col gap-6", className)}>
      <Card padding="lg">
        <CardHeader
          title="Institutional Compare"
          subtitle="Compare 2–5 companies across 13 institutional dimensions"
          action={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
              <Scale className="h-4 w-4 text-accent" />
            </div>
          }
        />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex flex-1 flex-wrap gap-3">
            {symbols.map((symbol, index) => (
              <SymbolSlot
                key={`slot-${index}`}
                index={index}
                symbol={symbol}
                onChange={(value) => updateSymbol(index, value)}
                removable={symbols.length > 2}
                onRemove={() => removeSlot(index)}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {canAdd && (
              <button
                type="button"
                onClick={addSlot}
                className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border-subtle px-3 py-2 text-xs font-medium text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            )}
            <button
              type="button"
              disabled={!canCompare || loading}
              onClick={() => runCompare()}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowLeftRight className="h-4 w-4" />
              )}
              Compare
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.join("-")}
              type="button"
              onClick={() => {
                setSymbols([...preset]);
                void runCompare([...preset]);
              }}
              className="rounded-full border border-surface-border-subtle px-3 py-1 text-xs text-text-muted transition hover:border-accent/30 hover:text-text-secondary"
            >
              {preset.join(" vs ")}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-loss/20 bg-loss-bg px-3 py-2 text-sm text-loss">
            {error}
          </p>
        )}
      </Card>

      {loading && !result && (
        <Card padding="lg" className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3 text-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm">Running institutional compare across engines…</p>
          </div>
        </Card>
      )}

      {result && (
        <>
          {result.verdict && (
            <Card padding="lg" className="animate-fade-in-up border-accent/20">
              <CardHeader
                title="AI Verdict"
                subtitle="Winner, runner-up, and institutional rationale"
                action={
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                    <Sparkles className="h-4 w-4 text-accent" />
                  </div>
                }
              />
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-xl border border-gain/20 bg-gain-bg/30 p-4">
                  <div className="flex items-center gap-2 text-gain">
                    <Trophy className="h-4 w-4" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                      Winner
                    </span>
                  </div>
                  <StockLink symbol={result.verdict.winner.symbol}>
                    <p className="mt-2 font-mono text-lg font-bold text-text-primary hover:text-accent">
                      {result.verdict.winner.symbol}
                    </p>
                  </StockLink>
                  <p className="text-sm text-text-secondary">{result.verdict.winner.name}</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-gain">
                    {result.verdict.winner.overallScore}
                    <span className="text-sm text-text-muted">/100</span>
                  </p>
                </div>

                <div className="rounded-xl border border-surface-border-subtle bg-surface-overlay/30 p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Runner-up
                  </span>
                  <StockLink symbol={result.verdict.runnerUp.symbol}>
                    <p className="mt-2 font-mono text-lg font-bold text-text-primary hover:text-accent">
                      {result.verdict.runnerUp.symbol}
                    </p>
                  </StockLink>
                  <p className="text-sm text-text-secondary">{result.verdict.runnerUp.name}</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-text-primary">
                    {result.verdict.runnerUp.overallScore}
                    <span className="text-sm text-text-muted">/100</span>
                  </p>
                </div>

                <div className="space-y-3 text-sm text-text-secondary">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Confidence
                    </span>
                    <p className="mt-1 font-mono text-xl font-bold text-accent">
                      {result.verdict.confidence}%
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Suitable Investor
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {result.verdict.suitableInvestor.map((profile) => (
                        <Badge key={profile} variant="accent" size="sm">
                          {profile}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Why
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-sm text-text-secondary">
                    {result.verdict.rationale.map((line, index) => (
                      <li key={index} className="leading-relaxed">
                        {line.replace(/\*\*/g, "")}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Risks
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-sm text-text-secondary">
                    {result.verdict.risks.map((risk, index) => (
                      <li key={index} className="leading-relaxed">
                        {risk.replace(/\*\*/g, "")}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {result.companies.map((company) => (
              <Card key={company.symbol} padding="md" className="animate-fade-in-up">
                <div className="text-center">
                  <StockLink symbol={company.symbol}>
                    <p className="font-mono text-sm font-bold text-text-primary hover:text-accent">
                      {company.symbol}
                    </p>
                  </StockLink>
                  <p className="mt-0.5 truncate text-[10px] text-text-muted">{company.name}</p>
                  <div className="mt-3 flex justify-center">
                    <ScoreGauge score={company.overallScore} label="Overall" size={110} />
                  </div>
                  <Badge
                    className="mt-2"
                    variant={recommendationVariant(company.recommendation)}
                    size="sm"
                  >
                    {company.recommendation}
                  </Badge>
                  <p className="mt-2 font-mono text-[10px] text-text-muted">
                    Rank #{result.rankings.find((r) => r.symbol === company.symbol)?.compareRank}
                  </p>
                </div>
              </Card>
            ))}
          </div>

          <Card padding="lg">
            <CardHeader
              title="Radar Comparison"
              subtitle="13-dimension institutional scorecard overlay"
            />
            <CompareRadarChart
              dimensions={result.radar}
              symbols={result.symbols}
              names={nameMap}
              size={360}
            />
          </Card>

          <Card padding="lg">
            <CardHeader title="Sector Ranking" subtitle="Overall score rank within compare set" />
            <DataTable
              data={result.rankings}
              keyExtractor={(row) => row.symbol}
              columns={[
                {
                  key: "rank",
                  header: "Rank",
                  align: "right",
                  render: (row) => (
                    <span className="font-mono text-xs font-bold">#{row.compareRank}</span>
                  ),
                },
                {
                  key: "symbol",
                  header: "Company",
                  render: (row) => (
                    <StockLink symbol={row.symbol}>
                      <span className="font-mono text-xs font-semibold hover:text-accent">
                        {row.symbol}
                      </span>
                    </StockLink>
                  ),
                },
                { key: "sector", header: "Sector", render: (row) => row.sector },
                {
                  key: "score",
                  header: "Score",
                  align: "right",
                  render: (row) => (
                    <span className="font-mono text-xs font-bold">{row.overallScore}</span>
                  ),
                },
                {
                  key: "sector-rank",
                  header: "Sector Rank",
                  align: "right",
                  render: (row) => (
                    <span className="font-mono text-xs text-text-muted">#{row.sectorRank}</span>
                  ),
                },
              ]}
            />
          </Card>

          <Card padding="lg">
            <CardHeader title="Scorecard Matrix" subtitle="13 dimensions × companies" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-border-subtle text-[10px] uppercase tracking-wider text-text-muted">
                    <th className="px-3 py-2">Dimension</th>
                    {result.symbols.map((symbol) => (
                      <th key={symbol} className="px-3 py-2 text-right font-mono">
                        {symbol}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right">Leader</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_DIMENSIONS.map((dimension) => {
                    const leader = result.dimensionLeaders.find(
                      (item) => item.dimension === dimension.key
                    );
                    return (
                      <tr
                        key={dimension.key}
                        className="border-b border-surface-border-subtle/60"
                      >
                        <td className="px-3 py-2 font-medium text-text-secondary">
                          {dimension.label}
                        </td>
                        {result.symbols.map((symbol) => {
                          const company = result.companies.find((c) => c.symbol === symbol);
                          const score = company?.scorecard[dimension.key] ?? 0;
                          const isLeader = leader?.leader === symbol;
                          return (
                            <td
                              key={symbol}
                              className={cn(
                                "px-3 py-2 text-right font-mono tabular-nums",
                                isLeader ? "font-bold text-gain" : "text-text-primary"
                              )}
                            >
                              {score}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-right font-mono text-accent">
                          {leader?.leader}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card padding="lg">
              <CardHeader title="Strength / Weakness Matrix" />
              <div className="space-y-4">
                {result.strengthWeakness.map((entry) => (
                  <div
                    key={entry.symbol}
                    className="rounded-xl border border-surface-border-subtle bg-surface-overlay/20 p-4"
                  >
                    <p className="font-mono text-sm font-bold text-text-primary">
                      {entry.symbol}
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gain">
                          Strengths
                        </p>
                        <ul className="mt-1 space-y-1 text-xs text-text-secondary">
                          {entry.strengths.map((item) => (
                            <li key={item.dimension}>
                              {item.label} —{" "}
                              <span className="font-mono text-gain">{item.score}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-loss">
                          Weaknesses
                        </p>
                        <ul className="mt-1 space-y-1 text-xs text-text-secondary">
                          {entry.weaknesses.map((item) => (
                            <li key={item.dimension}>
                              {item.label} —{" "}
                              <span className="font-mono text-loss">{item.score}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card padding="lg">
              <CardHeader title="Recommendation Matrix" />
              <DataTable
                data={result.recommendationMatrix}
                keyExtractor={(row) => row.symbol}
                columns={[
                  {
                    key: "symbol",
                    header: "Company",
                    render: (row) => (
                      <StockLink symbol={row.symbol}>
                        <span className="font-mono text-xs font-semibold hover:text-accent">
                          {row.symbol}
                        </span>
                      </StockLink>
                    ),
                  },
                  {
                    key: "rec",
                    header: "Recommendation",
                    render: (row) => (
                      <Badge variant={recommendationVariant(row.recommendation)} size="sm">
                        {row.recommendation}
                      </Badge>
                    ),
                  },
                  {
                    key: "confidence",
                    header: "Confidence",
                    align: "right",
                    render: (row) => (
                      <span className="font-mono text-xs">{row.confidenceScore}%</span>
                    ),
                  },
                  {
                    key: "conviction",
                    header: "Conviction",
                    align: "right",
                    render: (row) => (
                      <span className="font-mono text-xs">{row.aiConvictionScore}</span>
                    ),
                  },
                  {
                    key: "horizon",
                    header: "Horizon",
                    render: (row) => (
                      <span className="text-xs text-text-muted">{row.timeHorizon}</span>
                    ),
                  },
                ]}
              />
            </Card>
          </div>

          <Card padding="lg">
            <CardHeader
              title="Financial Peer Table"
              subtitle="Live profitability, growth, leverage, and valuation"
            />
            <DataTable
              data={result.peers}
              keyExtractor={(row) => row.symbol}
              columns={[
                {
                  key: "company",
                  header: "Company",
                  render: (row) => (
                    <StockLink symbol={row.symbol}>
                      <span className="font-mono text-xs font-semibold hover:text-accent">
                        {row.symbol}
                      </span>
                    </StockLink>
                  ),
                },
                {
                  key: "pe",
                  header: "P/E",
                  align: "right",
                  render: (row) => <span className="font-mono text-xs">{row.pe}x</span>,
                },
                {
                  key: "roe",
                  header: "ROE",
                  align: "right",
                  render: (row) => <span className="font-mono text-xs">{row.roe}%</span>,
                },
                {
                  key: "roce",
                  header: "ROCE",
                  align: "right",
                  render: (row) => <span className="font-mono text-xs">{row.roce}%</span>,
                },
                {
                  key: "growth",
                  header: "Sales Gr.",
                  align: "right",
                  render: (row) => (
                    <span className="font-mono text-xs">{row.salesGrowth}%</span>
                  ),
                },
                {
                  key: "valuation",
                  header: "Valuation",
                  render: (row) => (
                    <Badge
                      size="sm"
                      variant={
                        row.valuation === "Attractive"
                          ? "gain"
                          : row.valuation === "Premium"
                            ? "loss"
                            : "accent"
                      }
                    >
                      {row.valuation}
                    </Badge>
                  ),
                },
                {
                  key: "rank",
                  header: "Rank",
                  align: "right",
                  render: (row) => (
                    <span className="font-mono text-xs font-bold">#{row.industryRank}</span>
                  ),
                },
              ]}
            />
          </Card>

          <p className="pb-6 text-center text-[10px] text-text-faint">
            Generated {new Date(result.generatedAt).toLocaleString("en-IN")} by EquityOS
            Institutional Compare Engine. Not investment advice.
          </p>
        </>
      )}
    </div>
  );
}
