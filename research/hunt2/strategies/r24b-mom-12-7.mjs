export const meta = {
  id: "r24b-mom-12-7",
  name: "12-7 Momentum",
  family: "momentum",
  source: "Novy-Marx 2012 (momentum in intermediate past)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, formationWindow: 252, endpoint: 147 },
};

function equalWeight(universe) {
  const symbols = Object.keys(universe);
  if (!symbols.length) return {};
  const weights = {};
  for (const sym of symbols) weights[sym] = 1 / symbols.length;
  return weights;
}

export function rank(universe, t, ctx) {
  const scores = [];
  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    const L = bars.length;
    if (L < ctx.params.need) continue;
    const e = L - ctx.params.lag;
    const start = bars[e - ctx.params.formationWindow].close;
    const end = bars[e - ctx.params.endpoint].close;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) continue;
    const score = end / start - 1;
    if (Number.isFinite(score)) scores.push({ sym, score });
  }
  if (scores.length < 50) return equalWeight(universe);
  const n = Math.max(10, Math.round(0.2 * scores.length));
  scores.sort((a, b) => b.score - a.score || a.sym.localeCompare(b.sym));
  const weights = {};
  for (const item of scores.slice(0, n)) weights[item.sym] = 1 / n;
  return weights;
}
