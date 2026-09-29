// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "trend-absolute-momentum-single-asset",
  name: "Absolute (time-series) momentum filter on single asset (12-1 month)",
  family: "trend-managed-futures",
  source: "Jegadeesh & Titman 1993 JF; Antonacci 2014",
  assetClass: "etf",
  timeframe: "1d",
  params: {},
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  // 12-1 momentum on daily bars: return from 12 months ago to 1 month ago
  // ~12 months = ~252 trading days; ~1 month = ~21 trading days
  // Skip current month: use bars[i-21] (1 month ago) as end
  // Start: bars[i-21-252] = bars[i-273] (12 months before 1 month ago)
  // Return = bars[i-21].close / bars[i-273].close - 1
  if (i < 273) return 0;

  const ret = bars[i - 21].close / bars[i - 273].close - 1;
  return ret > 0 ? 1 : 0;
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
