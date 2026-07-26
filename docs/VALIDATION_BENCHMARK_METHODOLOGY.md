# Benchmark Methodology

Sprint 11B.3

## Supported benchmarks

- Nifty 50
- Nifty 100
- Nifty 500

Defined in `DEMO_BENCHMARKS` as cumulative return % series. The registry is intentionally extensible (`BenchmarkDefinition`) for future live providers.

## Comparison fields

| Field | Meaning |
|---|---|
| Strategy return | Cumulative closed-trade return % in filtered sample |
| Benchmark return | Series value at last trade exit timestamp |
| Excess return | Strategy − benchmark |
| Strategy win rate | From analytics statistics |

No look-ahead: benchmark points after the sample’s last exit are not used.
