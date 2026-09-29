export const meta = {
  id: "wide-equity-factors-52-week-high",
  name: "Nearness to 52-week high (wide US stocks)",
  family: "equity-factors",
  source: "George & Hwang 2004 52-week high momentum",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  longShort: true,
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
  const bottom = scores.slice(-n);

  const w = {};
  for (const s of top) w[s.sym] = 0.5 / top.length;
  for (const s of bottom) w[s.sym] = -0.5 / bottom.length;
  return w;
}
