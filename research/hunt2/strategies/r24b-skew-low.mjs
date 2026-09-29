export const meta = {
  id: "r24b-skew-low",
  name: "Low Realized Skewness",
  family: "volatility",
  source: "Amaya, Christoffersen, Jacobs & Vasquez 2015 (realized skewness)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, need: 62, returnWindow: 60, minNames: 50, minHoldings: 10, fraction: 0.2 },
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
    const returns = [];
    let valid = true;
    for (let k = e - p.returnWindow + 1; k <= e; k++) {
      const prior = bars[k - 1].close;
      const close = bars[k].close;
      if (!Number.isFinite(prior) || !Number.isFinite(close) || prior <= 0 || close <= 0) { valid = false; break; }
      const r = close / prior - 1;
      if (!Number.isFinite(r)) { valid = false; break; }
      returns.push(r);
    }
    if (!valid) continue;
    let mean = 0;
    for (const r of returns) mean += r;
    mean /= returns.length;
    let variance = 0;
    let third = 0;
    for (const r of returns) {
      const d = r - mean;
      variance += d * d;
      third += d * d * d;
    }
    variance /= returns.length;
    third /= returns.length;
    const sd = Math.sqrt(variance);
    const score = third / (sd * sd * sd);
    if (Number.isFinite(score)) scores.push([symbol, score]);
  }
  if (scores.length < p.minNames) return equalWeights(universe);
  const N = Math.max(p.minHoldings, Math.round(p.fraction * scores.length));
  scores.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const weights = {};
  for (const [symbol] of scores.slice(0, N)) weights[symbol] = 1 / N;
  return weights;
}
