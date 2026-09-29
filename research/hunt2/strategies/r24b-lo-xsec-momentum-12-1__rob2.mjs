// Mechanical long-only rewrite of wide-equity-factors-xsec-momentum-12-1.mjs (r24b batch, item B).
export const meta = {
  id: "r24b-lo-xsec-momentum-12-1__rob2",
  name: "Cross-sectional 12-1 month momentum, long-only (wide US stocks) (+25%)",
  family: "equity-factors",
  source: "Jegadeesh & Titman 1993 classic momentum factor; long-only rewrite of wide-equity-factors-xsec-momentum-12-1",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: {
    lookback: 315,
    skip: 21,
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

  const w = {};
  for (const s of top) w[s.sym] = 1 / top.length;
  return w;
}
