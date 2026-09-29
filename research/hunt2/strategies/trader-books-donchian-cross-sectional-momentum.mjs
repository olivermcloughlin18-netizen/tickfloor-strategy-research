export const meta = {
  id: "trader-books-donchian-cross-sectional-momentum",
  name: "Donchian cross-sectional momentum (top/bottom 2, 30d reb)",
  family: "momentum",
  source: "Donchian-style trend-following adapted cross-sectionally",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "monthly", // ~30 calendar days; the harness's monthly rebalance is the closest fit
  longShort: true,
  params: {
    lookbackDays: 7,
    topN: 2,
    bottomN: 2,
  },
};

export function rank(universe, t, ctx) {
  const lb = ctx.params.lookbackDays;
  const scores = [];

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < lb + 1) continue;
    const priceNow = b[b.length - 1].close;
    const priceLbAgo = b[b.length - 1 - lb].close;
    if (priceNow <= 0 || priceLbAgo <= 0) continue;
    scores.push({ sym, ret: priceNow / priceLbAgo - 1 });
  }

  if (scores.length < ctx.params.topN + ctx.params.bottomN) return {};
  scores.sort((a, b) => b.ret - a.ret);

  const top = scores.slice(0, ctx.params.topN);
  const bottom = scores.slice(-ctx.params.bottomN);

  const w = {};
  for (const s of top) w[s.sym] = 0.5 / top.length;
  for (const s of bottom) w[s.sym] = -0.5 / bottom.length;
  return w;
}
