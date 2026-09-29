// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-social-ta-obv-divergence",
  name: "On-Balance Volume (OBV) divergence (wide US stocks)",
  family: "momentum",
  source: "YouTube 'OBV divergence secret' and r/algotrading OBV threads",
  assetClass: "us_stock",
  timeframe: "1d",
  longShort: true,
  params: { divergenceWindow: 30, confirmBars: 2, holdBars: 15, atrMult: 2, obvMaPeriod: 20 },
};

function initState(ctx) {
  if (!ctx.state.obv) {
    ctx.state.obv = [];
    ctx.state.tr = [];
    ctx.state.position = 0;
    ctx.state.entryBar = -1;
    ctx.state.entryPrice = 0;
    ctx.state.bullishDivConfirm = 0;
    ctx.state.bearishDivConfirm = 0;
  }
}

function updateOBV(bars, i, ctx) {
  if (i === 0) {
    ctx.state.obv[0] = bars[0].volume;
  } else {
    const prevClose = bars[i - 1].close;
    const currClose = bars[i].close;
    if (currClose > prevClose) {
      ctx.state.obv[i] = ctx.state.obv[i - 1] + bars[i].volume;
    } else if (currClose < prevClose) {
      ctx.state.obv[i] = ctx.state.obv[i - 1] - bars[i].volume;
    } else {
      ctx.state.obv[i] = ctx.state.obv[i - 1];
    }
  }
}

function updateTR(bars, i, ctx) {
  let tr;
  if (i === 0) {
    tr = bars[0].high - bars[0].low;
  } else {
    const hl = bars[i].high - bars[i].low;
    const hc = Math.abs(bars[i].high - bars[i - 1].close);
    const lc = Math.abs(bars[i].low - bars[i - 1].close);
    tr = Math.max(hl, hc, lc);
  }
  ctx.state.tr[i] = tr;
}

function getATR(bars, i, ctx, period = 14) {
  if (i < period) return 0;
  let sum = 0;
  for (let k = i - period + 1; k <= i; k++) sum += ctx.state.tr[k];
  return sum / period;
}

function getOBVMA(i, ctx, period = 20) {
  if (i < period) return 0;
  let sum = 0;
  for (let k = i - period + 1; k <= i; k++) sum += ctx.state.obv[k];
  return sum / period;
}

export function signal(bars, i, ctx) {
  const p = ctx.params;
  initState(ctx);
  updateOBV(bars, i, ctx);
  updateTR(bars, i, ctx);

  // Need enough history for OBV MA and divergence detection
  if (i < Math.max(p.obvMaPeriod, p.divergenceWindow)) {
    return 0;
  }

  const atr = getATR(bars, i, ctx);
  const obvMA = getOBVMA(i, ctx, p.obvMaPeriod);

  // Check for divergences over the window
  let bullishDiv = false;
  let bearishDiv = false;

  if (i >= p.divergenceWindow) {
    let minLowIdx = i;
    let maxHighIdx = i;
    for (let k = i - p.divergenceWindow; k < i; k++) {
      if (bars[k].low < bars[minLowIdx].low) minLowIdx = k;
      if (bars[k].high > bars[maxHighIdx].high) maxHighIdx = k;
    }

    // Bullish divergence: current low < past low, but current OBV > past OBV
    if (minLowIdx < i && bars[i].low > bars[minLowIdx].low && ctx.state.obv[i] > ctx.state.obv[minLowIdx]) {
      bullishDiv = true;
    }

    // Bearish divergence: current high > past high, but current OBV < past OBV
    if (maxHighIdx < i && bars[i].high < bars[maxHighIdx].high && ctx.state.obv[i] < ctx.state.obv[maxHighIdx]) {
      bearishDiv = true;
    }
  }

  // Track confirmation bars
  if (bullishDiv) {
    ctx.state.bullishDivConfirm = p.confirmBars;
    ctx.state.bearishDivConfirm = 0;
  } else if (ctx.state.bullishDivConfirm > 0) {
    ctx.state.bullishDivConfirm--;
  }

  if (bearishDiv) {
    ctx.state.bearishDivConfirm = p.confirmBars;
    ctx.state.bullishDivConfirm = 0;
  } else if (ctx.state.bearishDivConfirm > 0) {
    ctx.state.bearishDivConfirm--;
  }

  // Handle exits
  if (ctx.state.position !== 0) {
    const barsHeld = i - ctx.state.entryBar;
    const obv = ctx.state.obv[i];

    // Exit conditions
    let shouldExit = false;

    // Exit on time (15 bars held)
    if (barsHeld >= p.holdBars) {
      shouldExit = true;
    }

    // Exit on OBV below MA
    if (obv < obvMA) {
      shouldExit = true;
    }

    // Exit on price reaching target (±2*ATR)
    if (ctx.state.position === 1 && bars[i].high >= ctx.state.entryPrice + 2 * atr) {
      shouldExit = true;
    }
    if (ctx.state.position === -1 && bars[i].low <= ctx.state.entryPrice - 2 * atr) {
      shouldExit = true;
    }

    if (shouldExit) {
      ctx.state.position = 0;
      ctx.state.entryBar = -1;
      ctx.state.entryPrice = 0;
      return 0;
    }

    return ctx.state.position;
  }

  // Open new position
  if (ctx.state.bullishDivConfirm === 0 && bullishDiv) {
    ctx.state.position = 1;
    ctx.state.entryBar = i;
    ctx.state.entryPrice = bars[i].close;
    return 1;
  }

  if (ctx.state.bearishDivConfirm === 0 && bearishDiv) {
    ctx.state.position = -1;
    ctx.state.entryBar = i;
    ctx.state.entryPrice = bars[i].close;
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
