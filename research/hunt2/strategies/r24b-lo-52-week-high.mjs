// Mechanical long-only rewrite of wide-equity-factors-52-week-high.mjs (r24b batch, item B).
// rank() copied verbatim except: longShort deleted, short leg dropped, long leg re-weighted to 1/n.
export const meta = {
  id: "r24b-lo-52-week-high",
  name: "Nearness to 52-week high, long-only (wide US stocks)",
  family: "equity-factors",
  source: "George & Hwang 2004 52-week high momentum; long-only rewrite of wide-equity-factors-52-week-high",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: {
    lookback: 252,
    decile: 0.1,
  },
};

export function rank(universe, t, ctx) {
  const lookback = ctx.params.lookback;
  const scores = [];

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < lookback) continue;
    const pNow = b[b.length - 1].close;
    let high = -Infinity;
    for (let k = b.length - lookback; k < b.length; k++) {
      if (b[k].high > high) high = b[k].high;
    }
    if (pNow <= 0 || high <= 0) continue;
    scores.push({ sym, ratio: pNow / high });
  }

  if (scores.length < 10) return {};
  scores.sort((a, b) => b.ratio - a.ratio); // descending: nearest to high first
  const n = Math.max(1, Math.floor(scores.length * ctx.params.decile));
  const top = scores.slice(0, n);

  const w = {};
  for (const s of top) w[s.sym] = 1 / top.length;
  return w;
}
