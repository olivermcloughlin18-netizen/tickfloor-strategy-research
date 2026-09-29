// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "social-ta-cci-extreme-reversal",
  name: "CCI(20) extreme reversal (±200)",
  family: "mean_reversion",
  source: "YouTube 'CCI indicator secret strategy' videos",
  assetClass: "crypto",
  timeframe: "1d",
  longShort: true,
  params: { cciPeriod: 20, upperThreshold: 200, lowerThreshold: -200, exitUpper: 100, exitLower: -100, maxHold: 15 },
};

function calcCCI(bars, i, period) {
  if (i < period - 1) return 0;

  // Calculate typical price for the last 'period' bars
  let typicalSum = 0;
  for (let k = i - period + 1; k <= i; k++) {
    const tp = (bars[k].high + bars[k].low + bars[k].close) / 3;
    typicalSum += tp;
  }
  const sma = typicalSum / period;

  // Calculate mean absolute deviation
  let madSum = 0;
  for (let k = i - period + 1; k <= i; k++) {
    const tp = (bars[k].high + bars[k].low + bars[k].close) / 3;
    madSum += Math.abs(tp - sma);
  }
  const mad = madSum / period;

  // CCI = (TP - SMA) / (0.015 * MAD)
  const tp = (bars[i].high + bars[i].low + bars[i].close) / 3;
  if (mad === 0) return 0;
  return (tp - sma) / (0.015 * mad);
}

export function signal(bars, i, ctx) {
  const { cciPeriod, upperThreshold, lowerThreshold, exitUpper, exitLower, maxHold } = ctx.params;

  // Initialize state if needed
  if (!ctx.state.initialized) {
    ctx.state.initialized = true;
    ctx.state.position = 0;      // 0=flat, 1=long, -1=short
    ctx.state.holdBars = 0;
    ctx.state.prevCCI = 0;
  }

  const cci = calcCCI(bars, i, cciPeriod);
  const prevCCI = ctx.state.prevCCI;

  let action = ctx.state.position;

  if (ctx.state.position === 0) {
    // Not in a trade - check for entry

    // Long entry: CCI crosses above -200 from below
    if (prevCCI <= lowerThreshold && cci > lowerThreshold) {
      action = 1;
      ctx.state.holdBars = 0;
    }

    // Short entry: CCI crosses below +200 from above
    else if (prevCCI >= upperThreshold && cci < upperThreshold) {
      action = -1;
      ctx.state.holdBars = 0;
    }
  } else if (ctx.state.position === 1) {
    // In long - check for exit

    // Exit on CCI > exitUpper or after maxHold bars
    if (cci > exitUpper || ctx.state.holdBars >= maxHold) {
      action = 0;
    } else {
      action = 1;
      ctx.state.holdBars++;
    }
  } else if (ctx.state.position === -1) {
    // In short - check for exit

    // Exit on CCI < exitLower or after maxHold bars
    if (cci < exitLower || ctx.state.holdBars >= maxHold) {
      action = 0;
    } else {
      action = -1;
      ctx.state.holdBars++;
    }
  }

  ctx.state.position = action;
  ctx.state.prevCCI = cci;

  return action;
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
