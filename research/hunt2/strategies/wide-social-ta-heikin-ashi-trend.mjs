// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-social-ta-heikin-ashi-trend",
  name: "Heikin-Ashi candle color-flip trend system (wide US stocks)",
  family: "social-ta",
  source: "YouTube 'Heikin-Ashi trading strategy' tutorials",
  assetClass: "us_stock",
  timeframe: "1d",
  longShort: true,
  params: {},
};

// Heikin-Ashi trend following: enter on candle color flip with specific wick conditions
export function signal(bars, i, ctx) {
  if (i === 0) {
    // Initialize: bar 0 HA values
    ctx.state.ha_open = bars[0].open;
    ctx.state.ha_close = (bars[0].open + bars[0].high + bars[0].low + bars[0].close) / 4;
    ctx.state.position = 0;
    return 0;
  }

  const prev_ha_open = ctx.state.ha_open;
  const prev_ha_close = ctx.state.ha_close;

  // Previous candle colors
  const prev_red = prev_ha_close <= prev_ha_open;
  const prev_green = prev_ha_close > prev_ha_open;

  // Current bar
  const curr = bars[i];
  const curr_ha_open = (prev_ha_open + prev_ha_close) / 2;
  const curr_ha_close = (curr.open + curr.high + curr.low + curr.close) / 4;
  const curr_ha_low = Math.min(curr.low, curr_ha_open, curr_ha_close);
  const curr_ha_high = Math.max(curr.high, curr_ha_open, curr_ha_close);

  // Current candle colors
  const curr_red = curr_ha_close <= curr_ha_open;
  const curr_green = curr_ha_close > curr_ha_open;

  // Update state for next iteration
  ctx.state.ha_open = curr_ha_open;
  ctx.state.ha_close = curr_ha_close;

  const pos = ctx.state.position || 0;
  const eps = 1e-9;

  // Entry/exit logic
  if (pos === 0) {
    // Long entry: red to green flip with HA_open = HA_low (no upper wick)
    if (prev_red && curr_green && Math.abs(curr_ha_open - curr_ha_low) < eps) {
      ctx.state.position = 1;
      return 1;
    }
    // Short entry: green to red flip with HA_open = HA_high (no lower wick)
    if (prev_green && curr_red && Math.abs(curr_ha_open - curr_ha_high) < eps) {
      ctx.state.position = -1;
      return -1;
    }
    return 0;
  }
  else if (pos === 1) {
    // Exit long on red candle
    if (curr_red) {
      ctx.state.position = 0;
      return 0;
    }
    return 1;
  }
  else if (pos === -1) {
    // Exit short on green candle
    if (curr_green) {
      ctx.state.position = 0;
      return 0;
    }
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
