export const meta = {
  id: "equity-factors-heston-sadka-seasonality",
  name: "Same-calendar-month return seasonality",
  family: "equity-factors",
  source: "Heston & Sadka 2008 return seasonality",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_DAILY",
  rebalance: "monthly",
  longShort: true,
  params: {
    yearsLookback: 5,
    decile: 0.1,
  },
};

// approximate a trading month as 21 bars
const M = 21;

export function rank(universe, t, ctx) {
  const years = ctx.params.yearsLookback;
  const monthsNeeded = years * 12;
  const scores = [];

  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    // need enough history for `monthsNeeded` prior same-calendar-months (12*years months back)
    const totalBarsNeeded = monthsNeeded * M + M;
    if (b.length < totalBarsNeeded) continue;

    // "current calendar month" = the month bar[len-1] falls in; average that month's return
    // over trailing years using the same offset (t - 12*M, t - 24*M, ...)
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
  const bottom = scores.slice(-n);

  const w = {};
  for (const s of top) w[s.sym] = 0.5 / top.length;
  for (const s of bottom) w[s.sym] = -0.5 / bottom.length;
  return w;
}
