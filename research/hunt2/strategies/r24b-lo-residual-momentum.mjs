// Mechanical long-only rewrite of wide-equity-factors-residual-momentum.mjs (r24b batch, item B).
export const meta = {
  id: "r24b-lo-residual-momentum",
  name: "Residual momentum, long-only (single-factor market-model, 36m regress, t-12..t-2) (wide US stocks)",
  family: "equity-factors",
  source: "catalogue.json equity-factors-residual-momentum; long-only rewrite of wide-equity-factors-residual-momentum",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { regressMonths: 36, decile: 0.1 },
};

export function rank(universe, t, ctx) {
  const { regressMonths, decile } = ctx.params;
  const need = regressMonths + 1;
  const syms = [];
  const perSym = {};
  for (const sym of Object.keys(universe)) {
    const bars = universe[sym];
    if (bars.length < need * 20) continue;
    const monthly = ctx.resample(bars, "1M").filter((m) => m.complete);
    if (monthly.length < need) continue;
    const closes = monthly.slice(-need).map((m) => m.close);
    const rets = [];
    for (let k = 1; k < closes.length; k++) rets.push(closes[k] / closes[k - 1] - 1);
    perSym[sym] = rets;
    syms.push(sym);
  }
  if (syms.length < 10) return {};

  const market = [];
  for (let m = 0; m < regressMonths; m++) {
    let sum = 0, cnt = 0;
    for (const s of syms) { sum += perSym[s][m]; cnt++; }
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
    for (let m = 0; m < market.length; m++) cov += (market[m] - mMean) * (y[m] - yMean);
    cov /= market.length;
    const beta = mVar > 0 ? cov / mVar : 0;
    const alpha = yMean - beta * mMean;
    let cumResid = 0;
    const from = market.length - 12, to = market.length - 2;
    for (let m = from; m <= to; m++) {
      cumResid += y[m] - (alpha + beta * market[m]);
    }
    scores.push({ sym: s, cumResid });
  }
  scores.sort((a, b) => b.cumResid - a.cumResid);
  const n = Math.max(1, Math.floor(scores.length * decile));
  const top = scores.slice(0, n);
  const w = {};
  for (const s of top) w[s.sym] = 1 / top.length;
  return w;
}
