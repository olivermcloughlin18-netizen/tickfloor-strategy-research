// Oil rise with weak dollar as demand-sensitive reflation. Spec: research/hunt2/specs-0929-sol.json (sol-oil-weak-dollar-demand). Rank mode, daily rebalance, fixed params.
export const meta = {
  id: "sol-oil-weak-dollar-demand",
  name: "Oil rise with weak dollar as demand-sensitive reflation",
  family: "oil-shock-attribution",
  source: "https://www.aeaweb.org/articles?id=10.1257/aer.99.3.1053",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLE","XLB","XLP","XLY"],
  rebalance: "daily",
  params: { lookbackDays: 63, minOilReturn: 0.15, maxDollarReturn: -0.02, holdDays: 21, assetWarmupBars: 64 },
};

const ALL = ["XLE","XLB","XLP","XLY"];
const TRIG = ["XLE","XLB"];

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const st = ctx.state;
  if (st.h === undefined) { st.h = []; st.held = 0; st.armed = true; }
  const base = {};
  for (const s of ALL) if (universe[s]) base[s] = 1 / ALL.length;
  for (const s of ALL) if (universe[s] && universe[s].length < p.assetWarmupBars) return base;
  const a = ctx.macro("DCOILWTICO"), b = ctx.macro("DTWEXBGS");
  if (a !== null && b !== null) st.h.push([a, b]);
  const h = st.h;
  const pred = h.length >= p.lookbackDays + 1 && h[h.length-1][0] / h[h.length-1-p.lookbackDays][0] - 1 >= p.minOilReturn && h[h.length-1][1] / h[h.length-1-p.lookbackDays][1] - 1 <= p.maxDollarReturn;
  let hold = st.held > 0;
  if (hold) st.held--;
  else if (pred && st.armed) { hold = true; st.armed = false; st.held = p.holdDays - 1; }
  if (!pred) st.armed = true;
  if (!hold) return base;
  const w = {};
  const tp = TRIG.filter((s) => universe[s]); for (const s of tp) w[s] = 1 / tp.length;
  return w;
}
