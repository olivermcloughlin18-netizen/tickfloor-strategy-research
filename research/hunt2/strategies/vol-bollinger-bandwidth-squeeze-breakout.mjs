// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "vol-bollinger-bandwidth-squeeze-breakout",
  name: "Bollinger Band squeeze (low bandwidth) breakout",
  family: "low-vol regime + breakout",
  source: "Bollinger, 'Bollinger on Bollinger Bands' 2001; TTM Squeeze popularization",
  assetClass: "crypto",
  timeframe: "1d",
  longShort: true,
  params: {
    bbPeriod: 20,
    bbStd: 2,
    lookbackBars: 180
  },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const { bbPeriod, bbStd, lookbackBars } = ctx.params;

  // Need enough bars for BB period + lookback
  if (i + 1 < bbPeriod || i + 1 < lookbackBars) return 0;

  // Calculate current Bollinger Bands
  let sum = 0, sumSq = 0;
  for (let k = i - bbPeriod + 1; k <= i; k++) {
    const c = bars[k].close;
    sum += c;
    sumSq += c * c;
  }
  const mean = sum / bbPeriod;
  const variance = (sumSq / bbPeriod) - (mean * mean);
  const std = Math.sqrt(variance);
  const upper = mean + bbStd * std;
  const lower = mean - bbStd * std;
  const bandwidth = (upper - lower) / mean;

  // Find minimum bandwidth in lookback window
  let minBandwidth = bandwidth;
  for (let k = i - lookbackBars + 1; k < i; k++) {
    if (k < bbPeriod - 1) continue;  // need enough history for BB
    let ksum = 0, ksumSq = 0;
    for (let j = k - bbPeriod + 1; j <= k; j++) {
      const c = bars[j].close;
      ksum += c;
      ksumSq += c * c;
    }
    const kmean = ksum / bbPeriod;
    const kvariance = (ksumSq / bbPeriod) - (kmean * kmean);
    const kstd = Math.sqrt(kvariance);
    const kupper = kmean + bbStd * kstd;
    const klower = kmean - bbStd * kstd;
    const kbandwidth = (kupper - klower) / kmean;
    minBandwidth = Math.min(minBandwidth, kbandwidth);
  }

  // Check if current bandwidth is at 6-month low (within small tolerance)
  const isSqueeze = bandwidth <= minBandwidth * 1.001;

  if (!isSqueeze) return 0;

  // On squeeze, signal breakout direction
  const close = bars[i].close;
  if (close > upper) return 1;
  if (close < lower) return -1;
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
