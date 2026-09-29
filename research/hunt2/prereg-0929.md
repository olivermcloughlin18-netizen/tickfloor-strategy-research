# Pre-registration: confirmatory holdout exam, 29 September 2026

Status: FROZEN. Committed on lane/hunt-0929 before any holdout byte is read. The CONFIRMATORY lines go into `[private repo path]` (committed on integrate/0927) before the run. Each candidate runs once. There is no tuning, no second look and no swapping candidates after the results. A rule, window or gate that turns out wrong after the run is reported as a limitation, not edited and rerun.

Input: `research/hunt2/robustness-0929.md` (commit a4ff078), which lists 14 survivors and 0 PROMISING rows. The best q among the survivors is 0.18.

## 1. Which survivors still have a clean holdout

I read the holdout log (`docs_holdout_log.txt`, 9 lines, last entry 2026-09-24) before writing this. It records these uses:

| Log entry | What it spent |
|---|---|
| 2026-09-08 `crosssectional.ts scripts_xsec.mjs` x2 (lb14/hold3/reb30 long-only; lb7/hold2/reb30 long-short) | **Crypto cross-sectional momentum** on the engine-cache crypto universe, time window from 2025-03-08 onward (RESEARCH.md §3 shows the holdout result: +11.2% vs BTC -4.2%, p=0.28) |
| 2026-09-08 ETHUSDT 4h trend | ETH (a holdout-bucket asset). It is not in CRYPTO_DAILY. |
| 2026-09-10 funding provenance | Funding-bounce/post-drop family. Its runs read last-18-month candles with no time cutoff (RESEARCH.md §10 correction). |
| 2026-09-14 audit | R2 intraday price-action families (ORB, VWAP reclaim, prior-day H/L, Asian/London, engulfing, round-number, inside bar) on BTC/ETH/SOL through 2026-08. R3 anomalies (200d SMA, TSMOM, GEM, TOM, overnight, dip-vs-DCA) on SPY/QQQ/GLD/EFA/AGG through 2026-09. R1 ETH/SOL/SPY/MSFT cells. |
| 2026-09-24 mom12_1 | 12-1 stock momentum on the 76 holdout-bucket WIDE names, 2025-03-24 to 2026-09-23 |

Eligibility of the 14 survivors:

