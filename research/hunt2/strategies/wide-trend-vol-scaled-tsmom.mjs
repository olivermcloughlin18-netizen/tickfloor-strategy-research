// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-trend-vol-scaled-tsmom",
  name: "Volatility-scaled time-series momentum (constant vol target) (wide US stocks)",
  family: "trend",
  source: "Baltas & Kosowski 2013 SSRN 2140091",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "daily",
  longShort: true,
  params: {
    targetVolAnnual: 0.10,    // 10% target annual volatility
    volPeriod: 20,            // 20-day realized volatility
    momentumPeriod: 252,      // ~12-month return lookback
    maxLeverage: 2.0,         // cap at 2x notional
  },
};

// Portfolio strategy: rank() returns weights for each asset in the universe on date t
// universe[SYMBOL] = bars up to and including date t, for every asset that traded on t.
// Return weights {SYMBOL: weight}; weights >= 0 unless longShort, sum of |weights| <= 1, missing = 0.
export function rank(universe, t, ctx) {
  const targetVol = ctx.params.targetVolAnnual;
  const volPeriod = ctx.params.volPeriod;
  const momentumPeriod = ctx.params.momentumPeriod;
  const maxLev = ctx.params.maxLeverage;

  const rawWeights = {};
  let grossWeight = 0;

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];

    // Need enough bars for 12-month lookback and volatility calculation
    if (bars.length < momentumPeriod + 1) continue;

    const i = bars.length - 1;

    // Calculate 12-month return
    const returnValue = bars[i].close / bars[i - momentumPeriod].close - 1;
    const direction = returnValue > 0 ? 1 : (returnValue < 0 ? -1 : 0);

    // Skip if momentum is flat
    if (direction === 0) continue;

    // Calculate 20-day realized volatility
    let sumSquareDailyReturns = 0;
    for (let k = i - volPeriod + 1; k <= i; k++) {
      const dailyReturn = bars[k].close / bars[k - 1].close - 1;
      sumSquareDailyReturns += dailyReturn * dailyReturn;
    }
    const dailyVol = Math.sqrt(sumSquareDailyReturns / volPeriod);
    const annualizedVol = dailyVol * Math.sqrt(252);

    // Skip if volatility is zero
    if (annualizedVol === 0) continue;

    // Calculate position size: target vol / realized vol, capped at maxLeverage
    const positionSize = Math.min(targetVol / annualizedVol, maxLev);

    // Store raw weight: signed position
    const rawWeight = direction * positionSize;
    rawWeights[sym] = rawWeight;
    grossWeight += Math.abs(rawWeight);
  }

  // Normalize weights so sum of |weights| <= 1
  const weights = {};
  if (grossWeight > 0) {
    const scale = Math.min(1.0, 1.0 / grossWeight);  // ponytail: simple min(1, 1/gross) capping for unit notional
    for (const sym of Object.keys(rawWeights)) {
      weights[sym] = rawWeights[sym] * scale;
    }
  }

  return weights;
}

// PORTFOLIO strategies (cross-sectional): delete signal() above and export rank() instead.
// Add to meta: universe: "US_STOCKS_DAILY" (or CRYPTO_DAILY / ETFS_DAILY), rebalance: "monthly" (or weekly / daily).
// universe[SYMBOL] = bars up to and including date t, for every asset that traded on t.
// Return weights {SYMBOL: weight}; weights >= 0 unless longShort, sum of |weights| <= 1, missing = 0.
//
// export function rank(universe, t, ctx) {
//   const scores = [];
//   for (const sym of Object.keys(universe)) {
//     const b = universe[sym];
//     if (b.length < 253) continue;
//     scores.push([sym, b[b.length - 22].close / b[b.length - 253].close - 1]);
//   }
//   scores.sort((x, y) => y[1] - x[1]);
//   const top = scores.slice(0, 4);
//   const w = {};
//   for (const [sym] of top) w[sym] = 1 / top.length;
//   return w;
// }
