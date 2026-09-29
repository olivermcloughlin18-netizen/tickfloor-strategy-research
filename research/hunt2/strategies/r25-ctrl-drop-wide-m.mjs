// prereg-2026-09-25 control: monthly buy-after-a-drop on the wide universe with this batch's exact
// conventions (lag 2, N = max(10, round(0.2M)), equal weight on everything below 50 names).
export const meta = {
  id: "r25-ctrl-drop-wide-m",
  name: "Control: 1-month drop, bottom 20%, monthly (wide US stocks)",
  family: "deep-validation-control",
  source: "Preregistered matched buy-after-a-drop control",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 23, lag: 2, minNames: 50, lookback: 21 },
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
  const { need, lag, minNames, lookback } = ctx.params;
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const r = b[e].close / b[e - lookback].close - 1;
    if (Number.isFinite(r)) rows.push([sym, r]);
  }
  if (rows.length < minNames) return ew(universe);
  const N = Math.max(10, Math.round(0.2 * rows.length));
  const out = {};
  for (const [sym] of order(rows, false).slice(0, N)) out[sym] = 1 / N;
  return out;
}
