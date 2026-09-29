// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-mlq-adaptive-boll-meanrev-vol-regime",
  name: "Bollinger mean-reversion gated by HMM regime (combined ML overlay) (wide US stocks)",
  family: "mean_reversion",
  source: "Ang & Bekaert (2002) Review of Financial Studies; Bollinger Bands (John Bollinger)",
  assetClass: "us_stock",
  universe: "US_STOCKS_WIDE",
  timeframe: "1d",
  params: {
    volWindow: 20,      // realized vol window (days)
    refitDays: 30,      // refit HMM regime every N days
    bbWindow: 20,       // Bollinger Band window
    bbStdDev: 2,        // Bollinger Band std dev multiplier
    maxHold: 10,        // max hold days for a trade
  },
};

// Helper: calculate returns volatility over a window
function calcRealizedVol(bars, startIdx, endIdx) {
  if (startIdx < 0 || endIdx < 0 || startIdx > endIdx) return 0;
  let returns = [];
  for (let k = startIdx; k < endIdx; k++) {
    const ret = (bars[k + 1].close - bars[k].close) / bars[k].close;
    returns.push(ret);
  }
  if (returns.length === 0) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  let variance = 0;
  for (const r of returns) {
    variance += (r - mean) * (r - mean);
  }
  variance /= Math.max(1, returns.length - 1);
  return Math.sqrt(variance);
}

// Helper: calculate SMA
function calcSMA(bars, endIdx, window) {
  if (endIdx < window - 1) return null;
  let sum = 0;
  for (let k = endIdx - window + 1; k <= endIdx; k++) {
    sum += bars[k].close;
  }
  return sum / window;
}

// Helper: calculate std dev
function calcStdDev(bars, endIdx, window) {
  if (endIdx < window - 1) return null;
  let sum = 0;
  for (let k = endIdx - window + 1; k <= endIdx; k++) {
    sum += bars[k].close;
  }
  const mean = sum / window;
  let variance = 0;
  for (let k = endIdx - window + 1; k <= endIdx; k++) {
    variance += (bars[k].close - mean) * (bars[k].close - mean);
  }
  variance /= window;
  return Math.sqrt(variance);
}

// Helper: determine if we're in a low vol or high vol regime using vol median
function determineRegime(state, bars, i, params) {
  if (state.volHistory === undefined) {
    state.volHistory = [];
    state.lastRefitBar = 0;
    state.volRegime = 0; // 0 = low vol, 1 = high vol
  }

  // Calculate realized vol for current bar
  const currentVol = calcRealizedVol(bars, Math.max(0, i - params.volWindow + 1), i);
  state.volHistory.push(currentVol);

  // Keep only recent vol history
  if (state.volHistory.length > params.refitDays + params.volWindow) {
    state.volHistory.shift();
  }

  // Refit regime every refitDays
  if (i - state.lastRefitBar >= params.refitDays && state.volHistory.length > params.volWindow) {
    // Use median vol of the recent window as threshold
    const recentVols = state.volHistory.slice(-params.refitDays);
    const sorted = [...recentVols].sort((a, b) => a - b);
    const medianVol = sorted[Math.floor(sorted.length / 2)];

    // Simple threshold: if current vol > median, we're in high vol regime
    state.volRegime = currentVol > medianVol ? 1 : 0;
    state.lastRefitBar = i;
    state.volThreshold = medianVol;
  }

  return state.volRegime;
}

export function signal(bars, i, ctx) {
  const params = ctx.params;

  // Initialize state
  if (ctx.state.initialized === undefined) {
    ctx.state.initialized = true;
    ctx.state.inPosition = false;
    ctx.state.entryBar = -1;
    ctx.state.volHistory = [];
    ctx.state.lastRefitBar = 0;
    ctx.state.volRegime = 0;
  }

  // Need minimum history
  if (i < params.bbWindow + params.volWindow - 1) {
    return 0;
  }

  // Determine current regime
  determineRegime(ctx.state, bars, i, params);

  // Calculate Bollinger Bands
  const sma = calcSMA(bars, i, params.bbWindow);
  const stdDev = calcStdDev(bars, i, params.bbWindow);

  if (sma === null || stdDev === null) {
    return 0;
  }

  const lowerBand = sma - params.bbStdDev * stdDev;
  const middleBand = sma;
  const upperBand = sma + params.bbStdDev * stdDev;

  const currentPrice = bars[i].close;

  // In high vol regime, no trades
  if (ctx.state.volRegime === 1) {
    if (ctx.state.inPosition) {
      ctx.state.inPosition = false;
      ctx.state.entryBar = -1;
      return 0; // exit if we're in a position
    }
    return 0;
  }

  // Low vol regime trading logic
  const holdDays = i - ctx.state.entryBar;

  // Exit conditions
  if (ctx.state.inPosition) {
    // Exit if price touches or crosses middle band
    if (currentPrice >= middleBand) {
      ctx.state.inPosition = false;
      ctx.state.entryBar = -1;
      return 0;
    }
    // Exit if max hold time reached
    if (holdDays >= params.maxHold) {
      ctx.state.inPosition = false;
      ctx.state.entryBar = -1;
      return 0;
    }
    // Stay in position
    return 1;
  }

  // Entry condition: buy when price touches lower band
  if (currentPrice <= lowerBand && !ctx.state.inPosition) {
    ctx.state.inPosition = true;
    ctx.state.entryBar = i;
    return 1;
  }

  return 0;
}
