// prereg-2026-09-25 B3: large-to-small lead-lag. Mega = top 10 by 252-session dollar volume,
// small = bottom third. If mega's equal-weight return on session e is > +1% and small's is <= 0,
// hold the small third equal weight for the next 5 rebalances (daily); otherwise equal weight on
// everything. A new trigger restarts the 5-rebalance hold with the new small third.
export const meta = {
  id: "r25-size-ladder",
  name: "Size-ladder diffusion (mega leads small), daily (wide US stocks)",
  family: "mean-reversion-statarb",
  source: "Lo & MacKinlay 1990 RFS; Chordia & Swaminathan 2000 JF; Hou 2007 RFS; replication of sweep150 s02-3 on 8.5 years",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "daily",
  params: { need: 254, lag: 2, minNames: 50, window: 252, mega: 10, megaUp: 0.01, smallMax: 0, holdDays: 5 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, window, mega, megaUp, smallMax, holdDays } = ctx.params;
  if (ctx.state.left === undefined) {
    ctx.state.left = 0;
    ctx.state.names = [];
  }
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    let dv = 0;
    for (let k = e - window + 1; k <= e; k++) dv += b[k].close * b[k].volume;
    const r1 = b[e].close / b[e - 1].close - 1;
    if (Number.isFinite(dv) && Number.isFinite(r1)) rows.push([sym, dv, r1]);
  }
  if (rows.length < minNames) {
    ctx.state.left = 0;
    return ew(universe);
  }
  rows.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const big = rows.slice(0, mega);
  const small = rows.slice(rows.length - Math.floor(rows.length / 3));
  const avg = (g) => g.reduce((p, x) => p + x[2], 0) / g.length;
  if (avg(big) > megaUp && avg(small) <= smallMax) {
    ctx.state.names = small.map((x) => x[0]);
    ctx.state.left = holdDays;
  }
  if (ctx.state.left > 0) {
    ctx.state.left--;
    const held = ctx.state.names.filter((s) => Object.hasOwn(universe, s));
    if (held.length) {
      const out = {};
      for (const s of held) out[s] = 1 / held.length;
      return out;
    }
  }
  return ew(universe);
}
