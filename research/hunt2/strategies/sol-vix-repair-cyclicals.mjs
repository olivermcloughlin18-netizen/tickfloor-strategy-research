// Cyclical recovery after sustained VIX inversion repairs. Spec: research/hunt2/specs-0929-sol.json
export const meta = {
  id: "sol-vix-repair-cyclicals",
  name: "Cyclical recovery after sustained VIX inversion repairs",
  family: "volatility-disagreement",
  source: "https://www.cboe.com/tradable_products/vix/term_structure",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLY","XLK","XLP","XLV"],
  rebalance: "daily",
  params: { minInversionDays: 5, holdDays: 10, assetWarmupBars: 64 },
};

const A = ["XLY","XLK","XLP","XLV"];
const DEF = ["XLY","XLK"];

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
    const inv = v >= v3;
    const prior = s.cnt;
    s.cnt = inv ? s.cnt + 1 : 0;
    return !inv && prior >= p.minInversionDays;
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
