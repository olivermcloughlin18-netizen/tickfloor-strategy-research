// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "trader-books-darvas-box",
  name: "Darvas box breakout",
  family: "trend",
  source: "Nicolas Darvas box method, 1960 book",
  assetClass: "us_stock",
  timeframe: "1d",
  params: { minBoxBars: 3, volumeWindow: 20, stopLossPercent: 0.1 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const boxWindow = 10;  // look at last 10 bars for box
  const holdWindow = 5;   // consolidation within recent 5 bars
  const stopLossPercent = 2;

  if (i + 1 < boxWindow) return 0;

  // Initialize state
  if (!ctx.state.initialized) {
    ctx.state.initialized = true;
    ctx.state.inTrade = false;
    ctx.state.stopPrice = null;
    ctx.state.boxTop = null;
  }

  // Find box: highest high in last 10 bars, lowest low in last 10 bars
  let boxTop = bars[i].high;
  let boxBottom = bars[i].low;

  for (let k = Math.max(0, i - boxWindow + 1); k <= i; k++) {
    boxTop = Math.max(boxTop, bars[k].high);
    boxBottom = Math.min(boxBottom, bars[k].low);
  }

  // For entry: check the high/low from prior bars (not including current bar)
  let priorHigh = 0;
  let priorLow = Infinity;

  for (let k = Math.max(0, i - holdWindow); k < i; k++) {
    priorHigh = Math.max(priorHigh, bars[k].high);
    priorLow = Math.min(priorLow, bars[k].low);
  }

  // Trade management
  if (ctx.state.inTrade) {
    // Exit on stop loss
    if (bars[i].close <= ctx.state.stopPrice) {
      ctx.state.inTrade = false;
      return 0;
    }
    return 1;
  }

  // Entry: close breaks above prior high (breakout above recent consolidation)
  if (!ctx.state.inTrade && i >= holdWindow) {
    if (bars[i].close > priorHigh) {
      ctx.state.inTrade = true;
      ctx.state.stopPrice = priorLow * (1 - stopLossPercent / 100);
      ctx.state.boxTop = boxTop;
      return 1;
    }
  }

  return 0;
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
