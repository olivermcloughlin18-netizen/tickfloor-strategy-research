// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "social-ta-fear-greed-contrarian",
  name: "Fear & Greed Index contrarian extreme",
  family: "sentiment",
  source: "alternate.me Fear & Greed API + viral crypto-Twitter/YouTube 'buy the fear' threads",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT"],
  params: { fearThreshold: 20, greedThreshold: 70, maxHoldDays: 30 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const fg = ctx.fearGreed();
  if (fg === null) return 0;

  // Initialize history array
  if (!ctx.state || !ctx.state.fgHistory) {
    if (!ctx.state) ctx.state = {};
    ctx.state.fgHistory = [];
    ctx.state.inTrade = false;
    ctx.state.holdDays = 0;
  }

  // Record current fear/greed value
  ctx.state.fgHistory.push(fg);

  // If currently in a trade, check exit conditions
  if (ctx.state.inTrade) {
    ctx.state.holdDays++;
    // Exit if greed threshold exceeded or max hold days reached
    if (fg > ctx.params.greedThreshold || ctx.state.holdDays >= ctx.params.maxHoldDays) {
      ctx.state.inTrade = false;
      ctx.state.holdDays = 0;
      return 0;
    }
    return 1; // Stay in trade
  }

  // Not in trade, check entry conditions
  // Enter when: index < 20 AND previous 2 days both > 20 (confirmation)
  const len = ctx.state.fgHistory.length;
  const canEnter = fg < ctx.params.fearThreshold &&
                   len >= 3 &&
                   ctx.state.fgHistory[len - 2] > ctx.params.fearThreshold &&
                   ctx.state.fgHistory[len - 3] > ctx.params.fearThreshold;

  if (canEnter) {
    ctx.state.inTrade = true;
    ctx.state.holdDays = 1;
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
