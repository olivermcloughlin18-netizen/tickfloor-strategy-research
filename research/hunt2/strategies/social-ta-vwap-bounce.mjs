// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "social-ta-vwap-bounce",
  name: "VWAP mean-reversion bounce (intraday)",
  family: "mean_reversion",
  source: "YouTube/TikTok day-trading content",
  assetClass: "crypto",
  timeframe: "1h",
  params: { vwapWindow: 20, atrWindow: 14, threshold: 0.5, exitBars: 12 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const { vwapWindow, atrWindow, threshold, exitBars } = ctx.params;

  if (!ctx.state) {
    ctx.state = { inPosition: false, entryBar: -1 };
  }

  // Need enough history for both VWAP and ATR
  if (i + 1 < Math.max(vwapWindow, atrWindow)) return 0;

  // Calculate VWAP (20-period rolling)
  let vwapSum = 0, volumeSum = 0;
  for (let k = i - vwapWindow + 1; k <= i; k++) {
    vwapSum += bars[k].close * bars[k].volume;
    volumeSum += bars[k].volume;
  }
  const vwap = vwapSum / volumeSum;

  // Calculate ATR (14-period)
  let atrSum = 0;
  for (let k = i - atrWindow + 1; k <= i; k++) {
    const trueRange = Math.max(
      bars[k].high - bars[k].low,
      k > 0 ? Math.abs(bars[k].high - bars[k - 1].close) : 0,
      k > 0 ? Math.abs(bars[k].low - bars[k - 1].close) : 0
    );
    atrSum += trueRange;
  }
  const atr = atrSum / atrWindow;
  const thresholdDist = threshold * atr;

  if (ctx.state.inPosition) {
    // In position: exit if high >= VWAP + threshold*ATR OR held for exitBars
    const barsHeld = i - ctx.state.entryBar;
    if (bars[i].high >= vwap + thresholdDist || barsHeld >= exitBars) {
      ctx.state.inPosition = false;
      return 0;
    }
    return 1; // stay long
  }

  // Not in position: enter if low <= VWAP - threshold*ATR AND close > VWAP (bounce)
  if (bars[i].low <= vwap - thresholdDist && bars[i].close > vwap) {
    ctx.state.inPosition = true;
    ctx.state.entryBar = i;
    return 1;
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
