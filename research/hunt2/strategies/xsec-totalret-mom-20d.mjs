// MATCHED NAIVE CONTROL for xsec-overnight-mom-20d.
// Identical universe, rebalance frequency, name count, weights, costs and benchmark.
// The ONLY difference: the score is the trailing 20-day TOTAL (close-to-close) return instead of
// its overnight component. If the overnight version does not beat this, the decomposition adds
// nothing and the hypothesis is dead.
export const meta = {
  id: "xsec-totalret-mom-20d",
  name: "Cross-sectional 20-day TOTAL-return momentum (matched control for the overnight version)",
  family: "momentum",
  source: "Matched naive control: same mechanism/frequency/costs as xsec-overnight-mom-20d, scored on close-to-close instead of close-to-open.",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  longShort: true,
  params: { lookback: 20, nSide: 15, minValid: 20 },
};

export function rank(universe, t, ctx) {
  const L = ctx.params.lookback;
  const scores = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < L + 1) continue;
    let s = 0, ok = true;
    for (let j = b.length - 1; j >= b.length - L; j--) {
      const c = b[j].close, pc = b[j - 1].close;
      if (!(c > 0) || !(pc > 0)) { ok = false; break; }
      s += Math.log(c / pc); // total (close-to-close) log return
    }
    if (ok && Number.isFinite(s)) scores.push([sym, s]);
  }
  if (scores.length < ctx.params.minValid) return {};
  scores.sort((x, y) => y[1] - x[1]);
  const n = Math.min(ctx.params.nSide, Math.floor(scores.length / 2));
  const w = 1 / (2 * n);
  const out = {};
  for (let k = 0; k < n; k++) out[scores[k][0]] = w;
  for (let k = 0; k < n; k++) out[scores[scores.length - 1 - k][0]] = -w;
  return out;
}
