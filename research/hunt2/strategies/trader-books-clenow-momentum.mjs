// Copy to research/hunt2/strategies/<id>.mjs (filename MUST equal meta.id).
// Rules the harness enforces: no imports, no randomness, no clock, no network.
// Write plain arithmetic over `bars` only.

export const meta = {
  id: "trader-books-clenow-momentum",
  name: "Clenow 100-day momentum + volatility parity rebalance",
  family: "momentum",
  source: "Andreas Clenow, 'Stocks on the Move' (2015)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_DAILY",
  rebalance: "weekly",
  params: {
    momentumWindow: 100,
    smaWindow: 100,
    atrWindow: 20,
    gapThreshold: 0.15,
    gapWindow: 90,
    decileRank: 10,
    targetDailyRisk: 0.001
  }
};

function sma(bars, i, window) {
  if (i + 1 < window) return null;
  let sum = 0;
  for (let k = i - window + 1; k <= i; k++) sum += bars[k].close;
  return sum / window;
}

function atr(bars, i, window) {
  if (i + 1 < window) return null;
  let sumTR = 0;
  for (let k = i - window + 1; k <= i; k++) {
    const high = bars[k].high;
    const low = bars[k].low;
    const prevClose = k > 0 ? bars[k - 1].close : bars[k].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    sumTR += tr;
  }
  return sumTR / window;
}

function hasExcessiveGap(bars, i, gapWindow, gapThreshold) {
  const start = Math.max(0, i - gapWindow + 1);
  for (let k = start + 1; k <= i; k++) {
    const gap = Math.abs((bars[k].close - bars[k - 1].close) / bars[k - 1].close);
    if (gap > gapThreshold) return true;
  }
  return false;
}

function linearRegression(bars, i, window) {
  if (i + 1 < window) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  const n = window;

  for (let k = i - window + 1; k <= i; k++) {
    const x = k - (i - window + 1);
    const y = Math.log(bars[k].close);
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Calculate R²
  const ssRes = n * sumY2 - sumY * sumY - slope * slope * (n * sumX2 - sumX * sumX);
  const ssTot = n * sumY2 - sumY * sumY;
  const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

  return { slope, r2 };
}

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const scores = [];

  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];

    // Need enough history
    if (bars.length < p.momentumWindow + p.gapWindow) continue;

    // Filter: price > 100d SMA
    const smaVal = sma(bars, bars.length - 1, p.smaWindow);
    if (smaVal === null || bars[bars.length - 1].close <= smaVal) continue;

    // Filter: no gap > 15% in last 90 days
    if (hasExcessiveGap(bars, bars.length - 1, p.gapWindow, p.gapThreshold)) continue;

    // Rank: slope × R²
    const regr = linearRegression(bars, bars.length - 1, p.momentumWindow);
    if (regr === null) continue;

    const score = regr.slope * regr.r2;
    scores.push([sym, score]);
  }

  if (scores.length === 0) return {};

  // Sort by score descending
  scores.sort((a, b) => b[1] - a[1]);

  // Take top decile (top 10%)
  const topCount = Math.max(1, Math.ceil(scores.length / p.decileRank));
  const topAssets = scores.slice(0, topCount);

  // Calculate weights based on ATR (inverse position sizing for risk parity)
  const weights = {};
  let totalInvAtr = 0;
  const atrValues = {};

  for (const [sym, _] of topAssets) {
    const bars = universe[sym];
    const atrVal = atr(bars, bars.length - 1, p.atrWindow);
    if (atrVal === null || atrVal === 0) continue;

    const invAtr = 1 / atrVal;
    atrValues[sym] = invAtr;
    totalInvAtr += invAtr;
  }

  if (totalInvAtr === 0) return {};

  // Normalize to target risk
  for (const sym of Object.keys(atrValues)) {
    weights[sym] = (atrValues[sym] / totalInvAtr) * Math.min(1, p.targetDailyRisk * topAssets.length);
  }

  return weights;
}
