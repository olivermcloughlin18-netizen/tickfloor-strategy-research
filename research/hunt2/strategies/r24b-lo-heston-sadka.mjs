// Mechanical long-only rewrite of wide-equity-factors-heston-sadka-seasonality.mjs (r24b batch, item B).
export const meta = {
  id: "r24b-lo-heston-sadka",
  name: "Same-calendar-month return seasonality, long-only (wide US stocks)",
  family: "equity-factors",
  source: "Heston & Sadka 2008 return seasonality; long-only rewrite of wide-equity-factors-heston-sadka-seasonality",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: {
    yearsLookback: 5,
    decile: 0.1,
  },
};

const M = 21;

export function rank(universe, t, ctx) {
  const years = ctx.params.yearsLookback;
  const monthsNeeded = years * 12;
  const scores = [];

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    const totalBarsNeeded = monthsNeeded * M + M;
    if (b.length < totalBarsNeeded) continue;

    let sum = 0, n = 0;
    for (let y = 1; y <= years; y++) {
      const endIdx = b.length - 1 - y * 12 * M;
      const startIdx = endIdx - M;
      if (startIdx < 0) continue;
      const r = b[endIdx].close / b[startIdx].close - 1;
      sum += r; n++;
    }
    if (n < 3) continue;
    scores.push({ sym, avgRet: sum / n });
  }

  if (scores.length < 10) return {};
  scores.sort((a, b) => b.avgRet - a.avgRet);
  const n = Math.max(1, Math.floor(scores.length * ctx.params.decile));
  const top = scores.slice(0, n);

  const w = {};
  for (const s of top) w[s.sym] = 1 / top.length;
  return w;
}
