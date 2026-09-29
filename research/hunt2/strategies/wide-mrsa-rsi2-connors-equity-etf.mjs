// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-mrsa-rsi2-connors-equity-etf",
  name: "RSI(2) mean reversion, SPY/QQQ (retest with BH2's failure checks) (wide US stocks)",
  family: "mean-reversion-statarb",
  source: "Connors & Alvarez 'Short Term Trading Strategies That Work'",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  assets: ["QQQ"],  // SPY is a holdout asset; test on QQQ only
  params: {
    rsiWindow: 2,
    smaWindow: 200,
    rsiEntryThreshold: 10,
    rsiExitThreshold: 70,
  },
};

function calculateRSI(bars, end, window) {
  if (end + 1 < window + 1) return null;

  let upSum = 0;
  let downSum = 0;

  for (let i = end - window; i < end; i++) {
    const change = bars[i + 1].close - bars[i].close;
    if (change > 0) {
      upSum += change;
    } else {
      downSum += -change;
    }
  }

  const avgUp = upSum / window;
  const avgDown = downSum / window;

  if (avgDown === 0) return 100;

  const rs = avgUp / avgDown;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}

function calculateSMA(bars, end, window) {
  if (end + 1 < window) return null;

  let sum = 0;
  for (let i = end - window + 1; i <= end; i++) {
    sum += bars[i].close;
  }

  return sum / window;
}

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
export function signal(bars, i, ctx) {
  const { rsiWindow, smaWindow, rsiEntryThreshold, rsiExitThreshold } = ctx.params;

  // Initialize state
  if (!ctx.state) {
    ctx.state = {
      inPosition: false,
      holdBars: 0,
    };
  }

  // Need enough bars for RSI and SMA
  if (i + 1 < Math.max(rsiWindow + 1, smaWindow)) return 0;

  const rsi = calculateRSI(bars, i, rsiWindow);
  const sma200 = calculateSMA(bars, i, smaWindow);
  const close = bars[i].close;

  if (rsi === null || sma200 === null) return 0;

  // If in position
  if (ctx.state.inPosition) {
    ctx.state.holdBars++;

    // Exit if RSI > 70 or max hold reached
    if (rsi > rsiExitThreshold || ctx.state.holdBars >= 10) {
      ctx.state.inPosition = false;
      ctx.state.holdBars = 0;
      return 0;
    }

    // Stay in position
    return 1;
  }

  // Entry: RSI(2) < 10 AND Close > 200d SMA (uptrend filter)
  if (rsi < rsiEntryThreshold && close > sma200) {
    ctx.state.inPosition = true;
    ctx.state.holdBars = 1;
    return 1;
  }

  // Otherwise stay flat
  return 0;
}
