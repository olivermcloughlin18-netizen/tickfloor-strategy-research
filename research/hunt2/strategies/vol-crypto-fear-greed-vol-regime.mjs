// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "vol-crypto-fear-greed-vol-regime",
  name: "Crypto Fear & Greed extreme-value contrarian, vol-regime gated",
  family: "vol regime + sentiment",
  source: "alternative.me Fear & Greed index; retail contrarian trading folklore",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT"],
  holdBars: 14,
  params: {
    volWindow: 30,
    medianWindow: 90,
    fearGreedThreshold: 20
  }
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.

function getRealizedVol(bars, endIdx, window) {
  if (endIdx < window - 1) return 0;
  let sumSq = 0;
  for (let k = endIdx - window + 1; k < endIdx; k++) {
    const ret = bars[k + 1].close / bars[k].close - 1;
    sumSq += ret * ret;
  }
  return Math.sqrt(sumSq / window);
}

export function signal(bars, i, ctx) {
  const { volWindow, medianWindow, fearGreedThreshold } = ctx.params;

  // Need enough history for median window
  if (i < medianWindow - 1) return 0;

  // Get Fear & Greed index
  const fg = ctx.fearGreed();
  if (fg === null) return 0;

  // Check extreme fear condition
  if (fg >= fearGreedThreshold) return 0;

  // Calculate 30d realized vol for current window
  const vol30 = getRealizedVol(bars, i, volWindow);

  // Calculate median of 30d realized vols over past 90 days
  const vols = [];
  for (let j = i - medianWindow + 1; j <= i; j++) {
    if (j >= volWindow - 1) {
      const vol = getRealizedVol(bars, j, volWindow);
      vols.push(vol);
    }
  }

  if (vols.length === 0) return 0;

  // Calculate median
  vols.sort((a, b) => a - b);
  const mid = Math.floor(vols.length / 2);
  const medianVol = vols.length % 2 === 0
    ? (vols[mid - 1] + vols[mid]) / 2
    : vols[mid];

  // Buy signal: extreme fear AND vol above median
  return vol30 > medianVol ? 1 : 0;
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
