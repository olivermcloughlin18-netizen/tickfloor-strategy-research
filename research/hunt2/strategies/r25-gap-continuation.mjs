// prereg-2026-09-25 B3: unfilled up-gap continuation. A name qualifies if some session g in
// [e-21, e-2] opened > 3% above the prior close and the lows of g, g+1 and g+2 all stayed above
// that prior close. Score = the most recent qualifying gap's size; hold the N largest (>= 10
// qualifying names needed, else equal weight). Weekly.
export const meta = {
  id: "r25-gap-continuation",
  name: "Unfilled up-gap continuation, weekly (wide US stocks)",
  family: "event-driven",
  source: "Replication of sweep150 t14-3 (unfilled gap continuation, 17 tech names) on 171 names; Plastun, Sibande, Gupta & Wohar 2020 NAJEF (price gap anomaly in the US stock market)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "weekly",
  params: { need: 25, lag: 2, minNames: 50, gap: 0.03, window: 21, minHold: 10 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}
function order(rows, desc) {
  return rows.sort((a, b) => (desc ? b[1] - a[1] : a[1] - b[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

export function rank(universe, t, ctx) {
  const { need, lag, minNames, gap, window, minHold } = ctx.params;
  let M = 0;
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    M++;
    for (let g = e - 2; g >= e - window; g--) {
      const pc = b[g - 1].close;
      const size = b[g].open / pc - 1;
      if (size > gap && b[g].low > pc && b[g + 1].low > pc && b[g + 2].low > pc) {
        rows.push([sym, size]);
        break;
      }
    }
  }
  if (M < minNames || rows.length < minHold) return ew(universe);
  const N = Math.min(rows.length, Math.max(10, Math.round(0.2 * M)));
  const out = {};
  for (const [sym] of order(rows, true).slice(0, N)) out[sym] = 1 / N;
  return out;
}
