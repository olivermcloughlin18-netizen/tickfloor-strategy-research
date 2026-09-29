export const meta = {
  id: "r24b-rev-low-turnover__rob1",
  name: "Low Turnover Short Term Reversal (-25%)",
  family: "mean-reversion-statarb",
  source: "Medhat & Schmeling 2022 (short-term reversal and turnover)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, need: 274, returnLookback: 16, recentVolumeWindow: 21, priorVolumeWindow: 252, subsetFraction: 0.3, minNames: 50, minHoldings: 10, fraction: 0.2 },
};

function equalWeights(universe) {
  const symbols = Object.keys(universe);
  const weights = {};
  for (const symbol of symbols) weights[symbol] = 1 / symbols.length;
  return weights;
}

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const values = [];
  for (const symbol of Object.keys(universe)) {
    const bars = universe[symbol];
    const L = bars.length;
    if (L < p.need) continue;
    const e = L - p.lag;
    const prior = bars[e - p.returnLookback].close;
    const close = bars[e].close;
    if (!Number.isFinite(prior) || !Number.isFinite(close) || prior <= 0 || close <= 0) continue;
    let recent = 0;
    let previous = 0;
    let valid = true;
    for (let k = e - p.priorVolumeWindow - p.recentVolumeWindow + 1; k <= e; k++) {
      const volume = bars[k].volume;
      const price = bars[k].close;
      if (!Number.isFinite(volume) || !Number.isFinite(price) || volume <= 0 || price <= 0) { valid = false; break; }
      if (k <= e - p.recentVolumeWindow) previous += volume;
      else recent += volume;
    }
    const turnover = recent / p.recentVolumeWindow / (previous / p.priorVolumeWindow);
    if (valid && Number.isFinite(turnover)) values.push([symbol, close / prior - 1, turnover]);
  }
  if (values.length < p.minNames) return equalWeights(universe);
  const N = Math.max(p.minHoldings, Math.round(p.fraction * values.length));
  const subsetCount = Math.ceil(p.subsetFraction * values.length);
  values.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const subset = values.slice(0, subsetCount);
  subset.sort((a, b) => a[2] - b[2] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const weights = {};
  for (const [symbol] of subset.slice(0, N)) weights[symbol] = 1 / N;
  return weights;
}
