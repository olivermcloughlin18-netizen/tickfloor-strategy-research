// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "wide-mlq-pca-stat-arb-crypto",
  name: "PCA-based statistical arbitrage across crypto majors (wide US stocks)",
  family: "ml-quant-modern",
  source: "Avellaneda & Lee (2010) Quantitative Finance",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "daily",
  longShort: true,
  params: {
    pcaWindow: 60,
    zscoreWindow: 20,
    zLongThresh: -2,
    zShortThresh: 2,
    nComponents: 3,
  },
};

// Helper: compute mean of array
function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Helper: compute std of array
function std(arr) {
  if (arr.length === 0) return 0;
  const m = mean(arr);
  const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
  return Math.sqrt(v);
}

// Helper: get largest eigenvector via power iteration
function powerIterationEigenvector(cov, iterations = 30) {
  const n = cov.length;
  let v = Array(n).fill(0);
  v[0] = 1;

  // Pseudo-random perturbation from covariance structure
  for (let i = 0; i < Math.min(3, n); i++) {
    v[i] += 0.1 * Math.sin(i + 2.7);
  }

  // Normalize
  let norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0));
  v = v.map(x => x / norm);

  for (let iter = 0; iter < iterations; iter++) {
    const u = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        u[i] += cov[i][j] * v[j];
      }
    }
    norm = Math.sqrt(u.reduce((a, b) => a + b * b, 0));
    if (norm < 1e-10) break;
    v = u.map(x => x / norm);
  }
  return v;
}

// PORTFOLIO strategies (cross-sectional): delete signal() above and export rank() instead.
// Add to meta: universe: "US_STOCKS_DAILY" (or CRYPTO_DAILY / ETFS_DAILY), rebalance: "monthly" (or weekly / daily).
// universe[SYMBOL] = bars up to and including date t, for every asset that traded on t.
// Return weights {SYMBOL: weight}; weights >= 0 unless longShort, sum of |weights| <= 1, missing = 0.

export function rank(universe, t, ctx) {
  const assets = Object.keys(universe).filter(sym => universe[sym].length > 0);
  const minLen = ctx.params.pcaWindow + ctx.params.zscoreWindow;
  const validAssets = assets.filter(sym => universe[sym].length >= minLen);

  if (validAssets.length < 3) return {};

  // Get returns for the last pcaWindow bars
  const returns = [];
  for (const sym of validAssets) {
    const bars = universe[sym].slice(-ctx.params.pcaWindow);
    const ret = [];
    for (let i = 1; i < bars.length; i++) {
      ret.push(Math.log(bars[i].close / bars[i-1].close));
    }
    returns.push({ sym, ret });
  }

  // Standardize returns
  const standardized = [];
  for (const { sym, ret } of returns) {
    const m = mean(ret);
    const s = std(ret);
    const sret = s > 1e-8 ? ret.map(r => (r - m) / s) : ret.map(() => 0);
    standardized.push({ sym, sret });
  }

  // Build matrix (assets x time)
  const nAssets = standardized.length;
  const nBars = standardized[0].sret.length;
  const matrix = standardized.map(x => x.sret);

  // Compute covariance matrix
  const cov = Array(nAssets).fill(0).map(() => Array(nAssets).fill(0));
  for (let i = 0; i < nAssets; i++) {
    for (let j = i; j < nAssets; j++) {
      let c = 0;
      for (let k = 0; k < nBars; k++) {
        c += matrix[i][k] * matrix[j][k];
      }
      cov[i][j] = cov[j][i] = c / nBars;
    }
  }

  // Get first 3 eigenvectors
  const eigenvectors = [];
  let covCopy = cov.map(row => [...row]);

  for (let comp = 0; comp < Math.min(ctx.params.nComponents, nAssets); comp++) {
    const ev = powerIterationEigenvector(covCopy);
    eigenvectors.push(ev);

    // Deflate: remove this component's contribution
    for (let i = 0; i < nAssets; i++) {
      for (let j = 0; j < nAssets; j++) {
        covCopy[i][j] -= ev[i] * ev[j];
      }
    }
  }

  // Project returns onto eigenvectors and reconstruct
  const reconstructed = Array(nAssets).fill(0).map(() => Array(nBars).fill(0));

  for (let bar = 0; bar < nBars; bar++) {
    for (let comp = 0; comp < eigenvectors.length; comp++) {
      const ev = eigenvectors[comp];
      let projection = 0;
      for (let asset = 0; asset < nAssets; asset++) {
        projection += matrix[asset][bar] * ev[asset];
      }
      for (let asset = 0; asset < nAssets; asset++) {
        reconstructed[asset][bar] += projection * ev[asset];
      }
    }
  }

  // Compute residuals (idiosyncratic returns)
  const residuals = [];
  for (let asset = 0; asset < nAssets; asset++) {
    const res = [];
    for (let bar = 0; bar < nBars; bar++) {
      res.push(matrix[asset][bar] - reconstructed[asset][bar]);
    }
    residuals.push({ sym: standardized[asset].sym, res });
  }

  // Z-score residuals over last zscoreWindow bars
  const scores = [];
  for (const { sym, res } of residuals) {
    const recent = res.slice(-ctx.params.zscoreWindow);
    const m = mean(recent);
    const s = std(recent);
    const currentRes = res[res.length - 1];
    const z = s > 1e-8 ? (currentRes - m) / s : 0;
    scores.push({ sym, z });
  }

  // Allocate: long z < -2, short z > 2
  // (mean-reversion: buy underperformers, sell overperformers)
  const longAssets = scores.filter(x => x.z < ctx.params.zLongThresh);
  const shortAssets = scores.filter(x => x.z > ctx.params.zShortThresh);

  const weights = {};

  if (longAssets.length > 0) {
    const w = 0.5 / longAssets.length;
    for (const { sym } of longAssets) weights[sym] = w;
  }

  if (shortAssets.length > 0) {
    const w = -0.5 / shortAssets.length;
    for (const { sym } of shortAssets) weights[sym] = w;
  }

  return weights;
}
