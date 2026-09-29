// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "social-ta-rsi-50-midline-trend",
  name: "RSI(14) 50-midline trend filter (not overbought/oversold)",
  family: "social-ta",
  source: "YouTube 'RSI 50 line strategy' videos, Constance Brown RSI trend-mode concept",
  assetClass: "crypto",
  timeframe: "1d",
  params: { rsiWindow: 14, smaWindow: 50 },
};

// Calculate RSI(window) for bar i
function calcRSI(bars, i, window) {
  if (i < window) return null; // Need at least window bars

  let gains = 0, losses = 0;
  for (let k = i - window + 1; k <= i; k++) {
    const change = bars[k].close - bars[k - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / window;
  const avgLoss = losses / window;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate SMA(window) for bar i
function calcSMA(bars, i, window) {
  if (i < window - 1) return null; // Need at least window bars

  let sum = 0;
  for (let k = i - window + 1; k <= i; k++) {
    sum += bars[k].close;
  }
  return sum / window;
}

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const { rsiWindow, smaWindow } = ctx.params;

  const rsi = calcRSI(bars, i, rsiWindow);
  const sma = calcSMA(bars, i, smaWindow);
  const price = bars[i].close;

  // Not enough history
  if (rsi === null || sma === null) return 0;

  // Initialize state
  if (!ctx.state.prevRSI) {
    ctx.state.prevRSI = null;
    ctx.state.inPosition = false;
  }

  const prevRSI = ctx.state.prevRSI;
  ctx.state.prevRSI = rsi;

  if (!ctx.state.inPosition) {
    // Entry: RSI crosses above 50 AND price > 50-SMA
    if (prevRSI !== null && prevRSI <= 50 && rsi > 50 && price > sma) {
      ctx.state.inPosition = true;
      return 1;
    }
    return 0;
  } else {
    // Exit: RSI crosses below 50
    if (prevRSI !== null && prevRSI >= 50 && rsi < 50) {
      ctx.state.inPosition = false;
      return 0;
    }
    return 1;
  }
}
