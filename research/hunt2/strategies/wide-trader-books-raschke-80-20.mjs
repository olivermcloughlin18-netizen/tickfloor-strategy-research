// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-trader-books-raschke-80-20",
  name: "Raschke 80-20 (Wilder) reversal (wide US stocks)",
  family: "mean_reversion",
  source: "Linda Raschke / Wilder 80-20 rule",
  assetClass: "us_stock",
  timeframe: "1d",
  longShort: true,
  params: {},
};

// Raschke 80-20 reversal: setup on prior bar, entry and exit on current bar
export function signal(bars, i, ctx) {
  if (i === 0) return 0; // need prior bar

  const prev = bars[i - 1];
  const curr = bars[i];

  // Initialize state
  if (!ctx.state) {
    ctx.state = { inTrade: false, tradeType: null };
  }

  // Calculate levels from prior bar
  const range = prev.high - prev.low;
  const entry20 = prev.low + 0.2 * range;    // 20% line from bottom
  const entry80 = prev.high - 0.2 * range;   // 80% line from top
  const midpoint = (prev.high + prev.low) / 2;

  // Setup conditions: prior day closes at extreme
  const longSetup = prev.close <= entry20;   // closes in bottom 20%
  const shortSetup = prev.close >= entry80;  // closes in top 20%

  // Gap conditions: current day opens in direction of setup
  const gapUp = curr.open > prev.close;      // gap up for long
  const gapDn = curr.open < prev.close;      // gap down for short

  // Entry conditions: price trades through entry level on current bar
  const canLongEntry = longSetup && gapUp && curr.low <= entry20;
  const canShortEntry = shortSetup && gapDn && curr.high >= entry80;

  // Exit logic for existing trades
  if (ctx.state.inTrade) {
    if (ctx.state.tradeType === 'long') {
      if (curr.low <= prev.low) return 0;    // stop: below yesterday's low
      if (curr.high >= midpoint) return 0;   // target: at or above midpoint
      return 1;                               // hold
    } else if (ctx.state.tradeType === 'short') {
      if (curr.high >= prev.high) return 0;  // stop: above yesterday's high
      if (curr.low <= midpoint) return 0;    // target: at or below midpoint
      return -1;                              // hold
    }
  }

  // Entry logic
  if (canLongEntry) {
    ctx.state.inTrade = true;
    ctx.state.tradeType = 'long';
    return 1;
  }

  if (canShortEntry) {
    ctx.state.inTrade = true;
    ctx.state.tradeType = 'short';
    return -1;
  }

  return 0;
}

// PORTFOLIO strategies (cross-sectional): delete signal() above and export rank() instead.
// Add to meta: universe: "US_STOCKS_WIDE" (or CRYPTO_DAILY / ETFS_DAILY), rebalance: "monthly" (or weekly / daily).
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
