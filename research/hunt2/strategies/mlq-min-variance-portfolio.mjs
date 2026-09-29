// Minimum-variance portfolio with Ledoit-Wolf shrinkage, weekly rebalance

export const meta = {
  id: "mlq-min-variance-portfolio",
  name: "Minimum-variance long-only portfolio, rolling covariance",
  family: "ml-quant-modern",
  source: "Clarke, de Silva, Thorley (2006) Journal of Portfolio Management",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_DAILY",
  rebalance: "weekly",
  params: { covWindow: 60, shrinkage: 0.5 },
};

// Matrix inverse using Gaussian elimination
function matrixInverse(m) {
  const n = m.length;
  if (n === 0) return null;

  // Create augmented matrix [m | I]
  const aug = [];
  for (let i = 0; i < n; i++) {
    aug[i] = [];
    for (let j = 0; j < n; j++) {
      aug[i][j] = m[i][j];
    }
    for (let j = 0; j < n; j++) {
      aug[i][n + j] = i === j ? 1 : 0;
    }
  }

  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivotRow][col])) {
        pivotRow = row;
      }
    }

    if (Math.abs(aug[pivotRow][col]) < 1e-10) return null;

    // Swap rows
    [aug[col], aug[pivotRow]] = [aug[pivotRow], aug[col]];

    // Scale pivot row
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = aug[row][col];
        for (let j = 0; j < 2 * n; j++) {
          aug[row][j] -= factor * aug[col][j];
        }
      }
    }
  }

  // Extract inverse
  const inv = [];
  for (let i = 0; i < n; i++) {
    inv[i] = [];
    for (let j = 0; j < n; j++) {
      inv[i][j] = aug[i][n + j];
    }
  }
  return inv;
}

// Vector dot product
function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

export function rank(universe, t, ctx) {
  const symbols = Object.keys(universe).sort();
  const covWindow = ctx.params.covWindow;
  const shrinkAlpha = ctx.params.shrinkage;

  // Get bars for each symbol, calculate returns
  const assetReturns = [];
  const validSyms = [];

  for (const sym of symbols) {
    const bars = universe[sym];
    if (bars.length < covWindow + 1) continue;

    const returns = [];
    const start = Math.max(0, bars.length - covWindow);
    for (let i = start; i < bars.length - 1; i++) {
      if (bars[i].close > 0 && bars[i + 1].close > 0) {
        returns.push(Math.log(bars[i + 1].close / bars[i].close));
      }
    }

    if (returns.length >= covWindow * 0.8) {
      assetReturns.push(returns);
      validSyms.push(sym);
    }
  }

  if (validSyms.length < 2) {
    // Not enough assets, equal weight
    const w = {};
    for (const sym of validSyms) {
      w[sym] = 1 / validSyms.length;
    }
    return w;
  }

  // Calculate sample covariance
  const n = validSyms.length;
  const m = assetReturns[0].length;

  // Mean returns
  const means = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < m; j++) {
      sum += assetReturns[i][j];
    }
    means.push(sum / m);
  }

  // Covariance matrix (sample cov)
  const cov = [];
  for (let i = 0; i < n; i++) {
    cov[i] = [];
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < m; k++) {
        sum += (assetReturns[i][k] - means[i]) * (assetReturns[j][k] - means[j]);
      }
      cov[i][j] = sum / (m - 1);
    }
  }

  // Ledoit-Wolf shrinkage: Σ_shrink = (1 - α) * Σ_sample + α * tr(Σ_sample)/n * I
  const trace = cov.reduce((sum, row, i) => sum + row[i], 0);
  const targetVar = trace / n;

  const covShrunk = [];
  for (let i = 0; i < n; i++) {
    covShrunk[i] = [];
    for (let j = 0; j < n; j++) {
      const target = i === j ? targetVar : 0;
      covShrunk[i][j] = (1 - shrinkAlpha) * cov[i][j] + shrinkAlpha * target;
    }
  }

  // Invert covariance matrix
  const covInv = matrixInverse(covShrunk);
  if (!covInv) {
    // Singular matrix, fall back to equal weight
    const w = {};
    for (const sym of validSyms) {
      w[sym] = 1 / validSyms.length;
    }
    return w;
  }

  // Ones vector
  const ones = new Array(n).fill(1);

  // Calculate inv * ones
  const invOnes = [];
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += covInv[i][j];
    }
    invOnes[i] = sum;
  }

  // Normalizer: ones' * inv * ones
  const norm = dot(ones, invOnes);

  if (norm < 1e-10) {
    // Degenerate case, equal weight
    const w = {};
    for (const sym of validSyms) {
      w[sym] = 1 / validSyms.length;
    }
    return w;
  }

  // Weights: (inv * ones) / norm
  const weights = {};
  let totalWeight = 0;
  for (let i = 0; i < n; i++) {
    const wt = invOnes[i] / norm;
    if (wt > 1e-8) {
      weights[validSyms[i]] = wt;
      totalWeight += wt;
    }
  }

  // Normalize to ensure weights sum to 1 (accounting for numerical errors)
  if (totalWeight > 1e-10) {
    for (const sym in weights) {
      weights[sym] /= totalWeight;
    }
  }

  return weights;
}
