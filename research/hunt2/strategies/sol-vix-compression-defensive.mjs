// Pre-inversion VIX slope compression to defensive sectors. Spec: research/hunt2/specs-0929-sol.json
export const meta = {
  id: "sol-vix-compression-defensive",
  name: "Pre-inversion VIX slope compression to defensive sectors",
  family: "volatility-disagreement",
  source: "https://www.cboe.com/tradable_products/vix/term_structure",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLP","XLV","XLU","XLY","XLK","XLI"],
  rebalance: "daily",
  params: { lookbackDays: 5, slopeDropPoints: 3, minSlopePoints: 0, holdDays: 10, assetWarmupBars: 64 },
};

const A = ["XLP","XLV","XLU","XLY","XLK","XLI"];
const DEF = ["XLP","XLV","XLU"];

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const s = ctx.state;
  if (s.hold === undefined) { s.hold = 0; s.pred = false; s.h = {}; s.cnt = 0; }
  const base = {};
  for (const a of A) base[a] = 1 / A.length;
  const warm = A.every((a) => universe[a] && universe[a].length >= p.assetWarmupBars);
  const pred = (() => {
    const v = ctx.macro("VIX"), v3 = ctx.macro("VIX3M");
    if (v === null || v3 === null) return null;
    if (s.h.sl === undefined) s.h.sl = [];
    s.h.sl.push(v3 - v);
    const sl = s.h.sl;
    if (sl.length < p.lookbackDays + 1) return null;
    const now = sl[sl.length - 1], prev = sl[sl.length - 1 - p.lookbackDays];
    return now > p.minSlopePoints && prev - now >= p.slopeDropPoints;
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
