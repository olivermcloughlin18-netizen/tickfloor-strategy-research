// Credit ETF deterioration while VIX curve stays calm. Spec: research/hunt2/specs-0929-sol.json
export const meta = {
  id: "sol-credit-vol-warning",
  name: "Credit ETF deterioration while VIX curve stays calm",
  family: "credit-vol-disagreement",
  source: "https://www.nber.org/papers/w17021",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["SHY","LQD","HYG","XLK"],
  rebalance: "daily",
  params: { creditLookbackDays: 21, ratioDrop: 0.03, minVixSlopePoints: 1, holdDays: 21, assetWarmupBars: 64 },
};

const A = ["SHY","LQD","HYG","XLK"];
const DEF = ["SHY","LQD"];

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const s = ctx.state;
  if (s.hold === undefined) { s.hold = 0; s.pred = false; s.h = {}; s.cnt = 0; }
  const base = {};
  for (const a of A) base[a] = 1 / A.length;
  const warm = A.every((a) => universe[a] && universe[a].length >= p.assetWarmupBars);
  const pred = (() => {
    const H = universe.HYG, L = universe.LQD, n = p.creditLookbackDays;
    if (!H || !L || H.length < n + 1 || L.length < n + 1) return null;
    const v = ctx.macro("VIX"), v3 = ctx.macro("VIX3M");
    if (v === null || v3 === null) return null;
    const r = H[H.length - 1].close / L[L.length - 1].close / (H[H.length - 1 - n].close / L[L.length - 1 - n].close) - 1;
    return r <= -p.ratioDrop && v3 - v > p.minVixSlopePoints;
  })();
  let trig = false;
  if (warm && pred === true && s.pred === false && s.hold === 0) trig = true;
  if (pred !== null) s.pred = pred;
  if (!warm) return base;
  if (trig) s.hold = p.holdDays;
  if (s.hold > 0) {
    s.hold--;
    const w = {};
    for (const a of DEF) w[a] = 1 / DEF.length;
    return w;
  }
  return base;
}
