# Robustness battery, top 20 hunt strategies (2026-09-29)

Status: PRE-REGISTERED before any battery run. Sections under "Pre-registration" are not edited after the first run; results are appended under "Results".
Discovery data only (harness default, discovery end 2025-03-15). No holdout asset or date is read. Nothing is tuned.

## Pre-registration

### Selection (frozen)
`node research/hunt2/robustness-0929.select.mjs`: latest result per id in `results/*.json`, trades >= 30 (or rebalances >= 36), >= 2 assets, ranked by `excess.annual` (CAGR minus equal-weight B&H CAGR). At most 4 per harness `family` and at most 4 per idea (idea "crypto-trend-filter" groups the r27-cx-*, scaled-trend, vwma and kalman crypto price-trend filters). dv-*, `__rob*` and ctrl rows are validation artefacts, not hunt strategies, and are skipped. PROMISING rows would be added even outside the top 20 (the ledger verdict list is checked; see Results).

### Convention followed (deep-validation.md)
- Replica computations that keep positions/rules fixed (2x costs, drop-asset) are NOT ledgered. They use `harness-battery.mjs`, a runtime-generated copy of `harness.mjs` with three patches (cost multiplier, asset drop list, attribution/return capture; 2 random seeds instead of 200). Before any battery number is used, the unpatched battery run MUST reproduce the ledgered CAGR, Sharpe and maxDD to 4 dp; a strategy that does not reproduce is marked VOID for (a)/(b)/(e) and reported with the battery's own baseline.
- Parameter neighbours are new strategy files `<id>__rob1.mjs` (-25%) and `<id>__rob2.mjs` (+25%), ledgered via `slot-run.sh` (run.mjs), as for social-ta-vwma-cross__rob1/2. Existing `__rob1/2` files with the same +-25% are reused, not rerun.
- Matched dumb controls are new modules `dv-ctrl-<id>.mjs` (family `deep-validation-control`), ledgered via `slot-run.sh`, one run each.
- Every ledgered run counts as a test in the FDR family. This battery adds up to about 60 rows; q-values of every earlier row move, as noted in deep-validation.md Check 6.

### The battery (frozen)
(a) Costs x2: every per-side cost doubled (crypto 2 x (0.10% + slippage), stocks/ETFs 0.10%). PASS if excess/yr (CAGR minus B&H CAGR) > 0.

