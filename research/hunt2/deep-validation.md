# Deep validation: mlq-kalman-trend-filter and social-ta-vwma-cross

Status: PRE-REGISTERED 2026-09-15, written before any run below. Results are appended under "Results" afterwards; nothing in this section is edited after the first run.

## 0. Leads as ledgered (untouched)

| id | Sharpe | B&H Sharpe | maxDD | B&H maxDD | CAGR | B&H CAGR | pSharpe | qSharpe (124-row ledger) |
|---|---|---|---|---|---|---|---|---|
| mlq-kalman-trend-filter | 1.64 | 1.00 | 31% | 86% | 63.7% | 62.8% | 0.0073 | 0.28 |
| social-ta-vwma-cross | 1.52 | 1.00 | 49% | 86% | 86.0% | 62.8% | 0.0149 | 0.37 |

Mechanism facts (params only, no data): the Kalman filter's gain does not depend on the data. With q=1e-5, r=1e-3 it settles to K0=0.299, K1=0.067, a Holt double-exponential smoother whose level alpha matches an EMA of about 5.7 bars. The rule "slope > 0 and close > level" is a fast price-above-rising-average filter. VWMA(20) is close > volume-weighted SMA(20).

## 1. Checks and exact definitions (frozen)

Universe: harness default CRYPTO_DAILY (18 discovery pairs), 1d, discovery dates only, harness costs. No holdout asset or date is read. Nothing below is tuned; every parameter is fixed here.

### Check 1: dumb controls (ledgered, via run.mjs, each 1 run)

| module id | rule (long 1 / flat 0) |
|---|---|
| dv-ctrl-sma50 | close > SMA(close,50) |
| dv-ctrl-sma100 | close > SMA(close,100) |
| dv-ctrl-sma200 | close > SMA(close,200) |
| dv-ctrl-ema20-50 | EMA(20) > EMA(50) |
| dv-ctrl-mom20 | close > close 20 bars ago |
| dv-ctrl-sma20 | close > SMA(close,20). The mechanism twin for VWMA(20), without volume weighting |
| dv-ctrl-ema6-rising | close > EMA(6) and EMA(6) > previous EMA(6). The mechanism and frequency twin for Kalman |

"Best dumb control" is the control with the highest full-period Sharpe, with ties broken by lower maxDD. A lead **beats** it only if it has a higher Sharpe by at least 0.10 AND a lower maxDD. Diagnostic: a paired block bootstrap p of Sharpe(lead) − Sharpe(control), using harness `sharpeDiffPValue`, block 14.

### Check 2: execution realism
- 2x costs: the same positions, each asset's cost doubled. This is a replica computation, not ledgered, because the positions don't change.
- Delay 1 bar: position at t = the lead's raw signal at t−1. The signal at close t fills at close t+1. Ledgered modules `dv-kalman-delay1` and `dv-vwma-delay1`.
- Weekly: the position changes only on the last daily bar of a Monday-start UTC week (Sunday), and holds otherwise. Ledgered modules `dv-kalman-weekly` and `dv-vwma-weekly`.

### Check 3: breadth (replica)
- For each of the 18 assets: strategy Sharpe and maxDD vs B&H on that asset's own bars.
- Count the assets where Sharpe improved and where maxDD improved.
- Pooled portfolio rerun excluding the assets whose B&H maxDD ≥ 90%.
- The BTC-only row.

### Check 4: regimes (replica, slices of the same daily series)
- A = 2019-01-01..2021-12-31
- B = 2022-01-01..2022-12-31
- C = 2023-01-01..2025-03-14

For each slice: Sharpe, maxDD and CAGR for the lead, B&H and the best dumb control.

### Check 5: correlation (replica)
Pearson correlation of Kalman vs VWMA positions, pooled over every asset-day. Also the correlation of their daily portfolio returns, and of each lead against the best control and against its twin.

### Check 6: effective trials
Count the ledger rows (and prior EDGE work) that are price trend or momentum filters.

Replica = `research/hunt2/deep-validation.analyze.mjs`. It rebuilds positions and returns with the harness's own `makeSignalCtx`, `metrics` and cost function logic. Before any replica number is used, it MUST reproduce each lead's ledgered CAGR, Sharpe and maxDD to 4 decimals. If it does not, the replica numbers are void.

## 2. Verdict rule (frozen)

- **(c) artifact** if ANY of these holds:
  - delay-1 Sharpe ≤ B&H Sharpe
  - delay-1 maxDD > 75% of B&H maxDD
  - 2x-cost Sharpe ≤ B&H Sharpe
  - Sharpe improves on fewer than 10 of 18 assets
  - the Sharpe advantage over B&H is present in regime B only (A and C both ≤ B&H)
