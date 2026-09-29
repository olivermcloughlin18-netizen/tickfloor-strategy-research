// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "social-ta-donchian-breakout-20",
  name: "Donchian Channel 20-bar breakout (turtle-lite)",
  family: "trend",
  source: "YouTube 'Turtle Trading breakout strategy' tutorials, Curtis Faith's 'Way of the Turtle'",
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
  const { entryWindow, exitWindow } = ctx.params;

  // Need enough history for entry window (need at least entryWindow bars before current)
  if (i < entryWindow) return 0;

  // Initialize state
  if (!('position' in ctx.state)) {
    ctx.state.position = 0; // 1 = long, -1 = short, 0 = flat
  }

  const position = ctx.state.position;

  // Find highest high and lowest low of prior entryWindow bars (excluding current bar)
  let highestHigh = bars[i - entryWindow].high;
  let lowestLow = bars[i - entryWindow].low;
  for (let k = i - entryWindow + 1; k < i; k++) {
    highestHigh = Math.max(highestHigh, bars[k].high);
    lowestLow = Math.min(lowestLow, bars[k].low);
  }

  // When flat, check for entry signals
  if (position === 0) {
    if (bars[i].close > highestHigh) {
      ctx.state.position = 1;
      return 1;
    } else if (bars[i].close < lowestLow) {
      ctx.state.position = -1;
      return -1;
    }
    return 0;
  }

  // When in position, check for exit signals
  // Find highest high and lowest low of prior exitWindow bars (excluding current bar)
  let exitHighestHigh = bars[i - exitWindow].high;
  let exitLowestLow = bars[i - exitWindow].low;
  for (let k = i - exitWindow + 1; k < i; k++) {
    exitHighestHigh = Math.max(exitHighestHigh, bars[k].high);
    exitLowestLow = Math.min(exitLowestLow, bars[k].low);
  }

  if (position === 1) {
    // In long position, exit on close below lowest low of prior 10 bars
    if (bars[i].close < exitLowestLow) {
      ctx.state.position = 0;
      return 0;
    }
    return 1;
  } else { // position === -1
    // In short position, exit on close above highest high of prior 10 bars
    if (bars[i].close > exitHighestHigh) {
      ctx.state.position = 0;
      return 0;
    }
    return -1;
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
