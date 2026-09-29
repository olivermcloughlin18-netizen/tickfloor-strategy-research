// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "social-ta-hammer-shooting-star",
  name: "Hammer / shooting star at support-resistance",
  family: "other",
  source: "Instagram/YouTube 'pin bar' and 'hammer candle' trading content",
  assetClass: "crypto",
  timeframe: "1d",
  longShort: true,
  params: { window: 50 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const window = ctx.params.window;
  if (i + 1 < window) return 0; // not enough history

  const bar = bars[i];
  const range = bar.high - bar.low;
  const body = Math.abs(bar.close - bar.open);
  const lower_wick = Math.min(bar.open, bar.close) - bar.low;
  const upper_wick = bar.high - Math.max(bar.open, bar.close);

  // Find 50-bar rolling low and high
  let rolling_low = bar.low;
  let rolling_high = bar.high;
  for (let k = i - window + 1; k <= i; k++) {
    rolling_low = Math.min(rolling_low, bars[k].low);
    rolling_high = Math.max(rolling_high, bars[k].high);
  }

  // HAMMER: Lower wick >= 2x body, upper wick < 0.3x body,
  // close in top third, low within 1% of rolling low
  if (body > 0 && lower_wick >= 2 * body && upper_wick < 0.3 * body) {
    const close_threshold = bar.low + (2 / 3) * range;
    if (bar.close >= close_threshold && bar.low <= rolling_low * 1.01) {
      return 1; // long signal
    }
  }

  // SHOOTING STAR: Upper wick >= 2x body, lower wick < 0.3x body,
  // close in bottom third, high within 1% of rolling high
  if (body > 0 && upper_wick >= 2 * body && lower_wick < 0.3 * body) {
    const close_threshold = bar.low + (1 / 3) * range;
    if (bar.close <= close_threshold && bar.high >= rolling_high * 0.99) {
      return -1; // short signal
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