- **(b) equivalent to a simple trend filter** if not (c), and the lead fails to beat the best dumb control (the rule in Check 1). A lead that fails to beat its mechanism twin on the same rule is also (b).
- **(a) distinct risk improver worth one holdout confirmation run** only if it clears every item above AND delay-1 Sharpe still exceeds the best dumb control's (undelayed) Sharpe.
- If Kalman and VWMA have position correlation > 0.8, they are one finding: the verdict is given once, for the better of the two.

---

# Results (appended after the runs, 2026-09-15)

11 new ledgered runs: 7 controls and 4 execution variants. The ledger is now 135 distinct tests. Replica: `node --import tsx research/hunt2/deep-validation.analyze.mjs`. It reproduced all 9 ledgered CAGR/Sharpe/maxDD values to 4 dp, so its numbers are valid.

## Check 1: dumb controls

B&H: Sharpe 1.00, maxDD 86%, CAGR 62.8%.

| id | Sharpe | maxDD | CAGR | trades | exposure | avg hold (d) | p lead Kalman > row | p lead VWMA > row |
|---|---|---|---|---|---|---|---|---|
| mlq-kalman-trend-filter | 1.64 | 31% | 63.7% | 3251 | 27% | 3.2 | - | lead worse |
| social-ta-vwma-cross | 1.52 | 49% | 86.0% | 2248 | 46% | 8.0 | 0.30 | - |
| dv-ctrl-sma50 | 1.45 | 52% | 82.4% | 1219 | 46% | 15.0 | 0.25 | 0.35 |
| dv-ctrl-sma100 | 0.99 | 72% | 42.5% | 865 | 45% | 20.6 | 0.027 | 0.028 |
| dv-ctrl-sma200 | 0.66 | 72% | 21.3% | 609 | 44% | 28.2 | 0.001 | 0.003 |
| dv-ctrl-ema20-50 | 1.31 | 59% | 73.6% | 339 | 46% | 53.0 | 0.15 | 0.20 |
| dv-ctrl-mom20 | 1.45 | 51% | 82.7% | 1878 | 49% | 10.2 | 0.25 | 0.31 |
| **dv-ctrl-sma20 (best control)** | **1.59** | **44%** | **93.6%** | 2160 | 47% | 8.6 | 0.42 | lead worse |
| dv-ctrl-ema6-rising (Kalman twin) | 1.08 | 61% | 50.6% | 4705 | 48% | 4.0 | 0.003 | 0.002 |

- Kalman vs SMA20: Sharpe +0.04 (rule needs +0.10), maxDD 31% vs 44%. **Does not beat.** Bootstrap p=0.42.
- Kalman vs its EMA(6) twin: beats it (Sharpe +0.55, maxDD 31% vs 61%).
- VWMA vs SMA20, which is both the best control and its twin: Sharpe −0.07, maxDD 49% vs 44%, CAGR 86% vs 94%. **Does not beat.** Plain SMA20 is better on all three.
- Slow filters (SMA100/200) are clearly worse than B&H on Sharpe in this universe. The short filters (20–50 bars) all land between 1.3 and 1.6.

## Check 2: execution realism

| id | Sharpe | maxDD | CAGR | pSharpe vs B&H |
|---|---|---|---|---|
| Kalman, 2x costs | 1.43 | 34% | 52.6% | (replica) |
| VWMA, 2x costs | 1.43 | 51% | 77.4% | (replica) |
| SMA20, 2x costs | 1.50 | 45% | 85.0% | (replica) |
| dv-kalman-delay1 | 1.32 | 34% | 47.1% | 0.13 |
| dv-kalman-weekly | 1.11 | 56% | 36.0% | 0.38 |
| dv-vwma-delay1 | 1.66 | 56% | 101.2% | 0.002 |
| dv-vwma-weekly | 1.29 | 70% | 69.2% | 0.10 |

- Kalman loses 0.32 Sharpe from a one-bar delay and 0.53 on weekly rebalancing. Its advantage leans on the same-close fill of a 3-day hold.
- VWMA's Sharpe *rises* with a delay, but its maxDD worsens to 56%, so what it's capturing is not a fast signal.
- Weekly rebalancing pushes VWMA's maxDD (70%) past the 75%-of-B&H line (64%).

## Check 3: breadth (each asset on its own bars)

