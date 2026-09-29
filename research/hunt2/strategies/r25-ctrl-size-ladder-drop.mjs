// prereg-2026-09-25 control: r25-size-ladder triggered by the small third falling <= -1% alone
// (plain buy-after-a-drop of small caps, no lead from the mega caps). Otherwise identical.
// hold the small third equal weight for the next 5 rebalances (daily); otherwise equal weight on
// everything. A new trigger restarts the 5-rebalance hold with the new small third.
export const meta = {
  id: "r25-ctrl-size-ladder-drop",
  name: "Control: small-cap drop trigger, 5-session hold, daily (wide US stocks)",
  family: "deep-validation-control",
  source: "Preregistered matched buy-after-a-drop control for r25-size-ladder",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "daily",
  params: { need: 254, lag: 2, minNames: 50, window: 252, smallMax: -0.01, holdDays: 5 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, window, smallMax, holdDays } = ctx.params;
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
  const small = rows.slice(rows.length - Math.floor(rows.length / 3));
  const avg = (g) => g.reduce((p, x) => p + x[2], 0) / g.length;
  if (avg(small) <= smallMax) {
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
