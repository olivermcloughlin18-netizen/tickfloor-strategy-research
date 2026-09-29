export const meta = {
  id: "r24b-stmom-high-turnover",
  name: "Short-Term Momentum High Turnover",
  family: "momentum",
  source: "Medhat & Schmeling 2022",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 274, lag: 2, shortWindow: 21, longStart: 272, prefilter: 0.3 },
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
    const month = bars[e - ctx.params.shortWindow].close;
    const end = bars[e].close;
    if (!Number.isFinite(month) || !Number.isFinite(end) || month <= 0 || end <= 0) continue;
    let valid = true;
    let longTotal = 0;
    let shortTotal = 0;
    for (let k = e - ctx.params.longStart; k <= e; k++) {
      const volume = bars[k].volume;
      if (!Number.isFinite(volume)) {
        valid = false;
        break;
      }
      if (k <= e - ctx.params.shortWindow) longTotal += volume;
      else shortTotal += volume;
    }
    if (!valid) continue;
    const turnover = (shortTotal / ctx.params.shortWindow) / (longTotal / (ctx.params.longStart - ctx.params.shortWindow + 1));
    const momentum = end / month - 1;
    if (Number.isFinite(momentum) && Number.isFinite(turnover)) scores.push({ sym, momentum, turnover });
  }
  if (scores.length < 50) return equalWeight(universe);
  const n = Math.max(10, Math.round(0.2 * scores.length));
  const prefilter = Math.ceil(ctx.params.prefilter * scores.length);
  scores.sort((a, b) => b.momentum - a.momentum || a.sym.localeCompare(b.sym));
  const selected = scores.slice(0, prefilter);
  selected.sort((a, b) => b.turnover - a.turnover || a.sym.localeCompare(b.sym));
  const weights = {};
  for (const item of selected.slice(0, n)) weights[item.sym] = 1 / n;
  return weights;
}
