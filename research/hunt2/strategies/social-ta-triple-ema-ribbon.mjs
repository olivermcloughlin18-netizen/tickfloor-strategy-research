// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "social-ta-triple-ema-ribbon",
  name: "Triple EMA ribbon alignment (8/21/55)",
  family: "social-ta",
  source: "TikTok/YouTube 'EMA ribbon' trend-following content",
  assetClass: "crypto",
  timeframe: "1d",
  longShort: true,
  params: {
    ema8Period: 8,
    ema21Period: 21,
    ema55Period: 55,
    slopeCheckBars: 3
  }
};

function ema(close, prevEma, period) {
  const multiplier = 2 / (period + 1);
  return (close - prevEma) * multiplier + prevEma;
}

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const { ema8Period, ema21Period, ema55Period, slopeCheckBars } = ctx.params;

  // Initialize state for tracking EMAs
  if (ctx.state.ema8 === undefined) {
    ctx.state.ema8 = [];
    ctx.state.ema21 = [];
    ctx.state.ema55 = [];
  }

  // Build EMAs up to current index
  for (let k = ctx.state.ema8.length; k <= i; k++) {
    const close = bars[k].close;
    if (k === 0) {
      ctx.state.ema8[k] = close;
      ctx.state.ema21[k] = close;
      ctx.state.ema55[k] = close;
    } else {
      ctx.state.ema8[k] = ema(close, ctx.state.ema8[k - 1], ema8Period);
      ctx.state.ema21[k] = ema(close, ctx.state.ema21[k - 1], ema21Period);
      ctx.state.ema55[k] = ema(close, ctx.state.ema55[k - 1], ema55Period);
    }
  }

  // Need enough history for slope check
  if (i < slopeCheckBars) return 0;

  const e8 = ctx.state.ema8[i];
  const e21 = ctx.state.ema21[i];
  const e55 = ctx.state.ema55[i];

  // Check if all EMAs are sloping up (bullish) or down (bearish) over slopeCheckBars
  let slopingUp = true, slopingDown = true;

  for (let j = 1; j <= slopeCheckBars; j++) {
    const prev = i - j;
    const curr = i - j + 1;

    if (ctx.state.ema8[curr] <= ctx.state.ema8[prev]) slopingUp = false;
    if (ctx.state.ema8[curr] >= ctx.state.ema8[prev]) slopingDown = false;

    if (ctx.state.ema21[curr] <= ctx.state.ema21[prev]) slopingUp = false;
    if (ctx.state.ema21[curr] >= ctx.state.ema21[prev]) slopingDown = false;

    if (ctx.state.ema55[curr] <= ctx.state.ema55[prev]) slopingUp = false;
    if (ctx.state.ema55[curr] >= ctx.state.ema55[prev]) slopingDown = false;
  }

  // Determine position
  let signal = 0;

  if (slopingUp && e8 > e21 && e21 > e55) {
    signal = 1;  // Long: EMA8 > EMA21 > EMA55 with all sloping up
  } else if (slopingDown && e8 < e21 && e21 < e55) {
    signal = -1;  // Short: EMA8 < EMA21 < EMA55 with all sloping down
  }

  return signal;
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
