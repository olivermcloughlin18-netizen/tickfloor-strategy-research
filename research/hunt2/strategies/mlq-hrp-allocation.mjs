export const meta = {
  id: "mlq-hrp-allocation",
  name: "Hierarchical Risk Parity (Lopez de Prado) allocation",
  family: "ml-quant-modern",
  source: "Lopez de Prado (2016) JPM 68-79",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_DAILY",
  rebalance: "monthly",
  params: { lookback: 252 },
};

export function rank(universe, t, ctx) {
  const symbols = Object.keys(universe);
  const lookback = ctx.params.lookback;

  // Collect returns for all assets
  const returns = {};
  for (const sym of symbols) {
    const bars = universe[sym];
    if (bars.length < lookback + 1) continue;

    const ret = [];
    for (let i = bars.length - lookback; i < bars.length; i++) {
      ret.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
    }
    returns[sym] = ret;
  }

  const activeSyms = Object.keys(returns);
  if (activeSyms.length < 2) return {};

  // Compute correlation matrix
  const corr = computeCorrelation(returns, activeSyms);

  // Distance matrix: sqrt(2 * (1 - correlation))
  const n = activeSyms.length;
  const dist = [];
  for (let i = 0; i < n; i++) {
    dist[i] = [];
    for (let j = 0; j < n; j++) {
      dist[i][j] = i === j ? 0 : Math.sqrt(Math.max(0, 2 * (1 - corr[i][j])));
    }
  }

  // Single-linkage hierarchical clustering
  const order = hierarchicalClustering(dist, n);

  // Quasi-diagonalize the correlation matrix by reordering
  const reordCorr = [];
  for (let i = 0; i < n; i++) {
    reordCorr[i] = [];
    for (let j = 0; j < n; j++) {
      reordCorr[i][j] = corr[order[i]][order[j]];
    }
  }

  // Compute variance for each asset
  const variances = {};
  for (const sym of activeSyms) {
    const ret = returns[sym];
    const mean = ret.reduce((a, b) => a + b, 0) / ret.length;
    const v = ret.reduce((s, r) => s + (r - mean) ** 2, 0) / ret.length;
    variances[sym] = Math.sqrt(v);
  }

  // Recursive bisection allocation
  const reordSyms = order.map(i => activeSyms[i]);
  const weights = recursiveBisection(reordSyms, 0, n - 1, variances, activeSyms);

  // Normalize
  let sum = 0;
  for (const sym of activeSyms) {
    if (weights[sym]) sum += weights[sym];
  }

  const result = {};
  if (sum > 0) {
    for (const sym of activeSyms) {
      if (weights[sym]) result[sym] = weights[sym] / sum;
    }
  }

  return result;
}

function computeCorrelation(returns, symbols) {
  const n = symbols.length;
  const corr = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        corr[i][j] = 1;
      } else {
        const ri = returns[symbols[i]];
        const rj = returns[symbols[j]];
        const mi = ri.reduce((a, b) => a + b, 0) / ri.length;
        const mj = rj.reduce((a, b) => a + b, 0) / rj.length;

        let cov = 0;
        for (let k = 0; k < ri.length; k++) {
          cov += (ri[k] - mi) * (rj[k] - mj);
        }
        cov /= ri.length;

        let si = 0, sj = 0;
        for (let k = 0; k < ri.length; k++) {
          si += (ri[k] - mi) ** 2;
          sj += (rj[k] - mj) ** 2;
        }
        si = Math.sqrt(si / ri.length);
        sj = Math.sqrt(sj / rj.length);

        corr[i][j] = si * sj > 1e-10 ? cov / (si * sj) : 0;
      }
    }
  }

  return corr;
}

function hierarchicalClustering(dist, n) {
  // Single-linkage clustering: return reordered indices
  // Simple greedy approach: each row forms a cluster, merge by minimum distance
  const order = [];
  const used = Array(n).fill(false);

  // Start with asset 0
  order.push(0);
  used[0] = true;

  // Greedily add nearest unused asset
  while (order.length < n) {
    let minD = Infinity;
    let nextIdx = -1;

    for (let i = 0; i < n; i++) {
      if (used[i]) continue;

      // Distance to closest already-ordered asset
      let d = Infinity;
      for (const oi of order) {
        d = Math.min(d, dist[oi][i]);
      }

      if (d < minD) {
        minD = d;
        nextIdx = i;
      }
    }

    order.push(nextIdx);
    used[nextIdx] = true;
  }

  return order;
}

function recursiveBisection(symbols, start, end, variances, allSyms) {
  const weights = {};

  if (start === end) {
    const sym = symbols[start];
    weights[sym] = 1 / variances[sym];
  } else {
    const mid = Math.floor((start + end) / 2);

    const leftWeights = recursiveBisection(symbols, start, mid, variances, allSyms);
    const rightWeights = recursiveBisection(symbols, mid + 1, end, variances, allSyms);

    // Sum inverse variance in each branch
    let leftInvVar = 0, rightInvVar = 0;
    for (const sym of symbols.slice(start, mid + 1)) {
      leftInvVar += 1 / variances[sym];
    }
    for (const sym of symbols.slice(mid + 1, end + 1)) {
      rightInvVar += 1 / variances[sym];
    }

    const leftAlloc = rightInvVar / (leftInvVar + rightInvVar);
    const rightAlloc = leftInvVar / (leftInvVar + rightInvVar);

    for (const sym in leftWeights) {
      weights[sym] = leftWeights[sym] * leftAlloc;
    }
    for (const sym in rightWeights) {
      weights[sym] = rightWeights[sym] * rightAlloc;
    }
  }

  return weights;
}
