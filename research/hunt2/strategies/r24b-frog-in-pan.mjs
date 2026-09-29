export const meta = {
  id: "r24b-frog-in-pan",
  name: "Frog in Pan",
  family: "momentum",
  source: "Da, Gurun & Warachka 2014",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, formationWindow: 252, skip: 21, prefilter: 0.3 },
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
    let valid = true;
    let negative = 0;
    let positive = 0;
    for (let k = e - ctx.params.formationWindow + 1; k <= e - ctx.params.skip; k++) {
      const previous = bars[k - 1].close;
      const close = bars[k].close;
      if (!Number.isFinite(previous) || !Number.isFinite(close) || previous <= 0 || close <= 0) {
        valid = false;
        break;
      }
      const change = close / previous - 1;
      if (change < 0) negative++;
      if (change > 0) positive++;
    }
    if (!valid) continue;
    const start = bars[e - ctx.params.formationWindow].close;
    const end = bars[e - ctx.params.skip].close;
    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) continue;
    const pret = end / start - 1;
    if (!Number.isFinite(pret)) continue;
    const direction = pret > 0 ? 1 : pret < 0 ? -1 : 0;
    const id = direction * (negative - positive) / (ctx.params.formationWindow - ctx.params.skip);
    scores.push({ sym, pret, id });
  }
  if (scores.length < 50) return equalWeight(universe);
  const n = Math.max(10, Math.round(0.2 * scores.length));
  const prefilter = Math.ceil(ctx.params.prefilter * scores.length);
  scores.sort((a, b) => b.pret - a.pret || a.sym.localeCompare(b.sym));
  const selected = scores.slice(0, prefilter);
  selected.sort((a, b) => a.id - b.id || a.sym.localeCompare(b.sym));
  const weights = {};
  for (const item of selected.slice(0, n)) weights[item.sym] = 1 / n;
  return weights;
}
