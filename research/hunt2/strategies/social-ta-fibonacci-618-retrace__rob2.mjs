// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "social-ta-fibonacci-618-retrace__rob2",
  name: "Fibonacci 61.8% retracement bounce in an uptrend",
  family: "sentiment",
  source: "Instagram/TikTok 'Fibonacci golden pocket' trading content",
  assetClass: "crypto",
  timeframe: "1d",
  params: {
    window: 63,
    fib_lower: 0.5,
    fib_upper: 0.65,
    fib_stop: 0.786
  },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const n = ctx.params.window;
  const fib_lower = ctx.params.fib_lower;
  const fib_upper = ctx.params.fib_upper;

  if (i < n) return 0; // not enough history

  // Calculate 50-bar SMA to confirm uptrend
  let sma_current = 0;
  for (let k = i - n + 1; k <= i; k++) sma_current += bars[k].close;
  sma_current /= n;

  let sma_prev = 0;
  for (let k = i - n; k < i; k++) sma_prev += bars[k].close;
  sma_prev /= n;

  if (sma_current <= sma_prev) return 0; // trend not up

  // Find swing high and low in the window
  let swing_high = bars[i - n + 1].high;
  let swing_low = bars[i - n + 1].low;

  for (let k = i - n + 2; k <= i; k++) {
    if (bars[k].high > swing_high) swing_high = bars[k].high;
    if (bars[k].low < swing_low) swing_low = bars[k].low;
  }

  // Calculate Fibonacci retracement levels
  const retracement_range = swing_high - swing_low;
  const fib_50_level = swing_high - retracement_range * fib_lower;
  const fib_65_level = swing_high - retracement_range * fib_upper;

  // Current price in the 0.5-0.65 retracement zone?
  const current_price = bars[i].close;
  if (current_price < fib_65_level || current_price > fib_50_level) return 0;

  // Bullish candle (close > open)?
  if (bars[i].close <= bars[i].open) return 0;

  return 1; // Enter long
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
