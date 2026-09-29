// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "mlq-drawdown-triggered-deleveraging",
  name: "ML-lite drawdown-triggered deleveraging overlay",
  family: "ml-quant-modern",
  source: "Kaminski, Lo (2014) Journal of Financial Markets 'When Do Stop-Loss Rules Stop Losses?'",
  assetClass: "crypto",
  timeframe: "1d",
  params: { lookback: 20, dd10: 0.10, dd20: 0.20 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const lookback = ctx.params.lookback;
  const dd10 = ctx.params.dd10;
  const dd20 = ctx.params.dd20;

  // Initialize state on first call
  if (!ctx.state.peak) {
    ctx.state.peak = bars[0].close;
    ctx.state.cold = false; // are we waiting for new high after >20% DD?
  }

  // Update peak high
  if (bars[i].close > ctx.state.peak) {
    ctx.state.peak = bars[i].close;
    ctx.state.cold = false; // reset cold state when new peak
  }

  // Calculate current drawdown
  const dd = (ctx.state.peak - bars[i].close) / ctx.state.peak;

  // If we're in cold state, check if we made a new 20-day high
  if (ctx.state.cold) {
    // Check if current bar is higher than the highest in the last lookback bars
    let highest = bars[i].close;
    const start = Math.max(0, i - lookback + 1);
    for (let k = start; k < i; k++) {
      if (bars[k].close > highest) highest = bars[k].close;
    }
    // If we made a new high in the lookback window relative to our cold entry, re-enter
    if (highest > ctx.state.peak - ctx.state.peak * dd20) {
      // Actually, re-enter when we see a new 20-day high
      // Let me reconsider: "new 20-day high" means highest close in last 20 bars
      let high20 = bars[i].close;
      const start20 = Math.max(0, i - 19);
      for (let k = start20; k <= i; k++) {
        if (bars[k].close > high20) high20 = bars[k].close;
      }
      // Re-enter when current close is a 20-day high
      if (bars[i].close === high20 && i >= 19) {
        ctx.state.cold = false;
      }
    }
  }

  // If cold, stay flat
  if (ctx.state.cold) return 0;

  // If drawdown exceeds 20%, go cold
  if (dd > dd20) {
    ctx.state.cold = true;
    return 0;
  }

  // Otherwise stay long (note: the 10% case would reduce position size to 50%, but we can only return 0 or 1)
  return 1;
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
