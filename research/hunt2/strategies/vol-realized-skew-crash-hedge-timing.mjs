// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "vol-realized-skew-crash-hedge-timing",
  name: "Realized-vol skew (down-vol vs up-vol) crash-risk timing",
  family: "volatility",
  source: "Ang, Chen, Xing 2006 'Downside Risk' RFS",
  assetClass: "crypto",
  timeframe: "1d",
  params: { lookback: 20, highRatio: 1.5, lowRatio: 1.2 },
};

// Compute realized vol skew: when down-vol exceeds up-vol by >1.5x, reduce to cash.
// Restore when ratio normalizes below 1.2x.
export function signal(bars, i, ctx) {
  const lookback = ctx.params.lookback;

  if (i < lookback) return 0; // not enough history

  // Initialize state to track current mode
  if (ctx.state === undefined) ctx.state = { hedging: false };

  // Calculate realized vol separately for up days and down days
  let upVol = 0, downVol = 0;
  let upCount = 0, downCount = 0;

  // Compute close-to-close returns for the lookback period
  for (let k = i - lookback + 1; k <= i; k++) {
    const ret = (bars[k].close - bars[k - 1].close) / bars[k - 1].close;
    const absRet = Math.abs(ret);

    if (ret > 0) {
      upVol += absRet;
      upCount++;
    } else if (ret < 0) {
      downVol += absRet;
      downCount++;
    }
  }

  // Compute average magnitude of moves
  const avgUpVol = upCount > 0 ? upVol / upCount : 0;
  const avgDownVol = downCount > 0 ? downVol / downCount : 0;

  // Compute ratio with safeguard against division by zero
  const safeUpVol = avgUpVol > 0 ? avgUpVol : 0.0001;
  const ratio = avgDownVol / safeUpVol;

  // Regime switching logic
  if (ctx.state.hedging) {
    // In hedged (flat) mode, restore full exposure when ratio normalizes below lowRatio
    if (ratio < ctx.params.lowRatio) {
      ctx.state.hedging = false;
      return 1;
    }
    return 0;
  } else {
    // In long mode, move to cash when ratio exceeds highRatio
    if (ratio > ctx.params.highRatio) {
      ctx.state.hedging = true;
      return 0;
    }
    return 1;
  }
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
