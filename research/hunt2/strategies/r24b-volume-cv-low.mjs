export const meta = {
  id: "r24b-volume-cv-low",
  name: "Low Volume Coefficient of Variation",
  family: "equity-factors",
  source: "Chordia, Subrahmanyam & Anshuman 2001 (volume variability)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, need: 253, volumeWindow: 252, minNames: 50, minHoldings: 10, fraction: 0.2 },
};

function equalWeights(universe) {
  const symbols = Object.keys(universe);
  const weights = {};
  for (const symbol of symbols) weights[symbol] = 1 / symbols.length;
  return weights;
}

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const scores = [];
  for (const symbol of Object.keys(universe)) {
    const bars = universe[symbol];
    const L = bars.length;
    if (L < p.need) continue;
    const e = L - p.lag;
    let sum = 0;
    let valid = true;
    for (let k = e - p.volumeWindow + 1; k <= e; k++) {
      const volume = bars[k].volume;
      const close = bars[k].close;
      if (!Number.isFinite(volume) || !Number.isFinite(close) || close <= 0) { valid = false; break; }
      sum += volume;
    }
    const mean = sum / p.volumeWindow;
    let squareSum = 0;
    if (valid) {
      for (let k = e - p.volumeWindow + 1; k <= e; k++) {
        const d = bars[k].volume - mean;
        squareSum += d * d;
      }
    }
    const score = Math.sqrt(squareSum / (p.volumeWindow - 1)) / mean;
    if (valid && Number.isFinite(score)) scores.push([symbol, score]);
  }
  if (scores.length < p.minNames) return equalWeights(universe);
  const N = Math.max(p.minHoldings, Math.round(p.fraction * scores.length));
  scores.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const weights = {};
  for (const [symbol] of scores.slice(0, N)) weights[symbol] = 1 / N;
  return weights;
}
