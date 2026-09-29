// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "trend-donchian-20-10-breakout",
  name: "Donchian channel breakout (20/10, classic Turtle)",
  family: "trend-managed-futures",
  source: "Curtis Faith 'Way of the Turtle' 2007",
  assetClass: "crypto",
  timeframe: "1d",
  longShort: true,
  params: { entryWindow: 20, exitWindow: 10 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const entryWindow = ctx.params.entryWindow;
  const exitWindow = ctx.params.exitWindow;

  if (i + 1 < entryWindow) return 0; // not enough history for entry signals

  // Initialize state
  if (ctx.state.position === undefined) ctx.state.position = 0;

  const current = bars[i];
  let position = ctx.state.position;

  // Calculate entry levels: max high / min low over prior entryWindow bars (not including today)
  const startIdx = Math.max(0, i - entryWindow);
  const endIdx = i;
  let maxHigh = -Infinity;
  let minLow = Infinity;
  for (let k = startIdx; k < endIdx; k++) {
    maxHigh = Math.max(maxHigh, bars[k].high);
    minLow = Math.min(minLow, bars[k].low);
  }

  // Calculate exit levels: max high / min low over prior exitWindow bars (not including today)
  const exitStartIdx = Math.max(0, i - exitWindow);
  let exitMaxHigh = -Infinity;
  let exitMinLow = Infinity;
  for (let k = exitStartIdx; k < endIdx; k++) {
    exitMaxHigh = Math.max(exitMaxHigh, bars[k].high);
    exitMinLow = Math.min(exitMinLow, bars[k].low);
  }

  // Handle exits first
  if (position === 1 && current.close < exitMinLow) {
    // Exit long
    position = 0;
  } else if (position === -1 && current.close > exitMaxHigh) {
    // Exit short
    position = 0;
  }

  // Handle entries (only if flat)
  if (position === 0) {
    if (current.close > maxHigh) {
      // Enter long
      position = 1;
    } else if (current.close < minLow) {
      // Enter short
      position = -1;
    }
  }

  ctx.state.position = position;
  return position;
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
