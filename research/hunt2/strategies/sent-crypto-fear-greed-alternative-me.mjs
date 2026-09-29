// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "sent-crypto-fear-greed-alternative-me",
  name: "Crypto Fear & Greed Index (alternative.me) extreme buy/sell",
  family: "sentiment",
  source: "alternative.me Crypto Fear & Greed Index API (free, keyless)",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT"],
  params: { entryThreshold: 15, exitThreshold: 55, greedThreshold: 85, holdDays: 45, flatDays: 30 },
};

// Fear & Greed sentiment-based strategy for BTC
// Entry: FG index <= 15 (extreme fear) -> long
// Exit: FG index >= 55 OR held 45 days
// Sell signal: FG index >= 85 (extreme greed) -> exit and stay flat 30 days
export function signal(bars, i, ctx) {
  const { entryThreshold, exitThreshold, greedThreshold, holdDays, flatDays } = ctx.params;

  // Initialize state on first call
  if (!ctx.state.init) {
    ctx.state.init = true;
    ctx.state.inPos = false;
    ctx.state.barsHeld = 0;
    ctx.state.flatted = false;
    ctx.state.barsFlat = 0;
  }

  const fg = ctx.fearGreed();
  if (fg === null) return 0;

  const s = ctx.state;

  // Handle flat period after sell signal
  if (s.flatted) {
    s.barsFlat++;
    if (s.barsFlat <= flatDays) return 0;
    s.flatted = false;
    s.barsFlat = 0;
  }

  // Handle position
  if (s.inPos) {
    // Exit conditions: index >= 55 or held 45 days
    if (fg >= exitThreshold || s.barsHeld >= holdDays) {
      s.inPos = false;
      s.barsHeld = 0;
      return 0;
    }
    // Sell signal: extreme greed -> exit and enter flat period
    if (fg >= greedThreshold) {
      s.inPos = false;
      s.barsHeld = 0;
      s.flatted = true;
      s.barsFlat = 0;
      return 0;
    }
    // Stay in position
    s.barsHeld++;
    return 1;
  }

  // Entry signal: extreme fear
  if (fg <= entryThreshold) {
    s.inPos = true;
    s.barsHeld = 1;
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
