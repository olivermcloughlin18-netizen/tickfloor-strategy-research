// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "trend-donchian-55-20-longterm",
  name: "Donchian channel breakout long-term (55/20)",
  family: "trend",
  source: "Curtis Faith 'Way of the Turtle' 2007",
  assetClass: "crypto",
  timeframe: "1d",
  longShort: true,
  params: { entryWindow: 55, exitWindow: 20 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const entryWin = ctx.params.entryWindow;
  const exitWin = ctx.params.exitWindow;

  // Need enough history: at least entryWin bars before current bar
  if (i < entryWin) return 0;

  // Calculate 55-day high and 20-day low from PRIOR bars (not including current)
  let high55 = -Infinity;
  let low20 = Infinity;

  // 55-day high: highest close of prior entryWin bars (bars[i-entryWin] to bars[i-1])
  for (let k = i - entryWin; k < i; k++) {
    high55 = Math.max(high55, bars[k].close);
  }

  // 20-day low: lowest close of prior exitWin bars (bars[i-exitWin] to bars[i-1])
  for (let k = i - exitWin; k < i; k++) {
    low20 = Math.min(low20, bars[k].close);
  }

  const close = bars[i].close;

  // Long on close > 55-day high, exit long on close < 20-day low
  // Short on close < 20-day low, exit short on close > 55-day high
  if (close > high55) {
    return 1;
  } else if (close < low20) {
    return -1;
  } else {
    return 0;
  }
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
