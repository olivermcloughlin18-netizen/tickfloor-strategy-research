// Mechanical long-only rewrite of wide-equity-factors-idio-vol-low.mjs (r24b batch, item B).
export const meta = {
  id: "r24b-lo-idio-vol-low",
  name: "Low idiosyncratic vol, long-only (single-factor market-model residual, 1m) (wide US stocks)",
  family: "equity-factors",
  source: "catalogue.json equity-factors-idio-vol-low; long-only rewrite of wide-equity-factors-idio-vol-low",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { lookbackDays: 21, quintile: 0.2 },
};

function dailyRets(bars, n) {
  const rets = [];
  const start = bars.length - n - 1;
  if (start < 0) return null;
  for (let k = start + 1; k < bars.length; k++) rets.push(bars[k].close / bars[k - 1].close - 1);
  return rets;
}

export function rank(universe, t, ctx) {
  const { lookbackDays, quintile } = ctx.params;
  const syms = Object.keys(universe).filter((s) => universe[s].length >= lookbackDays + 2);
  if (syms.length < 10) return {};

  const perSym = {};
  for (const s of syms) perSym[s] = dailyRets(universe[s], lookbackDays);

  const market = [];
  for (let d = 0; d < lookbackDays; d++) {
    let sum = 0, cnt = 0;
    for (const s of syms) { sum += perSym[s][d]; cnt++; }
    market.push(sum / cnt);
  }
  const mMean = market.reduce((a, b) => a + b, 0) / market.length;
  let mVar = 0;
  for (const x of market) mVar += (x - mMean) ** 2;
  mVar /= market.length;

  const scores = [];
  for (const s of syms) {
    const y = perSym[s];
    const yMean = y.reduce((a, b) => a + b, 0) / y.length;
    let cov = 0;
    for (let d = 0; d < market.length; d++) cov += (market[d] - mMean) * (y[d] - yMean);
    cov /= market.length;
    const beta = mVar > 0 ? cov / mVar : 0;
    const alpha = yMean - beta * mMean;
    let resVar = 0;
    for (let d = 0; d < market.length; d++) {
      const resid = y[d] - (alpha + beta * market[d]);
      resVar += resid * resid;
    }
    const residStd = Math.sqrt(resVar / (market.length - 2));
    scores.push({ sym: s, residStd });
  }
  scores.sort((a, b) => a.residStd - b.residStd);
  const n = Math.max(1, Math.floor(scores.length * quintile));
  const low = scores.slice(0, n);
  const w = {};
  for (const s of low) w[s.sym] = 1 / low.length;
  return w;
}
