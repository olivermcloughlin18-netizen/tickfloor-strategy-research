// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-mrsa-ou-halflife-pair-crypto",
  name: "Ornstein-Uhlenbeck half-life z-score, crypto pair (BTC/ETH spread) (wide US stocks)",
  family: "mean-reversion-statarb",
  source: "Avellaneda & Lee 2010, Quantitative Finance",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "daily",
  longShort: true,
  params: {
    halflifeMin: 5,
    halflifeMax: 60,
    zEntry: 1.5,
    zExit: 0,
    zStop: 3,
    refitDays: 60,
    lookbackDays: 250
  },
};

// Crypto cross-sectional: rank must return weights {symbol: weight}
// Assets must be BTCUSDT and ETHUSDT to compute the spread
export function rank(universe, t, ctx) {
  const btc = universe["BTCUSDT"];
  const eth = universe["ETHUSDT"];

  if (!btc || !eth || btc.length < ctx.params.lookbackDays || eth.length < ctx.params.lookbackDays) {
    return {};
  }

  // Use lookback days (default 250)
  const lookback = ctx.params.lookbackDays;
  const n = Math.min(btc.length, eth.length);
  const start = Math.max(0, n - lookback);

  // Compute log spread: log(BTC/ETH)
  const spreads = [];
  for (let i = start; i < n; i++) {
    const spread = Math.log(btc[i].close / eth[i].close);
    spreads.push(spread);
  }

  if (spreads.length < 2) return {};

  // Fit AR(1): spread_t = a + b*spread_{t-1} + e
  // Use OLS regression
  let sumXY = 0, sumXX = 0, sumX = 0, sumY = 0;
  for (let i = 1; i < spreads.length; i++) {
    const x = spreads[i - 1];
    const y = spreads[i];
    sumXY += x * y;
    sumXX += x * x;
    sumX += x;
    sumY += y;
  }

  const n_obs = spreads.length - 1;
  const b = (n_obs * sumXY - sumX * sumY) / (n_obs * sumXX - sumX * sumX);
  const a = (sumY - b * sumX) / n_obs;

  // Check half-life constraint
  if (Math.abs(b) >= 1) return {}; // Non-stationary
  const halflife = -Math.log(2) / Math.log(b);
  const minHL = ctx.params.halflifeMin;
  const maxHL = ctx.params.halflifeMax;
  if (halflife < minHL || halflife > maxHL) return {};

  // Compute OU stationary variance
  const residuals = [];
  for (let i = 1; i < spreads.length; i++) {
    const predicted = a + b * spreads[i - 1];
    residuals.push(spreads[i] - predicted);
  }

  let sumResidSq = 0;
  for (const res of residuals) sumResidSq += res * res;
  const variance = sumResidSq / residuals.length;
  const stddev = Math.sqrt(Math.abs(variance / (1 - b * b)));

  if (stddev === 0) return {};

  // Compute z-score on current spread
  const currentSpread = spreads[spreads.length - 1];
  const meanSpread = sumY / n_obs;
  const z = (currentSpread - meanSpread) / stddev;

  const zEntry = ctx.params.zEntry;
  const zExit = ctx.params.zExit;
  const zStop = ctx.params.zStop;

  // Determine position
  let weight = 0;
  if (Math.abs(z) > zStop) {
    weight = 0; // Stop out
  } else if (z > zEntry) {
    weight = 1; // Long spread: long BTC, short ETH
  } else if (z < -zEntry) {
    weight = -1; // Short spread: short BTC, long ETH
  } else if (Math.abs(z) < zExit) {
    weight = 0; // Exit
  }

  const w = {};
  if (weight > 0) {
    w["BTCUSDT"] = 0.5;
    w["ETHUSDT"] = -0.5;
  } else if (weight < 0) {
    w["BTCUSDT"] = -0.5;
    w["ETHUSDT"] = 0.5;
  }
  return w;
}
