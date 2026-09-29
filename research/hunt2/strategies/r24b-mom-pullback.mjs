export const meta = {
  id: "r24b-mom-pullback",
  name: "Momentum Pullback",
  family: "momentum",
  source: "Jegadeesh & Titman 1993 plus Jegadeesh 1990 short-term reversal",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, formationWindow: 252, skip: 21, prefilter: 0.4 },
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
    const month = bars[e - ctx.params.skip].close;
    const end = bars[e].close;
    if (!Number.isFinite(start) || !Number.isFinite(month) || !Number.isFinite(end) || start <= 0 || month <= 0 || end <= 0) continue;
    const momentum = month / start - 1;
    const pullback = end / month - 1;
    if (Number.isFinite(momentum) && Number.isFinite(pullback)) scores.push({ sym, momentum, pullback });
  }
  if (scores.length < 50) return equalWeight(universe);
  const n = Math.max(10, Math.round(0.2 * scores.length));
  const prefilter = Math.ceil(ctx.params.prefilter * scores.length);
  scores.sort((a, b) => b.momentum - a.momentum || a.sym.localeCompare(b.sym));
  const selected = scores.slice(0, prefilter);
  selected.sort((a, b) => a.pullback - b.pullback || a.sym.localeCompare(b.sym));
  const weights = {};
  for (const item of selected.slice(0, n)) weights[item.sym] = 1 / n;
  return weights;
}
