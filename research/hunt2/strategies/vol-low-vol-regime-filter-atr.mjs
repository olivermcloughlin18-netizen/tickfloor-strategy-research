// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "vol-low-vol-regime-filter-atr",
  name: "Low-realized-vol regime filter for trend entries",
  family: "volatility",
  source: "Ang, Hodrick, Xing, Zhang 2006 JF 'The Cross-Section of Volatility and Expected Returns'",
  assetClass: "crypto",
  timeframe: "1d",
  params: { sma_window: 50, vol_window: 20, median_window: 252 },
};

// Compute annualized realized volatility over a lookback window
function computeRealizedVol(bars, endIdx, window) {
  if (endIdx + 1 < window) return null;

  let sumSqReturns = 0;
  for (let i = endIdx - window + 1; i < endIdx; i++) {
    const ret = (bars[i + 1].close - bars[i].close) / bars[i].close;
    sumSqReturns += ret * ret;
  }

  const dailyVol = Math.sqrt(sumSqReturns / (window - 1));
  return dailyVol * Math.sqrt(252);
}

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const { sma_window, vol_window, median_window } = ctx.params;

  // Need enough history: median window + vol window to compute rolling median of vols
  if (i + 1 < median_window + vol_window) return 0;

  // Calculate SMA over sma_window bars
  let smaSum = 0;
  for (let k = i - sma_window + 1; k <= i; k++) {
    smaSum += bars[k].close;
  }
  const sma = smaSum / sma_window;

  // Get current 20-day realized vol
  const currentVol = computeRealizedVol(bars, i, vol_window);

  // Collect 20-day realized vols over the last 252 bars
  const vols = [];
  for (let j = i - median_window + 1; j <= i; j++) {
    const vol = computeRealizedVol(bars, j, vol_window);
    if (vol !== null) vols.push(vol);
  }

  // Sort and find median
  vols.sort((a, b) => a - b);
  const medianVol = vols[Math.floor(vols.length / 2)];

  // Signal: long if close > SMA50 AND 20d_vol < 252d_median_of_vol
  if (bars[i].close > sma && currentVol < medianVol) {
    return 1;
  }
  return 0;
}