| asset | B&H Sh | B&H DD | Kalman Sh | Kalman DD | VWMA Sh | VWMA DD | SMA20 Sh | SMA20 DD |
|---|---|---|---|---|---|---|---|---|
| BTC | 0.91 | 83% | 0.82 | 39% | 0.91 | 70% | 1.04 | 67% |
| BNB | 1.28 | 80% | 1.20 | 60% | 1.14 | 82% | 1.27 | 78% |
| XRP | 0.64 | 85% | 0.73 | 68% | 0.61 | 83% | 0.82 | 79% |
| ADA | 0.66 | 94% | 0.80 | 63% | 1.00 | 69% | 1.05 | 67% |
| DOGE | 0.87 | 92% | 1.25 | 49% | 1.15 | 84% | 1.20 | 82% |
| LTC | 0.32 | 93% | 0.41 | 60% | 0.52 | 65% | 0.57 | 75% |
| LINK | 1.04 | 90% | 0.79 | 67% | 1.03 | 74% | 1.00 | 65% |
| TRX | 0.69 | 83% | 0.50 | 57% | 0.60 | 61% | 0.55 | 72% |
| BCH | 0.58 | 94% | 0.63 | 55% | 0.68 | 55% | 0.71 | 68% |
| ATOM | 0.59 | 92% | 0.44 | 84% | 0.41 | 81% | 0.48 | 75% |
| ETC | 0.54 | 90% | 0.68 | 62% | 0.62 | 83% | 0.59 | 88% |
| DASH | 0.27 | 95% | 0.48 | 69% | 0.40 | 79% | 0.36 | 82% |
| ZEC | 0.44 | 94% | 0.89 | 72% | 0.39 | 85% | 0.65 | 80% |
| AVAX | 0.83 | 93% | 1.69 | 40% | 1.39 | 72% | 1.47 | 75% |
| UNI | 0.68 | 92% | 0.39 | 65% | 0.59 | 81% | 0.57 | 75% |
| NEAR | 0.77 | 95% | 0.67 | 66% | 0.95 | 79% | 1.05 | 74% |
| AAVE | 0.85 | 92% | 0.55 | 79% | 0.69 | 73% | 0.70 | 72% |
| HBAR | 0.83 | 93% | 0.53 | 90% | 0.85 | 81% | 0.66 | 84% |

Assets that improve, on Sharpe / on maxDD (of 18):
- Kalman **9** / 18
- VWMA **10** / 17
- SMA20 11 / 18

Every filter cuts drawdown almost everywhere. The Sharpe gain is a coin flip per asset. Kalman's portfolio Sharpe is carried by AVAX (1.69 vs 0.83), ZEC, DOGE and DASH. On BTC alone, Kalman is 0.82 vs B&H 0.91 (maxDD 39% vs 83%), VWMA 0.91 (70%), and SMA20 1.04 (67%).

Excluding the 13 assets whose B&H maxDD ≥ 90% leaves 5 (BTC BNB XRP TRX ETC):

| series | Sharpe | maxDD |
|---|---|---|
| B&H | 1.13 | 82% |
| Kalman | 1.47 | 29% |
| VWMA | 1.32 | 54% |
| SMA20 | 1.42 | 49% |

So the effect is not only from the coins that crashed 90%.

## Check 4: regimes

| regime | B&H Sh / DD | Kalman Sh / DD / CAGR | VWMA Sh / DD / CAGR | SMA20 Sh / DD / CAGR |
|---|---|---|---|---|
| A 2019–2021 | 1.74 / 65% | 2.54 / 19% / 124% | 2.17 / 41% / 166% | 2.28 / 39% / 191% |
| B 2022 | −0.98 / 70% | −0.17 / 16% / −6% | −0.79 / 33% / −28% | −0.71 / 32% / −27% |
| C 2023–2025-03 | 1.08 / 49% | **0.82** / 25% / 19% | 1.16 / 43% / 46% | 1.02 / 44% / 38% |

- It is not all from avoiding 2022. Every filter beats B&H in regime A as well.
- Kalman's in-sample distinctiveness is mostly 2022 (−0.17 vs −0.71 for SMA20).
- Kalman is below B&H on Sharpe in the most recent regime, C. That is the regime closest to the holdout.

## Check 5: correlation

| pair | position corr | daily return corr |
|---|---|---|
| Kalman vs VWMA | 0.505 | 0.788 |
| Kalman vs EMA(6) twin | 0.586 | 0.847 |
| Kalman vs SMA20 | 0.478 | 0.775 |
| **VWMA vs SMA20** | **0.921** | **0.988** |

- Kalman and VWMA are below the 0.8 position line, so they get separate verdicts.
- VWMA is SMA20 with volume weighting that adds nothing.
- Kalman's returns are still 0.78 correlated with SMA20. It is mostly the same long-in-uptrends exposure at 27% time-in-market instead of 47%.

## Check 6: effective trials

