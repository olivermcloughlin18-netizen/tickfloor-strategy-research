export const meta = {
  id: "equity-factors-crypto-cross-sectional-momentum-topn",
  name: "Crypto cross-sectional momentum, top/bottom 2 of dollar-volume universe",
  family: "momentum",
  source: "Jegadeesh-Titman style cross-sectional momentum applied to crypto",
  assetClass: "crypto",
  timeframe: "1d",
  universe: "CRYPTO_DAILY",
  rebalance: "weekly",
  longShort: true,
  params: {
    dollarVolLookbackDays: 30,
    topByDollarVol: 30, // CRYPTO_DAILY only has 18 assets, so this is a no-op filter kept for fidelity
    lookbackDays: 7,
    topN: 2,
    bottomN: 2,
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

  if (scores.length < ctx.params.topN + ctx.params.bottomN) return {};
  scores.sort((a, b) => b.ret - a.ret);

  const top = scores.slice(0, ctx.params.topN);
  const bottom = scores.slice(-ctx.params.bottomN);

  const w = {};
  for (const s of top) w[s.sym] = 0.5 / top.length;
  for (const s of bottom) w[s.sym] = -0.5 / bottom.length;
  return w;
}
