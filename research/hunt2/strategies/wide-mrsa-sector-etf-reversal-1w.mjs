// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-mrsa-sector-etf-reversal-1w",
  name: "Sector ETF short-term reversal (1-week) (wide US stocks)",
  family: "mean-reversion-statarb",
  source: "Jegadeesh 1990 JF; Lehmann 1990 QJE",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  longShort: true,
  params: { trailingDays: 5 }
};

// PORTFOLIO strategy (cross-sectional): rank() selects weights based on the universe at time t.
// universe[SYMBOL] = bars up to and including date t, for every asset that traded on t.
// Return weights {SYMBOL: weight}; weights sum of |weights| <= 1, missing = 0.
// Rebalance weekly: go long bottom-3, short top-3 based on 5-day returns.

export function rank(universe, t, ctx) {
  const n = ctx.params.trailingDays;

  // Calculate 5-day returns for each sector ETF
  const scores = [];
  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    // Need at least n+1 bars to compute n-day return (today and n days ago)
    if (bars.length <= n) continue;

    // 5-day return: close[today] / close[5 days ago] - 1
    const ret = bars[bars.length - 1].close / bars[bars.length - 1 - n].close - 1;
    scores.push([sym, ret]);
  }

  // Sort by return (ascending for reversal: worst performers first)
  scores.sort((x, y) => x[1] - y[1]);

  const w = {};

  // Long the bottom 3 (worst performers): weight +1/6 each (0.5 / 3)
  const bottom3 = scores.slice(0, 3);
  for (const [sym] of bottom3) {
    w[sym] = 1 / 6;
  }

  // Short the top 3 (best performers): weight -1/6 each (-0.5 / 3)
  const top3 = scores.slice(scores.length - 3);
  for (const [sym] of top3) {
    w[sym] = -1 / 6;
  }

  return w;
}