- The hunt2 ledger holds **46 price trend/momentum filter runs out of 135** (35 before this validation). Of those, **29 are on this exact crypto-daily universe** (18 before), including the leads' 4 robustness variants.
- EDGE RESEARCH §12 already ran **396 cells** of daily SMA 50/100/200 trend on crypto (0 survived; "cut max drawdown to a median 0.81x"). hunt-1 R1 and R6 re-ran golden-cross and SMA200 rules.
- Raw count: over 440 trend-filter trials. They are highly correlated: daily returns of short filters correlate 0.78–0.99. The effective independent count is maybe 10–20.
- A best-of-~30 Sharpe of 1.64 among variants of one exposure (SMA20 alone gets 1.59) is what the maximum of a correlated family looks like. It is not a new mechanism.
- The BH q values move with the family: Kalman's qSharpe is 0.198 at 135 rows (0.28 at 124). The new controls added small p-values, and that lowered everyone's q, the controls' included. q is not evidence for the leads.

## Verdict (applying the frozen rule)

- **social-ta-vwma-cross: (b) equivalent to a simple trend filter — use the SMA filter instead.**
  - It passes every artifact check: delay-1 1.66, 2x costs 1.43, 10/18 assets, above B&H in all three regimes.
  - It loses to plain close > SMA(20) on Sharpe (1.52 vs 1.59), maxDD (49% vs 44%) and CAGR (86% vs 94%).
  - The two are 0.92 position-correlated.
- **mlq-kalman-trend-filter: (c) artifact under the pre-registered breadth rule.** Sharpe improves on 9 of 18 assets, below the floor of 10.
  - It also fails the "beats best control" test: +0.04 Sharpe vs SMA20, p=0.42.
  - Its extra drawdown cut comes with 27% exposure and 64% CAGR (SMA20: 94%).
  - It depends on the same-close fill (−0.32 Sharpe delayed, 1.11 weekly).
  - It is below B&H in the latest regime.
- **Plain-English answer to the key question:** this is "crypto trend filters cut drawdown", a known effect. Neither lead adds anything a 20-day SMA doesn't already do. Neither qualifies as (a).

## Holdout protocol proposal (frozen, NOT run; owner decides)

The pre-registered rule said a holdout run is only warranted for an (a) verdict, and neither lead got one. If the owner still wants to spend the holdout, the defensible single test is the known effect itself, not either lead. Caveat: SMA20 was picked post hoc as best of 7 controls, so a pass confirms "a short crypto SMA filter is a risk improver out of sample". It does not confirm an edge.

- **Config:** `research/hunt2/strategies/dv-ctrl-sma20.mjs` byte-exact, sha256 `5713ea6fd3ce1c01f4f7fc295c77893dd4434c845bb770e124ed6a0db146d77d`.
  - Long when close > SMA(close,20), else flat.
  - Daily, same-close fill (as ledgered).
  - Harness costs: 0.10%/side plus measured slippage.
  - Equal-weight across assets trading that day. The benchmark is a daily-rebalanced equal-weight long without costs.
  - A secondary series is computed in the same run: the identical rule with a 1-bar delayed fill.
- **Assets:** the holdout-bucket crypto pairs under `src/lib/quant/holdout.ts` (seed `edge-holdout-v1`) with Binance spot USDT daily data: ETH, SOL, DOT, MATIC, XLM, FIL, INJ, SAND, EOS.
  - An asset is included only if it has ≥ 90% of the window's daily bars. MATIC's migration to POL is expected to drop it. This rule is applied before any return is computed.
  - No substitutions.
- **Dates:** 2025-03-15 00:00 UTC (DISCOVERY_END) through 2026-09-14 close.
  - No pre-boundary bars are read. The first 19 bars of each asset are warm-up, and both strategy and benchmark are measured from the first bar with a full SMA20.
- **Pass criteria (all required, one shot, no re-run):**
  1. Sharpe > B&H Sharpe
  2. maxDD ≤ 75% of B&H maxDD
  3. CAGR ≥ 60% of B&H CAGR. If B&H CAGR ≤ 0, strategy CAGR must be ≥ B&H CAGR instead.
  4. One-sided paired block bootstrap p < 0.10 on the Sharpe difference: harness `sharpeDiffPValue`, block 14, single test so no FDR.
  5. The delayed-fill series also has Sharpe > B&H.
- **Power warning:** about 540 days on 8–9 correlated coins. A fail is weak evidence against the effect, and a pass is weak evidence for it. Neither turns it into an edge.
- **Needs:** a holdout-mode runner. The hunt2 harness is discovery-only by design and must not be modified to read holdout. The owner decides whether to build one.
