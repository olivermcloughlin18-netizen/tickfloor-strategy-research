// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "trader-books-connors-3day-hilo",
  name: "Connors 3-day high/low pullback",
  family: "trader-books",
  source: "Larry Connors 3-day high/low",
  assetClass: "us_stock",
  timeframe: "1d",
  params: { smaPeriod: 200, maxHoldDays: 5 },
};

// Entry: After 3 consecutive lower daily closes with uptrend filter (price > 200d SMA)
// Exit: Close above prior day's high OR after 5 trading days
export function signal(bars, i, ctx) {
  const { smaPeriod, maxHoldDays } = ctx.params;

  // Initialize state
  if (!ctx.state) {
    ctx.state = { entryBar: -1 };
  }

  // Need at least SMA period + 2 bars for the 3-day low check
  if (i + 1 < smaPeriod + 2) return 0;

  // Check exit condition if we're in a position
  if (ctx.state.entryBar >= 0) {
    const holdDays = i - ctx.state.entryBar;

    // Exit if close above prior day's high
    if (bars[i].close > bars[i-1].high) {
      ctx.state.entryBar = -1;
      return 0;
    }

    // Exit if held for max hold days
    if (holdDays >= maxHoldDays) {
      ctx.state.entryBar = -1;
      return 0;
    }

    // Stay in position
    return 1;
  }

  // Not in position, check entry condition

  // Calculate 200-day SMA
  let smaSum = 0;
  for (let k = i - smaPeriod + 1; k <= i; k++) {
    smaSum += bars[k].close;
  }
  const sma = smaSum / smaPeriod;

  // Uptrend filter: close > 200d SMA
  if (bars[i].close <= sma) return 0;

  // Check for 3 consecutive lower daily closes
  // Need bars[i-2].close > bars[i-1].close > bars[i].close
  if (bars[i-2].close <= bars[i-1].close) return 0;
  if (bars[i-1].close <= bars[i].close) return 0;

  // Entry signal
  ctx.state.entryBar = i;
  return 1;
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
