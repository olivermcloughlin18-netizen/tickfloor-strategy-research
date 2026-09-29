# hunt2 harness changelog

## 2026-09-27: Sharpe bootstrap refine 20000 -> 100000

The selftest "bootstrap p-value floors stay >=5x under the BH bar" failed at nTests=414: the Sharpe-difference
test (RISK_IMPROVER track only) refines at 20000 iterations, a floor of 5.0e-5 against a rank-1 bar of 2.4e-4
(4.8x, needs 5x). Raised `sharpeDiffPValue`'s `refineIters` default to 100000 (floor 1.0e-5, good to ~2000 tests).
Refinement only runs when the screen p <= 0.02, so rows above that are unchanged. The excess test (PROMISING
track) already refines at 50000 (floor 2e-5) and is unaffected.

## v2 — 2026-09-15 (between round 1 and round 2)

### 1. Metrics made internally consistent (changes every past row)

**Root cause.** v1 mixed two kinds of annualisation:
- `CAGR` and `B&H CAGR` were geometric: (prod(1+R))^(1/years) − 1.
- `excess/yr` and the halves were **arithmetic**: mean(R_daily − B_daily) × days-per-year.
- The p-value bootstrapped the same arithmetic daily difference.

For crypto, whose daily vol runs 4–5%, the arithmetic mean of B&H sits far above its geometric CAGR (volatility drag ≈ σ²/2 per day).
- **A zero-trade strategy** scored excess = −mean(B)×365 = **−86.8%/yr**, while B&H CAGR was 62.8%. Half 1 (2017–2021) came out at **−145.2%**
  because that half's arithmetic mean return was 145%/yr. Neither number is a real return anyone could lose.
- **social-ta-vwma-cross** (CAGR 86.0% vs 62.8%) showed excess **−13.2%**. It holds only part of the time, so it
  pays much less volatility drag. Its arithmetic mean was below B&H's arithmetic mean even though its compounded growth
  was higher. The p-value tested that same arithmetic statistic, so it asked a different question from the CAGR column.

**Fix.** Everything is geometric and tested on log returns (definitions at the top of `harness.mjs`):
- `excess/yr = CAGR(strategy) − CAGR(buy&hold)` on identical days, in percentage points. Cash = −B&H CAGR exactly, and a
  B&H copy = 0 exactly. The halves use the same formula per half. Folds now report period `excessReturn` (strategy return − B&H return), not an annualised figure.
- `p` bootstraps daily `log(1+R) − log(1+B)`. That mean is > 0 exactly when CAGR(strategy) > CAGR(B&H), so the p-value and excess/yr always agree in sign (the selftest checks 100 runs).
- The random-control statistic is now mean daily log return (it ranks like CAGR), and there's a Sharpe percentile alongside it.
- The benchmark is documented as what it has always been: an equal-weight long of the same assets, **rebalanced daily** across the assets trading that day.
  The strategy's daily return uses the same construction. It is not a per-asset buy-and-hold mean (`perAsset.bhReturn` is that).
- Selftest: B&H-identical excess = 0 (whole run and both halves). Cash excess = −B&H CAGR (whole run and both halves). B&H CAGR matches an
  independent geometric calculation.

### 2. Ledger hygiene

**Root cause.** Round 1 had 40 of 115 rows with fewer than 5 trades (39 with zero). They were ledgered as tests, and repeated attempts at the same broken id piled up
(williams-r ×10, livermore ×5, vantharp ×5, 3-white-soldiers ×4, darvas ×4). calendar-crypto-hour-of-day never reached the ledger because it timed out. Two shared author bugs:
- `if (!ctx.state) ctx.state = {...}`. `ctx.state` is always `{}`, so its fields stayed `undefined` and no entry condition could ever be true (williams-r).
- Treating `bar.time` (epoch seconds) as milliseconds (calendar-crypto-hour-of-day divides by 1000).

**Fix.**
- `evaluate()` now REJECTS any run with <5 trades (signal: trade segments; portfolio: weight changes) **before** the random control, so nothing is ledgered.
  The message names the common bugs. README and the template now document both pitfalls.
- `computeLedger` drops <5-trade rows from old ledgers. The BH family is still every distinct run that traded (every attempt counts).
  The leaderboard shows the latest run per id plus its attempt count (`--all` shows every run).
- Each ledgered run now stores its exact source at `results/sources/<sha256>/<id>.mjs`. Round 1 only kept the latest file per id, so older attempts could not be recomputed.

### 3. RISK_IMPROVER track

