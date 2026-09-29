// Oil shock without inflation-compensation response. Spec: research/hunt2/specs-0929-sol.json (sol-oil-without-breakeven). Rank mode, daily rebalance, fixed params.
export const meta = {
  id: "sol-oil-without-breakeven",
  name: "Oil shock without inflation-compensation response",
  family: "oil-shock-attribution",
  source: "https://www.aeaweb.org/articles?id=10.1257/aer.99.3.1053",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLP","XLV","XLY","XLI"],
  rebalance: "daily",
  params: { oilLookbackDays: 63, minOilReturn: 0.2, breakevenLookbackDays: 21, maxBreakevenChangePp: 0, holdDays: 21, assetWarmupBars: 64 },
};

const ALL = ["XLP","XLV","XLY","XLI"];
const TRIG = ["XLP","XLV"];

export function rank(universe, t, ctx) {
  const p = ctx.params;
  const st = ctx.state;
  if (st.h === undefined) { st.h = []; st.held = 0; st.armed = true; }
  const base = {};
  for (const s of ALL) base[s] = 1 / ALL.length;
  for (const s of ALL) if (!universe[s] || universe[s].length < p.assetWarmupBars) return base;
  const a = ctx.macro("DCOILWTICO"), b = ctx.macro("T10YIE");
  if (a !== null && b !== null) st.h.push([a, b]);
  const h = st.h;
  const pred = h.length >= p.oilLookbackDays + 1 && h[h.length-1][0] / h[h.length-1-p.oilLookbackDays][0] - 1 >= p.minOilReturn && h[h.length-1][1] - h[h.length-1-p.breakevenLookbackDays][1] <= p.maxBreakevenChangePp;
  let hold = st.held > 0;
  if (hold) st.held--;
  else if (pred && st.armed) { hold = true; st.armed = false; st.held = p.holdDays - 1; }
  if (!pred) st.armed = true;
  if (!hold) return base;
  const w = {};
  for (const s of TRIG) w[s] = 1 / TRIG.length;
  return w;
}
