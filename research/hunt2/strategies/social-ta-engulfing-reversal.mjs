// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "social-ta-engulfing-reversal",
  name: "Bullish/bearish engulfing candle reversal",
  family: "mean_reversion",
  source: "r/Daytrading candlestick threads, TradingView engulfing-pattern scripts",
  assetClass: "crypto",
  timeframe: "1d",
  longShort: true,
  params: {
    swingLowBars: 20,
    bodyRatioThreshold: 1.2,
    atrBars: 14,
    atrTargetUp: 2,
    atrTargetDown: 1,
    holdBars: 10
  }
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.

function atr(bars, i, period) {
  if (i < period) return null;
  let sum = 0;
  for (let k = i - period + 1; k <= i; k++) {
    const high = bars[k].high;
    const low = bars[k].low;
    const prev_close = k > 0 ? bars[k - 1].close : bars[k].close;
    const tr = Math.max(high - low, Math.abs(high - prev_close), Math.abs(low - prev_close));
    sum += tr;
  }
  return sum / period;
}

function swingLow(bars, i, period) {
  if (i < period) return i;
  let minIdx = i - period;
  for (let k = i - period; k <= i; k++) {
    if (bars[k].low <= bars[minIdx].low) minIdx = k;
  }
  return minIdx;
}

function isSwingLow(bars, i, period) {
  return swingLow(bars, i, period) === i;
}

export function signal(bars, i, ctx) {
  const swingLowBars = ctx.params.swingLowBars;
  const bodyRatioThreshold = ctx.params.bodyRatioThreshold;
  const atrBars = ctx.params.atrBars;
  const atrTargetUp = ctx.params.atrTargetUp;
  const atrTargetDown = ctx.params.atrTargetDown;
  const holdBars = ctx.params.holdBars;

  // Initialize state
  if (!ctx.state) ctx.state = {};
  if (ctx.state.position === undefined) ctx.state.position = 0;
  if (ctx.state.entryPrice === undefined) ctx.state.entryPrice = 0;
  if (ctx.state.entryBar === undefined) ctx.state.entryBar = 0;
  if (ctx.state.direction === undefined) ctx.state.direction = 0;

  // Check if we have an open position and should exit
  if (ctx.state.position !== 0) {
    const barsSinceEntry = i - ctx.state.entryBar;
    const currentClose = bars[i].close;
    const atrVal = atr(bars, i, atrBars);

    if (atrVal === null) return ctx.state.position;

    const pnl = ctx.state.direction === 1
      ? currentClose - ctx.state.entryPrice
      : ctx.state.entryPrice - currentClose;

    // Exit conditions
    if (barsSinceEntry >= holdBars) {
      ctx.state.position = 0;
      return 0;
    }

    if (ctx.state.direction === 1 && pnl >= atrTargetUp * atrVal) {
      ctx.state.position = 0;
      return 0;
    }

    if (ctx.state.direction === 1 && pnl <= -atrTargetDown * atrVal) {
      ctx.state.position = 0;
      return 0;
    }

    if (ctx.state.direction === -1 && pnl >= atrTargetUp * atrVal) {
      ctx.state.position = 0;
      return 0;
    }

    if (ctx.state.direction === -1 && pnl <= -atrTargetDown * atrVal) {
      ctx.state.position = 0;
      return 0;
    }

    return ctx.state.position;
  }

  // Check for engulfing patterns
  if (i < 1 || i < swingLowBars) return 0;

  const prev = bars[i - 1];
  const curr = bars[i];

  const prevBody = Math.abs(prev.close - prev.open);
  const currBody = Math.abs(curr.close - curr.open);

  // Check if previous bar is red and current is green
  const prevRed = prev.close < prev.open;
  const currGreen = curr.close > curr.open;

  // Check if current engulfs previous
  const engulfs = curr.open <= prev.close && curr.close >= prev.open;

  // Check body ratio
  const bodyRatio = currBody / prevBody > 0 ? currBody / prevBody : 0;
  const bodyQualifies = bodyRatio > bodyRatioThreshold;

  // Check if at swing low
  const atSwingLow = isSwingLow(bars, i - 1, swingLowBars);

  // Bullish engulfing
  if (prevRed && currGreen && engulfs && bodyQualifies && atSwingLow) {
    ctx.state.position = 1;
    ctx.state.entryPrice = curr.close;
    ctx.state.entryBar = i;
    ctx.state.direction = 1;
    return 1;
  }

  // Bearish engulfing (green then red at swing high)
  const prevGreen = prev.close > prev.open;
  const currRed = curr.close < curr.open;
  const atSwingHigh = (i >= swingLowBars) &&
    (() => {
      let maxIdx = i - swingLowBars;
      for (let k = i - swingLowBars; k <= i; k++) {
        if (bars[k].high >= bars[maxIdx].high) maxIdx = k;
      }
      return maxIdx === i - 1;
    })();

  if (prevGreen && currRed && engulfs && bodyQualifies && atSwingHigh) {
    ctx.state.position = -1;
    ctx.state.entryPrice = curr.close;
    ctx.state.entryBar = i;
    ctx.state.direction = -1;
    return -1;
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
