// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "calendar-crypto-lunar-new-year",
  name: "Lunar New Year Asia-driven crypto seasonality",
  family: "calendar",
  source: "Crypto trade-press/exchange volume commentary (CryptoQuant/Kaiko notes)",
  assetClass: "crypto",
  timeframe: "1d",
  params: {},
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  // Lunar New Year dates (month, day) for discovery period
  const lunarNewYears = [
    [2, 8],   // 2016-02-08
    [1, 28],  // 2017-01-28
    [2, 16],  // 2018-02-16
    [2, 5],   // 2019-02-05
    [1, 25],  // 2020-01-25
    [2, 12],  // 2021-02-12
    [2, 1],   // 2022-02-01
    [1, 22],  // 2023-01-22
    [2, 10],  // 2024-02-10
    [1, 29],  // 2025-01-29
  ];

  // bars[i].time is in seconds since epoch
  const d = new Date(bars[i].time * 1000);
  const month = d.getUTCMonth() + 1; // 1-12
  const day = d.getUTCDate();        // 1-31

  // Check if within 3 days of any lunar new year date (7 days total window)
  for (const [m, dayLny] of lunarNewYears) {
    if (month === m && Math.abs(day - dayLny) <= 3) {
      return 0; // Flat during Lunar New Year window
    }
  }

  return 1; // Long otherwise
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
