# Tickfloor Strategy Research

Derived results from testing 517 trading strategies across 31 families against an equal-weight, daily-rebalanced hold of the same assets,
after Benjamini-Hochberg false-discovery-rate correction for running that many tests. Last
updated 29 September 2026 (ledger runs 15 to 29 September 2026).

**Result: 0 of 598 tests survived correction** (517 strategies plus reruns and variants). 87
strategies beat the benchmark on the raw number, and 8 of those cleared p < 0.05 before correction. The lowest FDR-adjusted q-value across
all 598 tests is 0.1196 (a robustness rerun of a volatility-managed QQQ/AGG rule; 0.167 in this file's
latest-run row), above the ledger's q < 0.10 gate. The 2 candidates that then got a single
look at held-back data (after 2025-03-15) were both not confirmed.

This is the dataset behind [tickfloor.com/evidence](https://tickfloor.com/evidence). Tickfloor
is a paid stock and crypto testing tool, and this research is also marketing for it. Its maker ran this
study to check whether any of the standard trend/momentum/breadth/calendar-style strategies
actually beat holding the same assets, and published the negative result rather than burying it.

## What's in the data

`data/strategy-results.json` has one row per strategy (517 rows):

| field | meaning |
|---|---|
| `id` | strategy identifier |
| `family` | strategy family: trend, breadth, calendar, momentum, etc. (31 total) |
| `assetClass` | `us_stock`, `etf`, `crypto`, etc. |
| `excess` | annualized excess return vs. the benchmark (equal-weight, daily-rebalanced hold; pays no costs) |
| `p` | p-value on excess return, before correction |
| `q` | Benjamini-Hochberg FDR-adjusted q-value across all 598 tests |
| `verdict` | `yes` (beat benchmark, p < 0.05, pre-correction), `not significant`, or `no` |

`q` is computed over all 598 tests (reruns and variants included); each row shows the latest
run of its strategy, so the lowest `q` in this file (0.167) is above the family-wide minimum.

**Not included:** raw price bars. The underlying OHLC data comes from vendors whose terms
limit redisplay, so this dataset ships only the derived statistics per strategy: enough to
audit the correction and the verdicts, not enough to reconstruct the price history.

## Everything else in the repo

Under `research/`, generated from the same ledger:

| path | what |
|---|---|
| `research/STRATEGY-REGISTRY.json` | the generated registry: 517 strategies, excess, p, half-window excess, cost-sweep fields |
| `research/researchStats.ts` | headline numbers (517 strategies, 31 families, 598 FDR tests) emitted from the ledger |
| `research/hunt2/ledger.jsonl` | the append-only ledger of every run, with source/data/harness hashes |
| `research/hunt2/strategies/` | the source of all 689 strategy files, one rule each; signals are blocked from reading later bars |
| `research/hunt2/harness.mjs`, `ledger.mjs`, `run.mjs`, `data.mjs` | the harness, BH-FDR ledger and runner |
| `research/hunt2/prereg-0929.md`, `robustness-0929.md`, `robustness-0929/` | pre-registration and the robustness battery on the top 20 (14 pass a weaker, separate test; a few distinct ideas, none is an edge) |
| `research/hunt2/holdout-exam-0929.md`, `.json` | the one-shot holdout exam: 2 candidates, 0 confirmed |
| `research/hunt2/cost-sweep.json`, `random-control-sweep.json` | cost-to-breakeven and random-control sweeps |
| `research/hunt2/scripts/` | registry, exam-stats and holdout-runner scripts |

The harness needs price bars that are not redistributed here, so the scripts document the method
but will not run end to end from this repo alone.

## Method, in short

Each strategy is a fully specified rule (entry/exit or signal weighting) backtested over a
fixed discovery window (bars before 2025-03-15) with modelled costs (0.05% a side for stocks and ETFs, 0.10% plus measured slippage for
crypto; the benchmark pays none), scored on annualized excess return over the benchmark with a
block-bootstrap significance test. Because hundreds of independent tests inflate the
chance of a false positive, the p-values are corrected across the whole batch with
Benjamini-Hochberg FDR. `q` is the result of that correction, and `verdict` keeps track of
whether a strategy beat p < 0.05 on its own before the FDR step, so the effect of correction is
visible per strategy, not just in the headline count.

Limits: fills are at the signal bar close, which is optimistic; the stock universe is today's large
caps (survivorship bias); delisted stocks, shorting, leverage and options are not covered. Known flaw:
in rank-based strategies the harness lets weights drift between rebalances without charging turnover
(`research/hunt2/hypotheses-0929-sol.md`); its size is unmeasured, and the ledger is a screening
statistic, not a corrected confirmation. Preregistration files exist for batches from 24 September on
(no third-party timestamp); the 15 to 23 September batches are exploratory.

Full method notes, scope and limits: [tickfloor.com/evidence](https://tickfloor.com/evidence).

## Using it

```python
import json
rows = json.load(open("data/strategy-results.json"))

survived = [r for r in rows if r["q"] < 0.05]  # 0
print(f"{len(survived)} of {len(rows)} survived FDR correction")

by_family = {}
for r in rows:
    by_family.setdefault(r["family"], []).append(r)
print(f"{len(by_family)} strategy families")
```

or with pandas: `pd.read_json("data/strategy-results.json")`.

## License

- Code (`load_example.py`, `research/**/*.mjs`, `research/*.ts`): [MIT](LICENSE)
- Data and write-ups (`data/strategy-results.json`, `research/**/*.json`, `*.jsonl`, `*.md`): [CC BY 4.0](LICENSE-DATA). Reuse it, adapt it, and
  redistribute it, crediting Tickfloor Strategy Research and linking to this repository.

## Citing

> Tickfloor Strategy Research (2026). 517 backtested trading strategies, FDR-corrected
> significance (updated 2026-09-29). https://github.com/tickfloor/tickfloor-strategy-research,
> derived from https://tickfloor.com/evidence.
