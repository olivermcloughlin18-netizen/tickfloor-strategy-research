export const meta = {
  id: "wide-equity-factors-betting-against-beta",
  name: "Betting against beta (price-only proxy) (wide US stocks)",
  family: "equity-factors",
  source: "Frazzini & Pedersen 2014 BAB; beta vs equal-weight universe return (no FF factors available)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  longShort: true,
  params: {
    betaWindow: 252, // ~12 months daily returns for rolling beta
    decile: 0.2,      // quintiles (low-beta long, high-beta short)
  },
};

export function rank(universe, t, ctx) {
  const w = ctx.params.betaWindow;
  const syms = Object.keys(universe).filter(s => universe[s].length >= w + 1);
  if (syms.length < 10) return {};

  // market proxy = equal-weight daily return across the universe (same-day)
  const marketRet = [];
  for (let k = 1; k <= w; k++) {
    let sum = 0, n = 0;
    for (const sym of syms) {
      const b = universe[sym];
      const idx = b.length - 1 - w + k;
      if (idx <= 0) continue;
      const r = b[idx].close / b[idx - 1].close - 1;
      sum += r; n++;
    }
    marketRet.push(n > 0 ? sum / n : 0);
  }
  const mMean = marketRet.reduce((a, b) => a + b, 0) / marketRet.length;
  let mVar = 0;
  for (const r of marketRet) mVar += (r - mMean) * (r - mMean);
  mVar /= marketRet.length;
  if (mVar <= 0) return {};

  const scores = [];
  for (const sym of syms) {
    const b = universe[sym];
    let cov = 0;
    for (let k = 1; k <= w; k++) {
      const idx = b.length - 1 - w + k;
      const r = b[idx].close / b[idx - 1].close - 1;
      cov += (r - 0) * (marketRet[k - 1] - mMean); // stock mean not subtracted: fine for ranking beta
    }
    cov /= w;
    const beta = cov / mVar;
    scores.push({ sym, beta });
  }

  scores.sort((a, b) => a.beta - b.beta); // ascending: low beta first
  const n = Math.max(1, Math.floor(scores.length * ctx.params.decile));
  const lowBeta = scores.slice(0, n);
  const highBeta = scores.slice(-n);

  const weights = {};
  for (const s of lowBeta) weights[s.sym] = 0.5 / lowBeta.length;
  for (const s of highBeta) weights[s.sym] = -0.5 / highBeta.length;
  return weights;
}
