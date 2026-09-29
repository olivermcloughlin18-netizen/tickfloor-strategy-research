// Joint fall in breakevens and real yields for duration. Spec: research/hunt2/specs-0929-sol.json (sol-joint-disinflation-duration). Rank mode, daily rebalance, fixed params.
export const meta = {
  id: "sol-joint-disinflation-duration",
  name: "Joint fall in breakevens and real yields for duration",
  family: "rate-decomposition",
  source: "https://www.federalreserve.gov/data/tips-yield-curve-and-inflation-compensation.htm",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["TLT","IEF","SHY"],
  rebalance: "daily",
  params: { lookbackDays: 21, maxBreakevenChangePp: -0.2, maxRealYieldChangePp: -0.2, holdDays: 21, assetWarmupBars: 64 },
};

const ALL = ["TLT","IEF","SHY"];
const TRIG = ["TLT","IEF"];

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const st = ctx.state;
  if (st.h === undefined) { st.h = []; st.held = 0; st.armed = true; }
  const base = {};
  for (const s of ALL) base[s] = 1 / ALL.length;
  for (const s of ALL) if (!universe[s] || universe[s].length < p.assetWarmupBars) return base;
  const a = ctx.macro("T10YIE"), b = ctx.macro("DFII10");
  if (a !== null && b !== null) st.h.push([a, b]);
  const h = st.h;
  const pred = h.length >= p.lookbackDays + 1 && h[h.length-1][0] - h[h.length-1-p.lookbackDays][0] <= p.maxBreakevenChangePp && h[h.length-1][1] - h[h.length-1-p.lookbackDays][1] <= p.maxRealYieldChangePp;
  let hold = st.held > 0;
  if (hold) st.held--;
  else if (pred && st.armed) { hold = true; st.armed = false; st.held = p.holdDays - 1; }
  if (!pred) st.armed = true;
  if (!hold) return base;
  const w = {};
  for (const s of TRIG) w[s] = 1 / TRIG.length;
  return w;
}
