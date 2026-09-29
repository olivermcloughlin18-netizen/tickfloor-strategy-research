# Tickfloor Strategy Research

Derived results from testing 517 trading strategies across 31 families against buy-and-hold,
after Benjamini-Hochberg false-discovery-rate correction for running that many tests. Last
updated 29 September 2026 (ledger runs 15 to 29 September 2026).

**Result: 0 of 598 scored runs survived correction.** 87 strategies beat buy-and-hold on the raw
number, and 8 of those cleared p < 0.05 before correction. The lowest FDR-adjusted q-value across
all 598 runs is 0.1196, above the ledger's q < 0.10 gate. The 2 candidates that then got a single
look at held-back data (after 2025-03-15) were both not confirmed.

This is the dataset behind [tickfloor.com/evidence](https://tickfloor.com/evidence). Tickfloor
runs chart-indicator scoring on stocks, ETFs and crypto; before shipping it, its maker ran this
study to check whether any of the standard trend/momentum/breadth/calendar-style strategies
actually beat holding the market, and published the negative result rather than burying it.

## What's in the data

`data/strategy-results.json` has one row per strategy (517 rows):

| field | meaning |
|---|---|
| `id` | strategy identifier |
| `family` | strategy family: trend, breadth, calendar, momentum, etc. (31 total) |
| `assetClass` | `us_stock`, `etf`, `crypto`, etc. |
| `excess` | annualized excess return vs. buy-and-hold |
| `p` | p-value on excess return, before correction |
| `q` | Benjamini-Hochberg FDR-adjusted q-value across all 598 scored runs |
| `verdict` | `yes` (beat B&H, p < 0.05, pre-correction), `not significant`, or `no` |

`q` is computed over every scored run (598, robustness reruns included); each row shows the latest
run of its strategy, so the lowest `q` in this file (0.167) is above the family-wide minimum.

**Not included:** raw price bars. The underlying OHLC data comes from vendors whose terms
limit redisplay, so this dataset ships only the derived statistics per strategy: enough to
audit the correction and the verdicts, not enough to reconstruct the price history.

## Everything else in the repo

Under `research/`, generated from the same ledger (nothing typed by hand):

| path | what |
|---|---|
| `research/STRATEGY-REGISTRY.json` | the generated registry: 517 strategies, excess, p, half-window excess, cost-sweep fields |
| `research/researchStats.ts` | headline numbers (517 strategies, 31 families, 598 FDR tests) emitted from the ledger |
| `research/hunt2/ledger.jsonl` | the append-only ledger of every scored run, with source/data/harness hashes |
| `research/hunt2/strategies/` | the source of all 689 strategy files, one rule each, signals use only past bars |
| `research/hunt2/harness.mjs`, `ledger.mjs`, `run.mjs`, `data.mjs` | the harness, BH-FDR ledger and runner |
| `research/hunt2/prereg-0929.md`, `robustness-0929.md`, `robustness-0929/` | pre-registration and the robustness battery on the top 20 (14 survive, none is an edge) |
| `research/hunt2/holdout-exam-0929.md`, `.json` | the one-shot holdout exam: 2 candidates, 0 confirmed |
| `research/hunt2/cost-sweep.json`, `random-control-sweep.json` | cost-to-breakeven and random-control sweeps |
| `research/hunt2/scripts/` | registry, exam-stats and holdout-runner scripts |

The harness needs price bars that are not redistributed here, so the scripts document the method
but will not run end to end from this repo alone.

## Method, in short

Each strategy is a fully specified rule (entry/exit or signal weighting) backtested over a
fixed discovery window (bars before 2025-03-15) with realistic costs, scored on annualized excess return over
buy-and-hold with a paired significance test. Because hundreds of independent tests inflate the
chance of a false positive, the p-values are corrected across the whole batch with
Benjamini-Hochberg FDR. `q` is the result of that correction, and `verdict` keeps track of
whether a strategy beat p < 0.05 on its own before the FDR step, so the effect of correction is
visible per strategy, not just in the headline count.

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
  redistribute it, crediting Tickfloor and linking back to
  [tickfloor.com/evidence](https://tickfloor.com/evidence).

## Citing

> Tickfloor Strategy Research (2026). 517 backtested trading strategies, FDR-corrected
> significance (updated 2026-09-29). https://github.com/tickfloor/tickfloor-strategy-research,
> derived from https://tickfloor.com/evidence.
