// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-social-ta-parabolic-sar-flip",
  name: "Parabolic SAR flip trend-follow (wide US stocks)",
  family: "trend",
  source: "YouTube 'top 5 indicators' compilations featuring Parabolic SAR",
  assetClass: "us_stock",
  timeframe: "1d",
  longShort: true,
  params: {
    afStart: 0.02,
    afStep: 0.02,
    afMax: 0.2
  }
};

export function signal(bars, i, ctx) {
  const { afStart, afStep, afMax } = ctx.params;

  // Initialize on first bar
  if (i === 0) {
    ctx.state.isLong = true;
    ctx.state.sar = bars[0].low;
    ctx.state.af = afStart;
    ctx.state.extremePrice = bars[0].high;
    return 1;
  }

  let isLong = ctx.state.isLong;
  let sar = ctx.state.sar;
  let af = ctx.state.af;
  let extremePrice = ctx.state.extremePrice;

  // Update SAR based on direction
  sar = sar + af * (extremePrice - sar);

  // In uptrend: SAR cannot be above the low of last 2 bars
  if (isLong && i >= 1) {
    sar = Math.min(sar, bars[i - 1].low);
    if (i >= 2) sar = Math.min(sar, bars[i - 2].low);
  }

  // In downtrend: SAR cannot be below the high of last 2 bars
  if (!isLong && i >= 1) {
    sar = Math.max(sar, bars[i - 1].high);
    if (i >= 2) sar = Math.max(sar, bars[i - 2].high);
  }

  // Check for flip
  if (isLong) {
    if (bars[i].low < sar) {
      // Flip to short
      isLong = false;
      sar = extremePrice;
      af = afStart;
      extremePrice = bars[i].low;
    } else {
      // Update extreme price and AF for uptrend
      if (bars[i].high > extremePrice) {
        extremePrice = bars[i].high;
        af = Math.min(af + afStep, afMax);
      }
    }
  } else {
    if (bars[i].high > sar) {
      // Flip to long
      isLong = true;
      sar = extremePrice;
      af = afStart;
      extremePrice = bars[i].high;
    } else {
      // Update extreme price and AF for downtrend
      if (bars[i].low < extremePrice) {
        extremePrice = bars[i].low;
        af = Math.min(af + afStep, afMax);
      }
    }
  }

  ctx.state.isLong = isLong;
  ctx.state.sar = sar;
  ctx.state.af = af;
  ctx.state.extremePrice = extremePrice;

  return isLong ? 1 : -1;
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
