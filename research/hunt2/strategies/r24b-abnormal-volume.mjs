export const meta = {
  id: "r24b-abnormal-volume",
  name: "Abnormal Volume",
  family: "event-driven",
  source: "Gervais, Kaniel & Mingelgrin 2001 (high-volume return premium)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  params: { lag: 2, need: 56, recentVolumeWindow: 5, priorVolumeWindow: 50, minNames: 50, minHoldings: 10, fraction: 0.2 },
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
    let recent = 0;
    let previous = 0;
    let valid = true;
    for (let k = e - p.priorVolumeWindow - p.recentVolumeWindow + 1; k <= e; k++) {
      const volume = bars[k].volume;
      const close = bars[k].close;
      if (!Number.isFinite(volume) || !Number.isFinite(close) || close <= 0) { valid = false; break; }
      if (k <= e - p.recentVolumeWindow) previous += volume;
      else recent += volume;
    }
    const score = recent / p.recentVolumeWindow / (previous / p.priorVolumeWindow);
    if (valid && Number.isFinite(score)) scores.push([symbol, score]);
  }
  if (scores.length < p.minNames) return equalWeights(universe);
  const N = Math.max(p.minHoldings, Math.round(p.fraction * scores.length));
  scores.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const weights = {};
  for (const [symbol] of scores.slice(0, N)) weights[symbol] = 1 / N;
  return weights;
}
