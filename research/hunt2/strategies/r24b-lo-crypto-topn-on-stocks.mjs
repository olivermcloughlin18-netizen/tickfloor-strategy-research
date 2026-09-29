// Mechanical long-only rewrite of wide-equity-factors-crypto-cross-sectional-momentum-topn.mjs (r24b batch, item B).
export const meta = {
  id: "r24b-lo-crypto-topn-on-stocks",
  name: "Crypto-style top-N cross-sectional momentum, long-only (wide US stocks)",
  family: "momentum",
  source: "Jegadeesh-Titman style cross-sectional momentum applied to crypto; long-only rewrite of wide-equity-factors-crypto-cross-sectional-momentum-topn",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  params: {
    dollarVolLookbackDays: 30,
    topByDollarVol: 30,
    lookbackDays: 7,
    topN: 2,
  },
};

export function rank(universe, t, ctx) {
  const dvLb = ctx.params.dollarVolLookbackDays;
  const lb = ctx.params.lookbackDays;

  const candidates = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < Math.max(dvLb, lb) + 1) continue;
    let dollarVol = 0;
    for (let k = b.length - dvLb; k < b.length; k++) {
      dollarVol += b[k].close * b[k].volume;
    }
    candidates.push({ sym, dollarVol, bars: b });
  }

  candidates.sort((a, b) => b.dollarVol - a.dollarVol);
  const universeTop = candidates.slice(0, ctx.params.topByDollarVol);

  const scores = [];
  for (const c of universeTop) {
    const b = c.bars;
    const priceNow = b[b.length - 1].close;
    const priceLbAgo = b[b.length - 1 - lb].close;
    if (priceNow <= 0 || priceLbAgo <= 0) continue;
    scores.push({ sym: c.sym, ret: priceNow / priceLbAgo - 1 });
  }

  if (scores.length < ctx.params.topN) return {};
  scores.sort((a, b) => b.ret - a.ret);

  const top = scores.slice(0, ctx.params.topN);

  const w = {};
  for (const s of top) w[s.sym] = 1 / top.length;
  return w;
}
