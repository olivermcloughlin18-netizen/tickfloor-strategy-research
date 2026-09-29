// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "mlq-online-linear-adaptive-momentum",
  name: "Online recursive least-squares adaptive momentum weight",
  family: "momentum",
  source: "Cont, R. (various) market microstructure and adaptive filtering literature",
  assetClass: "crypto",
  timeframe: "1d",
  assets: ["BTCUSDT"],
  params: { lambda: 0.99 },
};

// bars[k] = { time, open, high, low, close, volume } for k = 0..i ONLY (bars.length === i + 1).
// Reading bars[i + 1] throws. Return the position to hold from the close of bar i
// to the close of bar i + 1: 1 long, 0 flat, -1 short.
// The harness calls signal for i = 0, 1, 2, ... in order, once per asset;
// ctx.state is a scratch object you may keep running totals in.
// ctx.params is meta.params. Crypto only: ctx.fearGreed() and ctx.fundingRate() return the latest known value or null.
export function signal(bars, i, ctx) {
  const lambda = ctx.params.lambda;

  // Need 20 bars to compute 20-day returns
  if (i < 20) return 0;

  // Initialize RLS state
  if (!ctx.state.init) {
    ctx.state.init = true;
    ctx.state.theta = [0, 0, 0, 0]; // [intercept, coef_r1, coef_r5, coef_r20]
    ctx.state.P = [
      [1e6, 0, 0, 0],
      [0, 1e6, 0, 0],
      [0, 0, 1e6, 0],
      [0, 0, 0, 1e6]
    ]; // inverse covariance matrix
  }

  // Compute returns at bar i
  const r1 = bars[i].close / bars[i - 1].close - 1;
  const r5 = bars[i].close / bars[i - 5].close - 1;
  const r20 = bars[i].close / bars[i - 20].close - 1;
  const xi = [1, r1, r5, r20];

  // RLS update using observation from bar i-1 -> i
  if (i > 20) {
    const r1_prev = bars[i - 1].close / bars[i - 2].close - 1;
    const r5_prev = bars[i - 1].close / bars[i - 6].close - 1;
    const r20_prev = bars[i - 1].close / bars[i - 21].close - 1;
    const x_prev = [1, r1_prev, r5_prev, r20_prev];

    const y = bars[i].close / bars[i - 1].close - 1;

    // Compute P @ x
    const Px = [0, 0, 0, 0];
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) {
        Px[j] += ctx.state.P[j][k] * x_prev[k];
      }
    }

    // Compute x^T @ P @ x
    let xTPx = 0;
    for (let j = 0; j < 4; j++) {
      xTPx += x_prev[j] * Px[j];
    }

    // Compute gain vector
    const denom = lambda + xTPx;
    const gain = [];
    for (let j = 0; j < 4; j++) {
      gain[j] = Px[j] / denom;
    }

    // Compute prediction error
    let pred = 0;
    for (let j = 0; j < 4; j++) {
      pred += ctx.state.theta[j] * x_prev[j];
    }
    const err = y - pred;

    // Update theta
    for (let j = 0; j < 4; j++) {
      ctx.state.theta[j] += gain[j] * err;
    }

    // Update P matrix
    const newP = [];
    for (let j = 0; j < 4; j++) {
      newP[j] = [];
      for (let k = 0; k < 4; k++) {
        let val = ctx.state.P[j][k];
        for (let m = 0; m < 4; m++) {
          val -= gain[j] * x_prev[m] * ctx.state.P[m][k];
        }
        newP[j][k] = val / lambda;
      }
    }
    ctx.state.P = newP;
  }

  // Predict next-day return using current theta and features
  let nextPred = 0;
  for (let j = 0; j < 4; j++) {
    nextPred += ctx.state.theta[j] * xi[j];
  }

  return nextPred > 0 ? 1 : 0;
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