Separate from PROMISING, and never called an edge. It needs all of:
- q<0.10 (BH over the whole ledger) on a one-sided, centred, paired circular block bootstrap of Sharpe(R) − Sharpe(B), with the same block length as the excess test
- Sharpe > B&H
- maxDD ≤ 75% of B&H's
- CAGR ≥ 60% of B&H's
- Sharpe better in both halves
- ≥2 assets
- beats ≥95% of exposure-matched random controls on Sharpe

A row that is PROMISING is reported on track 1 only.
Selftest: calibration on 100 synthetic nulls and 100 random strategies on real data; power on a half-vol benchmark copy; each gate individually; BH across 2001 rows.

### 4. Data expansion

Keyless, cached in `cache/extras/`, cut at DISCOVERY_END, and every value keyed by the time it became known. See the README "Data available" table.
- FRED series: T10Y2Y, BAMLH0A0HYM2, DFII10, T10YIE, DCOILWTICO, DTWEXBGS, VIXCLS
- CBOE VIX and VIX3M
- Fear & Greed
- USDT-M funding for all 18 crypto dailies (data.binance.vision, 2020+). This is merged with the legacy BTC/BNB cache, which it matches on all 4,560 overlapping settlements.
- Hourly open interest for the 8 crypto-1h pairs

Lags:
- FRED/CBOE daily prints: D+1
- DCOILWTICO and DTWEXBGS: D+7, because they arrive in weekly releases
- F&G: unchanged

Caveats:
- BAMLH0A0HYM2 only covers 2023-09+ because FRED limits ICE data to 3 years.
- FRED values are the current vintage.

New ctx calls: `ctx.macro(id, i)`, `ctx.openInterest()`, and `ctx.resample(bars, "1w"|"1M")`. Macro and resample are also available in `rank()`.
The extras a run actually reads now enter `dataSha256`.
The INDEX_PROXY rule adds `meta.proxyFor`: SPY/IWM/EFA → QQQ/DIA only, the proxy must be one of the assets, and the swap is recorded in `result.substitutions` and in the ledger.

### 5. Performance

**Root cause.** calendar-crypto-hour-of-day re-scanned a 17,520-bar window through the lookahead Proxy on every one of 66k hourly bars,
three times over (full run plus two truncation re-runs): ~3.5e9 guarded reads.

**Fix.** Memoised O(1)-per-bar ctx helpers:
- `sma`/`rollingMean`, `rollingSum`, `rollingStd`, `ema`, `rsi`, `atr`, `donchian`
- a push-based `rolling(n)` window for custom series

A NaN input resets a window rather than poisoning a running sum, and sums are re-derived every n pushes to stop float drift.
Selftest: 9 indicators over all 66,276 BTC 1h bars in ~0.4s, each matching a naive implementation at 4 probes including the last bar.
An hour-of-day strategy rewritten on `ctx.rolling` runs through the full harness in ~2s.
The truncation check now runs after the trade-count check, and it still compares raw signals.

### Recompute of round-1 rows

`node --import tsx research/hunt2/ledger.mjs --recompute` (3 shards, then assembly). The v1 ledger is preserved at `ledger.v1.jsonl`.
Every distinct source in v1 (115) was handled one of four ways:
- **72 recomputed** from a stored source. `ranAt` is kept, `recomputedAt` is added, and the v2 metrics, Sharpe test and random Sharpe percentile are filled in.
  Only these can be reproduced, because round 1 kept just the latest file per id. Their source snapshots now live under `results/sources/`.
- **4 now rejected** (<5 trades) and removed from the ledger: social-ta-fibonacci-618-retrace, mrsa-btc-eth-ratio-reversion,
  mrsa-ou-halflife-pair-crypto, calendar-turn-of-month@a5917fa6.
- **36 dropped**: older attempts with <5 trades whose source was overwritten, all implementation failures.
- **3 kept as LEGACY**: older attempts that did trade but whose source was overwritten. They still count in both FDR families,
  keep their v1 p (and p=1 on the Sharpe track), and can never be marked PROMISING or RISK_IMPROVER.

The FDR family went from 115 rows to 75 distinct runs that traded, across 72 ids. The metric change only touches excess/yr, the halves, the p-values and the random percentiles. CAGR, Sharpe and maxDD formulas are the same
(strategies that read funding now also see the 2020 funding history, so their numbers can move too). That includes the v1 examples above:
- vwma-cross is now +23.2pp (was −13.2%)
- mom12_1_stocks is p=0.137 (was 0.054)

Nothing is PROMISING and nothing is RISK_IMPROVER (see the ledger).
