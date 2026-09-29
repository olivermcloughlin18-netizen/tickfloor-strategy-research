export const meta = {
  id: "r24b-amihud-illiquid",
  name: "Amihud Illiquidity",
  family: "equity-factors",
  source: "Amihud 2002",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, need: 254, returnWindow: 252, minValidDays: 200, minNames: 50, minHoldings: 10, fraction: 0.2 },
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
    let count = 0;
    for (let k = e - p.returnWindow + 1; k <= e; k++) {
      const prior = bars[k - 1].close;
      const close = bars[k].close;
      const volume = bars[k].volume;
      if (!Number.isFinite(prior) || !Number.isFinite(close) || !Number.isFinite(volume) || prior <= 0 || close <= 0 || volume <= 0) continue;
      const value = Math.abs(close / prior - 1) / (close * volume);
      if (Number.isFinite(value)) { sum += value; count++; }
    }
    if (count >= p.minValidDays) scores.push([symbol, sum / count]);
  }
  if (scores.length < p.minNames) return equalWeights(universe);
  const N = Math.max(p.minHoldings, Math.round(p.fraction * scores.length));
  scores.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const weights = {};
  for (const [symbol] of scores.slice(0, N)) weights[symbol] = 1 / N;
  return weights;
}
