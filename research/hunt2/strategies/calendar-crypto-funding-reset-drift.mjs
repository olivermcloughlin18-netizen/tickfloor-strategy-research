// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "calendar-crypto-funding-reset-drift",
  name: "Crypto perpetual funding-reset time drift",
  family: "calendar",
  source: "Exchange/trader community commentary on funding-time microstructure",
  assetClass: "crypto",
  timeframe: "1h",
  assets: ["BTCUSDT"],
  longShort: true,
  params: { fundingThreshold: 0.0002 }  // 0.02% threshold
};

// Short BTC perps 15 minutes before each 8h funding timestamp (00:00/08:00/16:00 UTC)
// when funding rate exceeds +0.02%, exit 15 minutes after reset.
export function signal(bars, i, ctx) {
  const fundingRate = ctx.fundingRate();
  if (fundingRate === null) return 0;
  if (fundingRate <= ctx.params.fundingThreshold) return 0;

  const time = bars[i].time;

  // Get minutes since last midnight UTC
  // Assuming time is in milliseconds since epoch
  const ms = time;
  const secondsSinceMidnight = Math.floor((ms / 1000) % (24 * 3600));
  const minutesSinceMidnight = Math.floor(secondsSinceMidnight / 60);

  // Funding times in minutes from midnight: 0 (00:00), 480 (08:00), 960 (16:00)
  const fundingTimes = [0, 480, 960];

  for (const ft of fundingTimes) {
    // Window: 15 min before to 15 min after funding reset
    const windowStart = (ft - 15 + 1440) % 1440;
    const windowEnd = (ft + 15) % 1440;

    if (windowStart < windowEnd) {
      // Normal case (doesn't wrap around midnight)
      if (minutesSinceMidnight >= windowStart && minutesSinceMidnight < windowEnd) {
        return -1;
      }
    } else {
      // Wraps around midnight (for 00:00 funding: 23:45 to 00:15)
      if (minutesSinceMidnight >= windowStart || minutesSinceMidnight < windowEnd) {
        return -1;
      }
    }
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
