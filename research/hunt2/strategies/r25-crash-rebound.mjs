// prereg-2026-09-25 B3: crash-week rebound. On the first rebalance after a Monday-start week
// ends, if the equal-weight universe's return over that week was below -5%, hold the quintile
// of names that fell most that week, equal weight, for 20 rebalances (daily); a new crash week
// restarts the book. Otherwise equal weight on everything.
export const meta = {
  id: "r25-crash-rebound",
  name: "Crash-week loser rebound, 20-session hold (wide US stocks)",
  family: "mean-reversion-statarb",
  source: "Daniel & Moskowitz 2016 JFE (losers rebound after market crashes); replication of sweep150 t15-2 with an equal-weight trigger instead of QQQ",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "daily",
  params: { need: 10, lag: 2, minNames: 50, crash: -0.05, holdDays: 20, quintile: 0.2 },
};

const DAY = 86400;
const week = (time) => Math.floor((Math.floor(time / DAY) + 3) / 7);
function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, crash, holdDays, quintile } = ctx.params;
  if (ctx.state.left === undefined) {
    ctx.state.left = 0;
    ctx.state.picks = [];
  }
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    const L = b.length;
    if (L < need) continue;
    const e = L - lag;
    const wk = week(b[e].time);
    if (week(b[L - 1].time) === wk) continue;
    let p = e - 1;
    while (p >= 0 && week(b[p].time) === wk) p--;
    if (p < 0) continue;
    const r = b[e].close / b[p].close - 1;
    if (Number.isFinite(r)) rows.push([sym, r]);
  }
  if (rows.length >= minNames) {
    const idx = rows.reduce((s, x) => s + x[1], 0) / rows.length;
    if (idx < crash) {
      rows.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      ctx.state.picks = rows.slice(0, Math.round(quintile * rows.length)).map((x) => x[0]);
      ctx.state.left = holdDays;
    }
  }
  if (ctx.state.left > 0) {
    ctx.state.left--;
    const held = ctx.state.picks.filter((s) => Object.hasOwn(universe, s));
    if (held.length) {
      const out = {};
      for (const s of held) out[s] = 1 / held.length;
      return out;
    }
  }
  return ew(universe);
}
