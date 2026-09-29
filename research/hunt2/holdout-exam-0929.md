# Confirmatory holdout exam, 29 September 2026: nothing confirmed

Pre-registration: `research/hunt2/prereg-0929.md` (lane/hunt-0929 commit 2177423). Runner: `scripts/research/confirm-hunt-2026-09-29.mjs` (sha256 6be7c80c…a954). Raw output: `research/hunt2/holdout-exam-0929.json`. The holdout log (integrate/0927) has the CONFIRMATORY lines at 2026-09-29T01:39:41Z and the RESULT lines at 01:41Z. Each candidate ran once. Every number below is copied from the runner's output.

## Setup

- **Candidates:** 2 (k=2), one-sided Bonferroni alpha 0.025.
- **Window:** return days 2025-03-15 to 2026-09-27 (562 days, 1.54 years). The 2026-09-28 daily kline file was not yet published when the data was fetched at 01:40Z. The prereg rule is "latest complete bar", so 09-27 is the last day.
- **Data:** all 18 CRYPTO_DAILY pairs kept, none dropped. On the 2025-02-01..2025-03-14 overlap, data.binance.vision matched the discovery cache on 42/42 days for every pair, with a maximum close difference of 0.
- **Self-check:** before the fetch, the runner reproduced the unpatched harness `evaluate()` for all four files to 1e-9.
- **Benchmark:** equal-weight daily-rebalanced B&H of the 18 pairs, with no costs. It returned CAGR +24.37% (total +39.87%), Sharpe 0.66 and maxDD 52.7%.

## Verdicts

| Candidate | Verdict | excess/yr | p (one-sided) | CAGR | Sharpe (p) | maxDD | Rebalances | Control excess/yr (CAGR, Sharpe) |
|---|---|---|---|---|---|---|---|---|
| r25-crypto-btcbeta-low | **NOT CONFIRMED** (not confirmed, underpowered) | +11.52pp | 0.3208 | +35.88% | 0.86 vs 0.66 (0.279) | 46.8% | 18 | -34.10pp (-9.73%, 0.21) |
| r27-crypto-scaled-trend | **NOT CONFIRMED** | -6.87pp | 1.0000 | +17.50% | 0.67 vs 0.66 (0.472) | 26.3% | 562 | -28.90pp (-4.53%, 0.04) |

Bootstrap for both: 2000 iterations, block length 8, effective N 71, seed 42.

- **r25-crypto-btcbeta-low.** BTC plus the 6 alts with the lowest BTC beta finished ahead of B&H (total +60.3% vs +39.9%) and beat its buy-after-drop control by 45.6pp/yr. At p=0.32, though, the lead is well inside noise for 562 days. The pre-registered wording applies: underpowered, not falsified. Its discovery excess was +38.9pp/yr, and the holdout came in at +11.5pp/yr, less than a third of that.
- **r27-crypto-scaled-trend.** It lagged B&H by 6.9pp/yr, so it fails the primary test. As the RISK_IMPROVER framing predicted, it roughly halved the drawdown (26.3% vs 52.7%). Its Sharpe was no better than B&H's (0.67 vs 0.66, p=0.47), so the smaller drawdown came from holding less, not from better risk-adjusted returns.
- **Controls.** Both dumb controls lost heavily in this window. Beating them was never the binding condition here.

## The other 12 survivors: FORWARD-ONLY

The prereg's §1 table has the reason for each. In short:

- **Holdout already read.**
  - Crypto cross-sectional momentum (s29-cx-fng-cond-mom, r27-crypto-mom-buffer, mlq-feature-neutral-momentum, macro-crypto-btc-dominance-altseason-rotation): the 2026-09-08 xsec runs read this family's window.
  - s29-etf-dynamic-hedge-selection: R3 read QQQ/GLD/AGG through 2026-09.
  - r24b-lo-xsec-momentum-12-1: the 2026-09-24 mom12_1 confirm spent its family's window.
- **Same idea as a tested candidate.** r27-crypto-lowbeta-rankw (low beta), and r27-cx-tsmom-vote3h, r27-cx-tsmom28-fngfear and social-ta-vwma-cross (crypto trend filter). Their idea has now had its one holdout look, through r25 and r27-scaled-trend respectively.
- **Inside cost error, not spent on the holdout.** r24b-lo-industry-momentum, r24b-rev-low-turnover.

The post-2025-03-15 window on these 18 crypto pairs is now spent for the low-beta and crypto-trend ideas too. Any further evidence for any of the 14 has to come forward, from data after 2026-09-27.

## What happens next

- Nothing goes on the site, and no paper-trade plan is triggered: no candidate was CONFIRMED.
- The only one worth watching is r25-crypto-btcbeta-low (positive excess, beat its control, p=0.32).
  - A forward test needs a new pre-registration: rule frozen at sha256 7557c69f…ec91, start at the first month-end after that prereg is committed, and a review no earlier than 12 monthly rebalances later.
  - Power is the real problem. The 18-month holdout gave effective N 71 and p=0.32 on +11.5pp/yr, so a forward window of about a year will not settle it on its own.
- The discovery ledger still has no row with q < 0.1. The survivor list is a set of robust-looking discovery results. None of them is a validated edge.
