export const meta = {
  id: "r24b-mom-consistent",
  name: "Consistent Momentum",
  family: "momentum",
  source: "Grinblatt & Moskowitz 2004 (consistent winners)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, blocks: 11, blockLength: 21, formationWindow: 252 },
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
    let count = 0;
    for (let j = 1; j <= ctx.params.blocks; j++) {
      const end = bars[e - ctx.params.blockLength * j].close;
      const start = bars[e - ctx.params.blockLength * (j + 1)].close;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) {
        valid = false;
        break;
      }
      if (end / start - 1 > 0) count++;
    }
    if (!valid) continue;
    const start = bars[e - ctx.params.formationWindow].close;
    const end = bars[e - ctx.params.blockLength].close;
    const momentum = end / start - 1;
    if (!Number.isFinite(momentum)) continue;
    scores.push({ sym, count, momentum });
  }
  if (scores.length < 50) return equalWeight(universe);
  const n = Math.max(10, Math.round(0.2 * scores.length));
  scores.sort((a, b) => b.count - a.count || b.momentum - a.momentum || a.sym.localeCompare(b.sym));
  const weights = {};
  for (const item of scores.slice(0, n)) weights[item.sym] = 1 / n;
  return weights;
}
