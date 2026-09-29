// Inflation compensation rise without real yield rise. Spec: research/hunt2/specs-0929-sol.json
export const meta = {
  id: "sol-inflation-not-real-reflation",
  name: "Inflation compensation rise without real yield rise",
  family: "rate-decomposition",
  source: "https://www.federalreserve.gov/data/tips-yield-curve-and-inflation-compensation.htm",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLE","XLB","XLK","TLT"],
  rebalance: "daily",
  params: { lookbackDays: 21, minBreakevenChangePp: 0.25, maxRealYieldChangePp: 0, holdDays: 21, assetWarmupBars: 64 },
};

const A = ["XLE","XLB","XLK","TLT"];
const DEF = ["XLE","XLB"];

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const s = ctx.state;
  if (s.hold === undefined) { s.hold = 0; s.pred = false; s.h = {}; s.cnt = 0; }
  const base = {};
  const av = A.filter((a) => universe[a]);
  for (const a of av) base[a] = 1 / av.length;
  const warm = A.every((a) => universe[a] && universe[a].length >= p.assetWarmupBars);
  const pred = (() => {
    const be = ctx.macro("T10YIE"), ry = ctx.macro("DFII10");
    if (be === null || ry === null) return null;
    if (s.h.be === undefined) { s.h.be = []; s.h.ry = []; }
    s.h.be.push(be); s.h.ry.push(ry);
    const n = p.lookbackDays, B = s.h.be, R = s.h.ry;
    if (B.length < n + 1) return null;
    return B[B.length - 1] - B[B.length - 1 - n] >= p.minBreakevenChangePp && R[R.length - 1] - R[R.length - 1 - n] <= p.maxRealYieldChangePp;
  })();
  let trig = false;
  if (warm && pred === true && s.pred === false && s.hold === 0) trig = true;
  if (pred !== null) s.pred = pred;
  if (!warm) return base;
  if (trig) s.hold = p.holdDays;
  if (s.hold > 0) {
    s.hold--;
    const w = {};
    const d = DEF.filter((a) => universe[a]);
    if (d.length === 0) return base;
    for (const a of d) w[a] = 1 / d.length;
    return w;
  }
  return base;
}
