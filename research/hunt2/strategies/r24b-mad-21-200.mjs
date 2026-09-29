export const meta = {
  id: "r24b-mad-21-200",
  name: "Moving Average Distance 21 200",
  family: "trend",
  source: "Avramov, Kaplanski & Subrahmanyam 2021 (moving average distance)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lag: 2, need: 202, shortWindow: 21, longWindow: 200, minNames: 50, minHoldings: 10, fraction: 0.2 },
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
    let shortSum = 0;
    let longSum = 0;
    let valid = true;
    for (let k = e - p.longWindow + 1; k <= e; k++) {
      const close = bars[k].close;
      if (!Number.isFinite(close) || close <= 0) { valid = false; break; }
      longSum += close;
      if (k >= e - p.shortWindow + 1) shortSum += close;
    }
    const score = shortSum / p.shortWindow / (longSum / p.longWindow);
    if (valid && Number.isFinite(score)) scores.push([symbol, score]);
  }
  if (scores.length < p.minNames) return equalWeights(universe);
  const N = Math.max(p.minHoldings, Math.round(p.fraction * scores.length));
  scores.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const weights = {};
  for (const [symbol] of scores.slice(0, N)) weights[symbol] = 1 / N;
  return weights;
}
