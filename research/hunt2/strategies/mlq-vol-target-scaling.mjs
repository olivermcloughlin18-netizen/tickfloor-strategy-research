// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "mlq-vol-target-scaling",
  name: "Volatility targeting position scaling on trend signal",
  family: "volatility",
  source: "Moskowitz, Ooi, Pedersen (2012) JFE 'Time Series Momentum'",
  assetClass: "crypto",
  timeframe: "1d",
  params: {
    sma20: 20,
    sma50: 50,
  },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const {
    sma20: sma20Window,
    sma50: sma50Window,
  } = ctx.params;

  // Need at least sma50 bars
  if (i + 1 < sma50Window) return 0;

  // Calculate SMA20
  let sum20 = 0;
  for (let k = i - sma20Window + 1; k <= i; k++) sum20 += bars[k].close;
  const sma20 = sum20 / sma20Window;

  // Calculate SMA50
  let sum50 = 0;
  for (let k = i - sma50Window + 1; k <= i; k++) sum50 += bars[k].close;
  const sma50 = sum50 / sma50Window;

  // Trend signal: return 1 if SMA20 > SMA50 (long), else 0 (flat)
  // ponytail: vol-based position scaling not available in signal return; harness will compute costs/returns
  return sma20 > sma50 ? 1 : 0;
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
