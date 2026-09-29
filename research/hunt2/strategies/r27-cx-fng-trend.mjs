// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "r27-cx-fng-trend",
  name: "Crypto held while Fear & Greed is 50 or above",
  family: "sentiment",
  source: "alternative.me Crypto Fear & Greed Index (a composite of volatility, momentum/volume, social media, BTC dominance and search trends); Liu & Tsyvinski 2021 RFS (investor attention predicts crypto returns); Baker & Wurgler 2007 JEP",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  params: { threshold: 50 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state starts as {}: initialise fields with `if (ctx.state.x === undefined)`.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  if (ctx.state.initialised === undefined) ctx.state.initialised = true;

  const f = ctx.fearGreed();
  if (f === null) return 1; // warm-up: no reading yet, hold as buy-and-hold

  return f >= ctx.params.threshold ? 1 : 0;
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