| # | Survivor | Holdout status | Decision |
|---|---|---|---|
| 1 | s29-cx-fng-cond-mom | Crypto cross-sectional momentum. The 2026-09-08 xsec runs already read this family's post-2025-03 window. | FORWARD-ONLY |
| 2 | r25-crypto-btcbeta-low | Low BTC beta on 18 discovery-bucket pairs, post-2025-03-15. No log entry touches this family. | **CLEAN, eligible** |
| 3 | r27-crypto-lowbeta-rankw | Same low-beta idea as #2 | Clean, but same idea as #2 (see §2) |
| 4 | r27-crypto-mom-buffer | Crypto cross-sectional momentum (same as #1) | FORWARD-ONLY |
| 5 | r27-crypto-scaled-trend | Crypto time-series trend on 18 discovery-bucket pairs. R3's trend/TSMOM contamination covers the ETFs only, R2 is intraday session patterns, and ETH-4h covers ETH only. | **CLEAN, eligible** |
| 6-8 | r27-cx-tsmom-vote3h, r27-cx-tsmom28-fngfear, social-ta-vwma-cross | Same crypto trend-filter family as #5 | Clean, but same idea as #5 (see §2) |
| 9 | s29-etf-dynamic-hedge-selection | Holds 60% QQQ plus the defensive asset least correlated with it (AGG/GLD among them). R3 read QQQ/GLD/AGG through 2026-09 for GEM/TSMOM/200d allocation rules, which is the same asset/date combination for a closely related allocation family. | FORWARD-ONLY |
| 10 | mlq-feature-neutral-momentum | Crypto cross-sectional momentum | FORWARD-ONLY |
| 11 | r24b-lo-industry-momentum | Uses a static ~40-name industry map that does not cover the holdout-bucket names (results-2026-09-24b.md). The discovery-bucket names post-boundary are unread, but the result sits inside cost error (worst case +2.8pp). | Not selected (§2), FORWARD-ONLY |
| 12 | macro-crypto-btc-dominance-altseason-rotation | This is a BTC-vs-alts relative-momentum rotation, the family of the 2026-09-08 xsec holdout reads. It also relies on a fallback drop. | FORWARD-ONLY |
| 13 | r24b-rev-low-turnover | Discovery-bucket WIDE names post-boundary are unread. Worst case +1.0pp is inside cost error (robustness-0929.md caveat). | Not selected (§2), FORWARD-ONLY |
| 14 | r24b-lo-xsec-momentum-12-1 | 12-1 stock momentum. The 2026-09-24 confirm already spent this family's time window (holdout-bucket names). | FORWARD-ONLY |

## 2. Selection rule (applied before any holdout read)

Take one candidate per independent idea with a clean holdout: the highest row of that idea in the robustness ranking (worst-case excess/yr). Stock rows whose worst case sits inside cost error (<= +3pp) are left out. Each extra weak test would cut the Bonferroni alpha for the others.

- Low-BTC-beta idea: **r25-crypto-btcbeta-low** (rank 2, worst case +26.4pp). r27-crypto-lowbeta-rankw (rank 3) has the lower discovery p but is the same idea, so it is not tested separately.
- Crypto trend-filter idea: **r27-crypto-scaled-trend** (rank 5, worst case +17.6pp).

k = 2.

## 3. Frozen files (sha256)

| File | sha256 |
|---|---|
| research/hunt2/strategies/r25-crypto-btcbeta-low.mjs | 7557c69f126a50147b072083ad5cfe2e7f3c2b4a3bea8d160183bacae6fbec91 |
| research/hunt2/strategies/r27-crypto-scaled-trend.mjs | 2940d6945243df19fcc77f10bfd4f9e74c9124caeb4e2e1ac4ff6897bd1f7f9d |
| research/hunt2/strategies/dv-ctrl-r25-crypto-btcbeta-low.mjs (control) | a27354b796977863263a0face9cdc908b5d680b8921f4587a7c0d6eb5499a2d5 |
| research/hunt2/strategies/dv-ctrl-r27-crypto-scaled-trend.mjs (control) | 1ab5a10e883e2c28c2faf9868a575e20cfd708c9c84fd899f95d25e08e6da8c9 |
| research/hunt2/harness.mjs | 8da0f9bf1d2284b55a3b30c8693f1310afe6290809889392989e829e74f3946e |
| research/hunt2/data.mjs | 7439f80136985e388c943fbbd5adcf3fe795c588b2dfce40aff9a30d2e71ec3d |
| scripts/research/confirm-hunt-2026-09-29.mjs (runner) | 6be7c80cd427f285de3203378e9c2a7ac80d9821c8459b3efbc6547a7522a954 |

The runner checks every hash before it runs. It refuses to run if its output JSON exists, if a RESULT line for either candidate is already in the log, or if the log has no CONFIRMATORY line naming this runner's hash.

## 4. Test design

- **Engine.** The hunt2 harness itself. The runner writes a runtime copy of `harness.mjs` with two patches: the random-control seeds go from 200 to 2 (unused here), and `evaluate()`'s daily R/B/days are captured. Bars go in through `evaluate()`'s own `data` override. Before any fetch, a self-check on discovery data must reproduce the unpatched `evaluate()` CAGR, Sharpe, maxDD, B&H CAGR and p to 1e-9 for all four files. It passed on 2026-09-29.
- **Assets.** The 18 CRYPTO_DAILY discovery-bucket pairs (BTC BNB XRP ADA DOGE LTC LINK TRX BCH ATOM ETC DASH ZEC AVAX UNI NEAR AAVE HBAR). ETH and SOL are holdout-bucket assets and are excluded.
- **Data.**
  - Pre-boundary inputs come from the discovery cache through `loadBars()`, so they are the same bars discovery used.
  - Post-boundary bars come from data.binance.vision spot 1d klines (the exchange behind the cache), fetched once: monthly files 2025-02..2026-08 and daily files 2026-09. Only completed bars count (bar open + 1 day <= run time).
  - A pair is dropped before any return is computed if its fetch fails, its OHLC is invalid, any close on the 2025-02-01..2025-03-14 overlap differs from the cache by more than 0.1%, or it has bars on fewer than 90% of the scored sessions. A dropped pair leaves the universe for the strategy, the benchmark and the control alike. If BTC is dropped, the exam cannot run.
- **Holdout window.** Return days from 2025-03-15 (DISCOVERY_END) to the latest complete daily bar. Each rule's path is computed continuously from 2017 and scored only on those days, so the book in force on 2025-03-15 was decided on discovery data and is carried in without an extra entry charge.
- **Costs.** Harness defaults: 0.10% per side plus the per-pair measured slippage (`slippageFor`), charged on every weight change. The benchmark pays none.
- **Benchmark.** Equal-weight long of the same pairs, rebalanced daily across the pairs trading that day (harness B&H).
- **Primary metric.** excess/yr = CAGR(strategy) - CAGR(B&H) over the scored days.
- **Test.** One-sided circular block bootstrap of daily log(1+R) - log(1+B) (`blockBootstrapPValueRefined`, seed 42), the harness's own excess test. Bonferroni alpha = 0.05 / 2 = **0.025** per candidate.
- **Dumb control.** Each candidate's pre-registered matched-frequency buy-after-drop control from robustness-0929, run on the same data, engine and costs. It holds the N pairs with the worst 5-day return, equal weight, at the candidate's rebalance frequency and mean gross: dv-ctrl-r25-crypto-btcbeta-low is N=7, gross 1, monthly; dv-ctrl-r27-crypto-scaled-trend is N=10, gross 0.541, daily.
- **Pass criteria.**
  - CONFIRMED iff excess/yr > 0 AND p < 0.025 AND the candidate's excess/yr is above its control's excess/yr.
  - INCONCLUSIVE if there are fewer than 250 scored days or fewer than 12 in-window rebalances.
  - A miss with excess > 0 and p >= 0.025 is "not confirmed, underpowered", never "falsified".
  - Reported but not binding: Sharpe and its paired bootstrap p, maxDD, and the control's CAGR and Sharpe.
- **Output.** `research/hunt2/holdout-exam-0929.json` and the fetched bars in `holdout-exam-0929.data.json.gz`. One RESULT line per candidate goes in the holdout log in the 2026-09-24 format.

## 5. Limitations stated in advance

- About 18.5 months of daily data is little: roughly 18 monthly rebalances for r25. A real effect of the discovery size can still miss alpha 0.025.
- The selection is mechanical, but the 2025-26 crypto path is public knowledge (for example, whether alts kept up with BTC), so this time holdout is not blind the way an unseen asset would be. Only the log-recorded research reads are treated as contamination.
- Both candidates are long-only crypto baskets that lean toward BTC or toward cash, so their holdout results are not independent of each other.
- If either candidate is CONFIRMED, it goes to forward paper trading only (rules frozen by sha, with a review date). Nothing goes on the site.
