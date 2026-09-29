// Dollar strength despite falling US real yields. Spec: research/hunt2/specs-0929-sol.json (sol-dollar-real-yield-conflict). Rank mode, daily rebalance, fixed params.
export const meta = {
  id: "sol-dollar-real-yield-conflict",
  name: "Dollar strength despite falling US real yields",
  family: "macro-disagreement",
  source: "https://www.federalreserve.gov/Releases/H10/",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["UUP","SHY","SLV","DBC"],
  rebalance: "daily",
  params: { dollarLookbackDays: 63, minDollarReturn: 0.02, realLookbackDays: 21, maxRealYieldChangePp: -0.15, holdDays: 21, assetWarmupBars: 64 },
};

const ALL = ["UUP","SHY","SLV","DBC"];
const TRIG = ["UUP","SHY"];

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const st = ctx.state;
  if (st.h === undefined) { st.h = []; st.held = 0; st.armed = true; }
  const base = {};
  for (const s of ALL) if (universe[s]) base[s] = 1 / ALL.length;
  for (const s of ALL) if (universe[s] && universe[s].length < p.assetWarmupBars) return base;
  const a = ctx.macro("DTWEXBGS"), b = ctx.macro("DFII10");
  if (a !== null && b !== null) st.h.push([a, b]);
  const h = st.h;
  const pred = h.length >= p.dollarLookbackDays + 1 && h[h.length-1][0] / h[h.length-1-p.dollarLookbackDays][0] - 1 >= p.minDollarReturn && h[h.length-1][1] - h[h.length-1-p.realLookbackDays][1] <= p.maxRealYieldChangePp;
  let hold = st.held > 0;
  if (hold) st.held--;
  else if (pred && st.armed) { hold = true; st.armed = false; st.held = p.holdDays - 1; }
  if (!pred) st.armed = true;
  if (!hold) return base;
  const w = {};
  const tp = TRIG.filter((s) => universe[s]); for (const s of tp) w[s] = 1 / tp.length;
  return w;
}
