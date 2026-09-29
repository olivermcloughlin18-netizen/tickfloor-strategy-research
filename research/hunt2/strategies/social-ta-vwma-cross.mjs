// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "social-ta-vwma-cross",
  name: "Volume-weighted moving average (VWMA) cross",
  family: "momentum",
  source: "TradingView VWMA strategy scripts, YouTube 'volume-weighted MA' tutorials",
  assetClass: "crypto",
  timeframe: "1d",
  params: { vwmaLength: 20 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const n = ctx.params.vwmaLength;
  if (i + 1 < n) return 0;  // not enough history yet

  // Calculate VWMA: sum(close * volume) / sum(volume) over last n bars
  let sumPV = 0;  // price * volume
  let sumV = 0;   // volume
  for (let k = i - n + 1; k <= i; k++) {
    sumPV += bars[k].close * bars[k].volume;
    sumV += bars[k].volume;
  }
  const vwma = sumV > 0 ? sumPV / sumV : 0;

  // Long when close > VWMA, flat otherwise
  return bars[i].close > vwma ? 1 : 0;
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
