// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "mlq-kalman-trend-filter__rob2",
  name: "Kalman filter dynamic trend/slope estimate",
  family: "ml-quant-modern",
  source: "Ernest Chan, Algorithmic Trading (2013), ch. on Kalman filters",
  assetClass: "crypto",
  timeframe: "1d",
  params: { q: 1e-5, r: 1.25e-3 },
};

// Local-linear-trend Kalman filter for trend detection.
// State: [level, slope] where level is the estimated price and slope is its rate of change.
// Observation: daily close price.
// Return 1 (long) when slope > 0 AND price > filtered level.
// Return 0 (flat) when slope <= 0.
export function signal(bars, i, ctx) {
  if (i === 0) {
    // Initialize Kalman filter state on ctx.state object
    ctx.state.level = bars[0].close;
    ctx.state.slope = 0;
    // State covariance P = [[p00, p01], [p10, p11]]
    ctx.state.p00 = 1.0;
    ctx.state.p01 = 0.0;
    ctx.state.p10 = 0.0;
    ctx.state.p11 = 1.0;
    return 0;
  }

  const q = ctx.params.q;
  const r = ctx.params.r;
  const z = bars[i].close; // Observation: close price
  const s = ctx.state;

  // Predict step: x_pred = F * x where F = [[1, 1], [0, 1]]
  // level_pred = level + slope
  // slope_pred = slope
  const level_pred = s.level + s.slope;
  const slope_pred = s.slope;

  // Predict covariance: P_pred = F * P * F^T + Q
  // F = [[1, 1], [0, 1]], Q = [[q, 0], [0, q]]
  // F * P = [[p00 + p10, p01 + p11], [p10, p11]]
  // (F * P) * F^T = [[p00 + 2*p01 + p11 + q, p01 + p11], [p01 + p11, p11 + q]]
  const p00_pred = s.p00 + 2 * s.p01 + s.p11 + q;
  const p01_pred = s.p01 + s.p11;
  const p10_pred = s.p01 + s.p11;
  const p11_pred = s.p11 + q;

  // Update step: Observation model is H = [1, 0] (we observe the level)
  // y_residual = z - H * x_pred = z - level_pred
  const y_residual = z - level_pred;

  // S = H * P_pred * H^T + R = p00_pred + r
  const S = p00_pred + r;

  // Kalman gain K = P_pred * H^T / S = [p00_pred / S, p10_pred / S]
  const K0 = p00_pred / S;
  const K1 = p10_pred / S;

  // Update state: x = x_pred + K * y_residual
  s.level = level_pred + K0 * y_residual;
  s.slope = slope_pred + K1 * y_residual;

  // Update covariance: P = (I - K * H) * P_pred
  // I - K * H = [[1 - K0, -K0], [-K1, 1 - K1]]
  // (I - K*H) * P_pred = [[(1-K0)*p00_pred - K0*p10_pred, (1-K0)*p01_pred - K0*p11_pred],
  //                        [-K1*p00_pred + (1-K1)*p10_pred, -K1*p01_pred + (1-K1)*p11_pred]]
  s.p00 = (1 - K0) * p00_pred - K0 * p10_pred;
  s.p01 = (1 - K0) * p01_pred - K0 * p11_pred;
  s.p10 = -K1 * p00_pred + (1 - K1) * p10_pred;
  s.p11 = -K1 * p01_pred + (1 - K1) * p11_pred;

  // Signal: 1 (long) when slope > 0 AND price > filtered level, 0 (flat) otherwise
  return s.slope > 0 && z > s.level ? 1 : 0;
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
