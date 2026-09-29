// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-trend-commodity-basket-tsmom",
  name: "Time-series momentum on commodity ETF basket (GLD, SLV, DBC, USO) (wide US stocks)",
  family: "trend-managed-futures",
  source: "Miffre & Rallo 2007 JBFA; broad CTA commodity trend literature",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",

  rebalance: "monthly",
  params: { lookbackDays: 252 },
};

// PORTFOLIO strategy: rank() returns weights for each asset.
// universe[SYMBOL] = bars up to and including date t.
// Return weights {SYMBOL: weight}; sum of weights <= 1.
export function rank(universe, t, ctx) {
  const weights = {};
  const lookback = ctx.params.lookbackDays;
  let nLong = 0;
  const scores = {};

  // First pass: count how many assets have positive 12-month return
  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    // Need at least lookback + 1 bars to compute 12-month return
    if (bars.length <= lookback) {
      weights[sym] = 0;
      continue;
    }

    const currentClose = bars[bars.length - 1].close;
    const pastClose = bars[bars.length - 1 - lookback].close;
    const ret = (currentClose - pastClose) / pastClose;

    if (ret > 0) {
      nLong++;
      scores[sym] = 1; // mark as long
    } else {
      scores[sym] = 0; // mark as flat
    }
  }

  // Second pass: equal-weight the long sleeves
  if (nLong > 0) {
    const weight = 1 / nLong;
    for (const sym of Object.keys(universe)) {
      weights[sym] = scores[sym] === 1 ? weight : 0;
    }
  } else {
    for (const sym of Object.keys(universe)) {
      weights[sym] = 0;
    }
  }

  return weights;
}