(b) Drop the top contributor: contribution of asset a = sum over days of (its part of the strategy's daily return minus its part of the B&H daily return), from the harness's own daily grid (portfolio mode: the strategy's weights restricted to that asset, costs included). The asset with the largest contribution is removed from the universe (strategy and B&H both) and the strategy rerun unchanged. Leave-one-out over every asset instead when the universe has <= 6 assets; PASS needs excess > 0 in all of them. If the drop makes the strategy untestable (rejected, fewer than 5 trades, or it needs that asset by construction), the next-highest contributor is tried once; if that also fails, (b) is NOT DEMONSTRATED and counts as a fail.

(c) Two parameter neighbours: the main lookback/threshold x0.75 and x1.25, rounded to the nearest integer (JS Math.round), dependent warm-up parameters (`need`) moved with it, everything else unchanged. PASS needs excess/yr > 0 in BOTH.
| id | -25% | +25% |
|---|---|---|
| r27-cx-tsmom28-fngfear | lookback 21 | lookback 35 |
| s29-cx-fng-cond-mom | lookback 11 | lookback 18 |
| r25-crypto-btcbeta-low | window 68 (need 70) | window 113 (need 115) |
| r27-crypto-lowbeta-rankw | betaWindow 68 (need 70) | betaWindow 113 (need 115) |
| r27-crypto-mom-buffer | lookback 16 (need 18) | lookback 26 (need 28) |
| mlq-feature-neutral-momentum | lookback 68 | lookback 113 |
| r27-crypto-scaled-trend | windows 15/38/75 (need 77) | windows 25/63/125 (need 127) |
| r27-cx-tsmom-vote3h | horizons 11/21/42 | horizons 18/35/70 |
| social-ta-vwma-cross | vwmaLength 15 (existing __rob2) | vwmaLength 25 (existing __rob1) |
| r27-crypto-boom-only | lookback 21 (need 23) | lookback 35 (need 37) |
| macro-crypto-btc-dominance-altseason-rotation | lookbackDays 21 | lookbackDays 35 |
| s29-us-vix-beta | window 189 | window 315 |
| r25-qqq-agg-volmanaged | window 16 (need 18) | window 26 (need 28) |
| r24b-lo-industry-momentum | lookbackMonths 5 | lookbackMonths 8 |
| r24b-lo-xsec-momentum-12-1 | lookback 189 | lookback 315 |
| macro-hy-credit-spread-risk-off | lookbackWeeks 3 | lookbackWeeks 5 |
| r25-qqq-agg-dualmom | lookback 189 (need 191) | lookback 315 (need 317) |
| s29-etf-dynamic-hedge-selection | window 47 | window 79 |
| mlq-risk-parity-crypto | volWindow 15 | volWindow 25 |
| r24b-rev-low-turnover | returnLookback 16 | returnLookback 26 |
(The table is the selection as computed by the script; the replaced ids are listed in Results if the selection differs.)

(d) Matched-frequency buy-after-drop control, same assets, same costs, ledgered as `dv-ctrl-<id>`.
- Signal-mode candidates: long after a 1-day close-to-close drop of at least thr, held for holdBars bars (`meta.holdBars`). holdBars = round(candidate average hold) = round(exposure x total asset-bars / trades). thr is set by bisection on price data only (entry counts, no returns) so the control's trade count equals the candidate's (within 1%).
- Portfolio-mode candidates: same universe, same rebalance frequency, N = round(candidate mean names held on invested rebalances) names with the WORST 5-day return, equal weight, total gross = candidate mean gross on invested rebalances. Invested at every rebalance.
- The candidate BEATS the control only if its CAGR is higher AND its Sharpe is higher (ledgered numbers, same days).

(e) Exposure check: the candidate's average exposure e (harness `portfolio.exposure`: fraction of asset-bars held in signal mode, mean gross weight in portfolio mode) applied to the equal-weight daily-rebalanced B&H of the same assets: series e x B (no costs, cash 0). The candidate BEATS it only if CAGR(candidate) > CAGR(e x B) AND Sharpe(candidate) > Sharpe(B&H) (Sharpe of e x B equals B&H's Sharpe).

### Verdict rule (frozen)
SURVIVES = passes (a), (b), (c) both, (d) and (e). Anything not demonstrated is a fail. Survivors are ranked by worst-case excess/yr across the four stress runs (a), (b), (c-), (c+) (higher = more robust), ties by CAGR margin over the control. Passing this battery does not make a strategy an edge: it is one discovery-window sample, all rows are in one FDR family, and the crypto-trend group is highly correlated (deep-validation.md: a 20-day SMA gets Sharpe 1.59).

---

# Results (appended after the runs, 2026-09-29)

Run: `robustness-0929.select.mjs` (selection), `robustness-0929.mjs` (neighbour files, battery, controls, report). 38 new `__rob` ledger runs (19 strategies x 2; social-ta-vwma-cross reused its existing __rob1/__rob2), 20 new `dv-ctrl-<id>` ledger runs. The ledger is now 638 distinct tests. The unpatched battery baseline reproduced all 20 ledgered CAGR/Sharpe/maxDD values to 4 dp, so no strategy is VOID. Per-strategy raw output: `research/hunt2/robustness-0929/<id>.json`.

No row is PROMISING or RISK_IMPROVER in the ledger after these runs (best BH q on the excess track is 0.13, `r25-qqq-agg-volmanaged__rob1`; the best of the 20 selected, `r27-crypto-lowbeta-rankw`, has p=1.6e-3, q=0.18). So no PROMISING rows were added to the selection.

## Selection (20)
| # | id | family | mode | assets | excess/yr | CAGR (B&H) | Sharpe (B&H) | maxDD (B&H) | trades / rebal | exposure |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | r27-cx-tsmom28-fngfear | sentiment | signal | 18 | +40.6pp | 103% (63%) | 1.38 (1.00) | 62% (86%) | 1197 / 0 | 66% |
| 2 | s29-cx-fng-cond-mom | momentum | portfolio | 18 | +39.5pp | 102% (63%) | 1.25 (1.00) | 82% (86%) | 186 / 393 | 99% |
| 3 | r25-crypto-btcbeta-low | equity-factors | portfolio | 18 | +38.9pp | 102% (63%) | 1.24 (1.00) | 87% (86%) | 68 / 91 | 99% |
| 4 | r27-crypto-lowbeta-rankw | equity-factors | portfolio | 18 | +31.8pp | 95% (63%) | 1.20 (1.00) | 87% (86%) | 79 / 91 | 99% |
| 5 | r27-crypto-mom-buffer | momentum | portfolio | 18 | +31.6pp | 94% (63%) | 1.18 (1.00) | 86% (86%) | 242 / 395 | 100% |
| 6 | mlq-feature-neutral-momentum | momentum | portfolio | 18 | +29.2pp | 92% (63%) | 1.20 (1.00) | 79% (86%) | 585 / 2377 | 86% |
| 7 | r27-crypto-scaled-trend | trend | portfolio | 18 | +26.1pp | 89% (63%) | 1.40 (1.00) | 65% (86%) | 2069 / 2707 | 53% |
| 8 | r27-cx-tsmom-vote3h | trend | signal | 18 | +25.8pp | 89% (63%) | 1.40 (1.00) | 63% (86%) | 1695 / 0 | 50% |
| 9 | social-ta-vwma-cross | momentum | signal | 18 | +23.2pp | 86% (63%) | 1.52 (1.00) | 49% (86%) | 2248 / 0 | 46% |
| 10 | r27-crypto-boom-only | trend | portfolio | 18 | +18.2pp | 81% (63%) | 1.15 (1.00) | 81% (86%) | 89 / 395 | 100% |
| 11 | macro-crypto-btc-dominance-altseason-rotation | macro-intermarket | portfolio | 18 | +13.2pp | 76% (63%) | 1.09 (1.00) | 88% (86%) | 203 / 395 | 100% |
| 12 | s29-us-vix-beta | volatility | portfolio | 40 | +6.2pp | 24% (18%) | 0.86 (0.96) | 46% (32%) | 48 / 1872 | 88% |
| 13 | r25-qqq-agg-volmanaged | volatility | portfolio | 2 | +5.8pp | 13% (7%) | 0.82 (0.66) | 41% (32%) | 105 / 242 | 100% |
| 14 | r24b-lo-industry-momentum | equity-factors | portfolio | 171 | +5.5pp | 20% (14%) | 0.95 (0.80) | 34% (39%) | 45 / 97 | 95% |
| 15 | r24b-lo-xsec-momentum-12-1 | equity-factors | portfolio | 171 | +5.3pp | 20% (14%) | 0.83 (0.80) | 37% (39%) | 90 / 90 | 88% |
| 16 | macro-hy-credit-spread-risk-off | macro-intermarket | portfolio | 25 | +4.7pp | 12% (7%) | 0.65 (0.70) | 54% (26%) | 9 / 1053 | 100% |
| 17 | r25-qqq-agg-dualmom | trend | portfolio | 2 | +3.8pp | 11% (7%) | 0.66 (0.66) | 30% (32%) | 22 / 242 | 100% |
| 18 | s29-etf-dynamic-hedge-selection | other | portfolio | 8 | +3.8pp | 9% (6%) | 0.75 (0.69) | 41% (25%) | 56 / 239 | 98% |
| 19 | mlq-risk-parity-crypto | volatility | portfolio | 18 | +3.3pp | 66% (63%) | 1.03 (1.00) | 87% (86%) | 382 / 392 | 99% |
| 20 | r24b-rev-low-turnover | mean-reversion-statarb | portfolio | 171 | +3.0pp | 17% (14%) | 0.84 (0.80) | 46% (39%) | 90 / 102 | 99% |

### Battery per strategy (excess/yr = CAGR minus B&H CAGR; every number is harness output)

| id | replica | base | (a) costs x2 | (b) drop | (c-) -25% | (c+) +25% | (d) control CAGR / Sharpe vs cand. | (e) scaled B&H CAGR | verdict |
|---|---|---|---|---|---|---|---|---|---|
| r27-cx-tsmom28-fngfear | ok | +40.6pp | PASS +35.6pp | PASS ADA: +35.1pp | PASS +13.7pp | PASS +37.8pp | PASS 54% / 0.95 vs 103% / 1.38 | PASS 50% (e=66%; cand 103%) | **SURVIVES** |
| s29-cx-fng-cond-mom | ok | +39.5pp | PASS +32.1pp | PASS BTC: ERR; HBAR: +27.4pp | PASS +43.0pp | PASS +52.2pp | PASS 27% / 0.72 vs 102% / 1.25 | PASS 63% (e=99%; cand 102%) | **SURVIVES** |
| r25-crypto-btcbeta-low | ok | +38.9pp | PASS +37.9pp | PASS XRP: +26.4pp | PASS +50.6pp | PASS +47.4pp | PASS 35% / 0.79 vs 102% / 1.24 | PASS 63% (e=99%; cand 102%) | **SURVIVES** |
| r27-crypto-lowbeta-rankw | ok | +31.8pp | PASS +31.0pp | PASS XRP: +24.4pp | PASS +31.4pp | PASS +29.8pp | PASS 66% / 1.02 vs 95% / 1.20 | PASS 63% (e=99%; cand 95%) | **SURVIVES** |
| r27-crypto-mom-buffer | ok | +31.6pp | PASS +26.9pp | PASS AVAX: +22.8pp | PASS +52.1pp | PASS +49.3pp | PASS 27% / 0.72 vs 94% / 1.18 | PASS 63% (e=100%; cand 94%) | **SURVIVES** |
| mlq-feature-neutral-momentum | ok | +29.2pp | PASS +18.6pp | PASS ADA: +8.2pp | PASS +55.5pp | PASS +3.0pp | PASS -21% / 0.23 vs 92% / 1.20 | PASS 59% (e=86%; cand 92%) | **SURVIVES** |
| r27-crypto-scaled-trend | ok | +26.1pp | PASS +20.8pp | PASS ADA: +22.2pp | PASS +26.3pp | PASS +17.6pp | PASS 24% / 0.69 vs 89% / 1.40 | PASS 42% (e=53%; cand 89%) | **SURVIVES** |
| r27-cx-tsmom-vote3h | ok | +25.8pp | PASS +19.1pp | PASS ETC: +22.2pp | PASS +15.0pp | PASS +22.8pp | PASS 30% / 0.73 vs 89% / 1.40 | PASS 40% (e=50%; cand 89%) | **SURVIVES** |
| social-ta-vwma-cross | ok | +23.2pp | PASS +14.6pp | PASS LTC: +17.7pp | PASS +9.6pp | PASS +27.4pp | PASS 40% / 0.84 vs 86% / 1.52 | PASS 37% (e=46%; cand 86%) | **SURVIVES** |
| r27-crypto-boom-only | ok | +18.2pp | PASS +14.2pp | PASS BNB: +17.5pp | FAIL -11.9pp | PASS +26.0pp | PASS 36% / 0.80 vs 81% / 1.15 | PASS 63% (e=100%; cand 81%) | **fails** |
| macro-crypto-btc-dominance-altseason-rotation | ok | +13.2pp | PASS +5.8pp | PASS BTC: ERR; AVAX: +1.7pp | PASS +18.8pp | PASS +4.8pp | PASS -12% / 0.37 vs 76% / 1.09 | PASS 63% (e=100%; cand 76%) | **SURVIVES** |
| s29-us-vix-beta | ok | +6.2pp | PASS +6.1pp | PASS NVDA: +3.1pp | PASS +7.9pp | PASS +6.0pp | PASS 10% / 0.49 vs 24% / 0.86 | FAIL 16% (e=88%; cand 24%) | **fails** |
| r25-qqq-agg-volmanaged | ok | +5.8pp | PASS +5.7pp | FAIL QQQ: ERR; AGG: ERR | PASS +6.5pp | PASS +5.7pp | PASS 9% / 0.62 vs 13% / 0.82 | PASS 7% (e=100%; cand 13%) | **fails** |
| r24b-lo-industry-momentum | ok | +5.5pp | PASS +5.2pp | PASS NVDA: +3.1pp | PASS +5.2pp | PASS +2.8pp | PASS 15% / 0.66 vs 20% / 0.95 | PASS 14% (e=95%; cand 20%) | **SURVIVES** |
| r24b-lo-xsec-momentum-12-1 | ok | +5.3pp | PASS +4.9pp | PASS SMCI: +4.2pp | PASS +3.5pp | PASS +0.9pp | PASS 14% / 0.64 vs 20% / 0.83 | PASS 13% (e=88%; cand 20%) | **SURVIVES** |
| macro-hy-credit-spread-risk-off | ok | +4.7pp | PASS +4.7pp | FAIL QQQ: -1.4pp | PASS +4.8pp | PASS +4.7pp | PASS -4% / 0.01 vs 12% / 0.65 | FAIL 7% (e=100%; cand 12%) | **fails** |
| r25-qqq-agg-dualmom | ok | +3.8pp | PASS +3.7pp | FAIL QQQ: ERR; AGG: ERR | PASS +0.6pp | PASS +3.8pp | PASS 9% / 0.62 vs 11% / 0.66 | PASS 7% (e=100%; cand 11%) | **fails** |
| s29-etf-dynamic-hedge-selection | ok | +3.8pp | PASS +3.6pp | PASS QQQ: ERR; IEF: +3.5pp | PASS +3.4pp | PASS +3.8pp | PASS 6% / 0.57 vs 9% / 0.75 | PASS 5% (e=98%; cand 9%) | **SURVIVES** |
| mlq-risk-parity-crypto | ok | +3.3pp | PASS +1.9pp | PASS BTC: +11.6pp | FAIL -1.2pp | PASS +5.3pp | PASS 53% / 0.93 vs 66% / 1.03 | PASS 63% (e=99%; cand 66%) | **fails** |
| r24b-rev-low-turnover | ok | +3.0pp | PASS +2.0pp | PASS BBY: +2.6pp | PASS +1.3pp | PASS +1.0pp | PASS 13% / 0.66 vs 17% / 0.84 | PASS 14% (e=99%; cand 17%) | **SURVIVES** |

### Survivors, most robust first (worst-case excess/yr across (a), (b), (c-), (c+))

1. s29-cx-fng-cond-mom (momentum, 18 assets): worst-case +27.4pp/yr; base +39.5pp; beats control by +75.3pp CAGR
2. r25-crypto-btcbeta-low (equity-factors, 18 assets): worst-case +26.4pp/yr; base +38.9pp; beats control by +66.7pp CAGR
3. r27-crypto-lowbeta-rankw (equity-factors, 18 assets): worst-case +24.4pp/yr; base +31.8pp; beats control by +28.4pp CAGR
4. r27-crypto-mom-buffer (momentum, 18 assets): worst-case +22.8pp/yr; base +31.6pp; beats control by +67.5pp CAGR
5. r27-crypto-scaled-trend (trend, 18 assets): worst-case +17.6pp/yr; base +26.1pp; beats control by +65.0pp CAGR
6. r27-cx-tsmom-vote3h (trend, 18 assets): worst-case +15.0pp/yr; base +25.8pp; beats control by +58.8pp CAGR
7. r27-cx-tsmom28-fngfear (sentiment, 18 assets): worst-case +13.7pp/yr; base +40.6pp; beats control by +49.1pp CAGR
8. social-ta-vwma-cross (momentum, 18 assets): worst-case +9.6pp/yr; base +23.2pp; beats control by +46.2pp CAGR
9. s29-etf-dynamic-hedge-selection (other, 8 assets): worst-case +3.4pp/yr; base +3.8pp; beats control by +3.4pp CAGR
10. mlq-feature-neutral-momentum (momentum, 18 assets): worst-case +3.0pp/yr; base +29.2pp; beats control by +112.8pp CAGR
11. r24b-lo-industry-momentum (equity-factors, 171 assets): worst-case +2.8pp/yr; base +5.5pp; beats control by +4.7pp CAGR
12. macro-crypto-btc-dominance-altseason-rotation (macro-intermarket, 18 assets): worst-case +1.7pp/yr; base +13.2pp; beats control by +87.9pp CAGR
13. r24b-rev-low-turnover (mean-reversion-statarb, 171 assets): worst-case +1.0pp/yr; base +3.0pp; beats control by +4.6pp CAGR
14. r24b-lo-xsec-momentum-12-1 (equity-factors, 171 assets): worst-case +0.9pp/yr; base +5.3pp; beats control by +5.3pp CAGR

### Fail reasons

- r27-crypto-boom-only: fails (c-)
- s29-us-vix-beta: fails (e)
- r25-qqq-agg-volmanaged: fails (b)
- macro-hy-credit-spread-risk-off: fails (b) (e)
- r25-qqq-agg-dualmom: fails (b)
- mlq-risk-parity-crypto: fails (c-)

## Caveats on the pass/fail rows (read before using the survivors list)

- Survival is a robustness result, not an edge result. None of the 14 survivors clears the ledger's FDR bar (PROMISING needs q<0.1; none is below 0.18), and all sit in one discovery window (2017-2025-03) that was used to pick them.
- Statistical strength differs a lot within the survivors (harness p of excess vs B&H, from the ledgered rows): r27-crypto-lowbeta-rankw 1.6e-3, r25-crypto-btcbeta-low 7.6e-3, s29-etf-dynamic-hedge-selection 2.2e-2 (but Sharpe p 0.36), s29-cx-fng-cond-mom 5.0e-2, r27-crypto-mom-buffer 6.1e-2, r27-cx-tsmom28-fngfear 6.8e-2, then 0.14 to 0.31 for the rest (vwma, scaled-trend, vote3h, feature-neutral, industry-momentum, hy/dominance rotation, rev-low-turnover, xsec-momentum).
- (b) was only weakly tested for three survivors: the top contributor is structurally required (BTC in s29-cx-fng-cond-mom and macro-crypto-btc-dominance-altseason-rotation, QQQ in s29-etf-dynamic-hedge-selection), the rerun was rejected by the harness, and per the pre-registered fallback the next contributor (HBAR, AVAX, IEF) was dropped instead. For the two 2-asset ETF rows (r25-qqq-agg-volmanaged, r25-qqq-agg-dualmom) (b) is untestable by construction and counts as a fail.
- The 5 stocks/ETF survivors have base excess of only +3pp to +5.5pp/yr and worst-case +0.9pp to +3.4pp/yr, which is inside cost and data-quality error for a 171-name universe. They pass the letter of the rule, not its spirit.
- (d) note: r27-cx-tsmom28-fngfear holds 66% of asset-days, and no buy-after-drop rule with a 22-bar hold can reach its 1197 trades (contiguous runs merge): the control reached 887 trades at 95% exposure, i.e. it is more invested than the candidate and still returned 54% CAGR vs 103%. The other 19 controls hit their target trade counts (signal mode within 1) or their names/gross targets (portfolio mode).
- (e) note: 9 of the 14 survivors hold 95-100% gross, so (e) is close to a plain B&H comparison for them. The 5 with lower exposure (vwma 46%, vote3h 50%, scaled-trend 53%, fngfear 66%, feature-neutral 86%) beat their exposure-scaled B&H by 33 to 53pp CAGR. (e) failed for s29-us-vix-beta and macro-hy-credit-spread-risk-off on the Sharpe leg (0.86 vs 0.96 and 0.65 vs 0.70); their CAGR beat the scaled B&H.
- r25-crypto-btcbeta-low and r27-crypto-lowbeta-rankw are the same low-BTC-beta idea (two variants) and r27-cx-tsmom-vote3h, r27-crypto-scaled-trend, social-ta-vwma-cross and r27-cx-tsmom28-fngfear are the crypto price-trend filter family that deep-validation.md found equivalent to a 20-day SMA (Sharpe 1.59). Do not count these as 8 independent findings.
- mlq-feature-neutral-momentum passes with a thin margin: +3.0pp in the +25% neighbour and +8.2pp after dropping ADA.
