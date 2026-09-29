export const meta = {
  id: "equity-factors-xsec-momentum-12-1",
  name: "Cross-sectional 12-1 month momentum",
  family: "equity-factors",
  source: "Jegadeesh & Titman 1993 classic momentum factor",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_DAILY",
  rebalance: "monthly",
  longShort: true,
  params: {
    lookback: 252,   // ~12 months
    skip: 21,        // skip most recent month
    decile: 0.1,
  },
};

export function rank(universe, t, ctx) {
  const lookback = ctx.params.lookback;
  const skip = ctx.params.skip;
  const scores = [];

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < lookback + 1) continue;
    const pNow = b[b.length - 1 - skip].close;
    const pThen = b[b.length - 1 - lookback].close;
    if (pNow <= 0 || pThen <= 0) continue;
    scores.push({ sym, ret: pNow / pThen - 1 });
  }

  if (scores.length < 10) return {};
  scores.sort((a, b) => b.ret - a.ret);
  const n = Math.max(1, Math.floor(scores.length * ctx.params.decile));
  const top = scores.slice(0, n);
  const bottom = scores.slice(-n);

  const w = {};
  for (const s of top) w[s.sym] = 0.5 / top.length;
  for (const s of bottom) w[s.sym] = -0.5 / bottom.length;
  return w;
}
