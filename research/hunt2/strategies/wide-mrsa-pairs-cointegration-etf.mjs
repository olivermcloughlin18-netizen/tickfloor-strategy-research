// Cointegrated ETF pairs trading: Engle-Granger test, z-score mean reversion

export const meta = {
  id: "wide-mrsa-pairs-cointegration-etf",
  name: "Cointegrated ETF pair (e.g. XLE/XOP, GLD/SLV) z-score reversion (wide US stocks)",
  family: "mean-reversion-statarb",
  source: "Gatev, Goetzmann, Rouwenhorst 2006 'Pairs Trading: Performance of a Relative-Value Arbitrage Rule'",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "daily",
  longShort: true,
  params: {
    cointWindow: 252,
    zWindow: 60,
    zEntryLong: -2,
    zEntryShort: 2,
    zStop: 3.5,
    recomputeFreq: 20,
    maxHold: 20,
  }
};

// OLS: compute slope of y = a + b*x, return b
function computeOLS(x, y) {
  const n = x.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i];
    sy += y[i];
    sxx += x[i] * x[i];
    sxy += x[i] * y[i];
  }
  const denom = n * sxx - sx * sx;
  return denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
}

// Simple stationarity test: check if residuals mean-revert (low autocorrelation)
// Return p-value (lower = more stationary)
function testStationarity(residuals) {
  const n = residuals.length;
  if (n < 10) return 1;

  let mean = 0;
  for (let i = 0; i < n; i++) mean += residuals[i];
  mean /= n;

  let var0 = 0, lag1Cov = 0;
  for (let i = 0; i < n; i++) {
    const r = residuals[i] - mean;
    var0 += r * r;
    if (i < n - 1) lag1Cov += r * (residuals[i + 1] - mean);
  }
  var0 /= n;

  if (var0 === 0) return 1;
  const rho = lag1Cov / (n * var0);

  // Under null of unit root, rho ≈ 1. Test if rho is significantly < 1.
  // tstat = (rho - 1) / se, where se ≈ sqrt((1-rho^2)/n)
  const se = Math.sqrt((1 - rho * rho) / n);
  const tstat = (rho - 1) / (se + 1e-10);

  // Mackinnon critical value for ADF: -2.86 at 5% level
  // Simple mapping: if tstat < -2.86, reject unit root (p < 0.05)
  return tstat < -2.86 ? 0.01 : Math.max(0.05, Math.exp(tstat / 2) * 0.5);
}

export function rank(universe, t, ctx) {
  if (!ctx.state.pairData) {
    ctx.state.pairData = {};
    ctx.state.lastRecompute = 0;
  }

  const symbols = Object.keys(universe).sort();
  const weights = {};

  // Recompute cointegration every N days
  if (t - ctx.state.lastRecompute >= ctx.params.recomputeFreq || Object.keys(ctx.state.pairData).length === 0) {
    ctx.state.pairData = {};

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const sym_a = symbols[i];
        const sym_b = symbols[j];
        const bars_a = universe[sym_a];
        const bars_b = universe[sym_b];

        if (bars_a.length < ctx.params.cointWindow || bars_b.length < ctx.params.cointWindow) continue;

        // Get last N days
        const closes_a = bars_a.slice(-ctx.params.cointWindow).map(b => b.close);
        const closes_b = bars_b.slice(-ctx.params.cointWindow).map(b => b.close);

        // OLS: A = beta * B
        const beta = computeOLS(closes_b, closes_a);
        if (beta === 0) continue;

        const residuals = closes_a.map((a, k) => a - beta * closes_b[k]);
        const pval = testStationarity(residuals);

        if (pval < 0.05) {
          ctx.state.pairData[`${sym_a}/${sym_b}`] = {
            sym_a,
            sym_b,
            beta,
            entryDay: null,
            entrySign: 0,
          };
        }
      }
    }

    ctx.state.lastRecompute = t;
  }

  // Generate positions for cointegrated pairs
  for (const pairKey in ctx.state.pairData) {
    const pair = ctx.state.pairData[pairKey];
    const bars_a = universe[pair.sym_a];
    const bars_b = universe[pair.sym_b];

    if (!bars_a || !bars_b) continue;

    // Compute spreads over last Z days
    const spreads = [];
    const minLen = Math.min(bars_a.length, bars_b.length);
    const lookback = Math.min(ctx.params.zWindow, minLen);

    for (let k = minLen - lookback; k < minLen; k++) {
      if (k >= 0) {
        const spread = bars_a[k].close - pair.beta * bars_b[k].close;
        spreads.push(spread);
      }
    }

    if (spreads.length < 10) continue;

    // Z-score
    let mean = 0;
    for (let i = 0; i < spreads.length; i++) mean += spreads[i];
    mean /= spreads.length;

    let variance = 0;
    for (let i = 0; i < spreads.length; i++) {
      const diff = spreads[i] - mean;
      variance += diff * diff;
    }
    variance /= spreads.length;

    const std = Math.sqrt(variance);
    if (std === 0) continue;

    const z = (spreads[spreads.length - 1] - mean) / std;

    // Position logic
    let signal = 0;
    if (pair.entryDay === null) {
      // No open position
      if (z < ctx.params.zEntryLong && Math.abs(z) < ctx.params.zStop) {
        signal = 1; // long spread
        pair.entryDay = t;
        pair.entrySign = 1;
      } else if (z > ctx.params.zEntryShort && Math.abs(z) < ctx.params.zStop) {
        signal = -1; // short spread
        pair.entryDay = t;
        pair.entrySign = -1;
      }
    } else {
      // Have open position
      const holdDays = t - pair.entryDay;
      const atZero = Math.abs(z) <= Math.abs(ctx.params.zExit);
      const maxHoldExceeded = holdDays >= ctx.params.maxHold;
      const stopHit = Math.abs(z) > ctx.params.zStop;

      if (atZero || maxHoldExceeded || stopHit) {
        pair.entryDay = null;
        pair.entrySign = 0;
        signal = 0;
      } else {
        signal = pair.entrySign;
      }
    }

    if (signal === 1) {
      // long spread: long A, short beta*B
      weights[pair.sym_a] = (weights[pair.sym_a] || 0) + 0.1;
      weights[pair.sym_b] = (weights[pair.sym_b] || 0) - 0.1 * pair.beta;
    } else if (signal === -1) {
      // short spread: short A, long beta*B
      weights[pair.sym_a] = (weights[pair.sym_a] || 0) - 0.1;
      weights[pair.sym_b] = (weights[pair.sym_b] || 0) + 0.1 * pair.beta;
    }
  }

  // Normalize: scale so that sum of |weights| <= 1
  let grossWeight = 0;
  for (const sym in weights) {
    grossWeight += Math.abs(weights[sym]);
  }

  if (grossWeight > 1) {
    const scale = 1 / grossWeight;
    for (const sym in weights) {
      weights[sym] *= scale;
    }
  }

  return weights;
}
