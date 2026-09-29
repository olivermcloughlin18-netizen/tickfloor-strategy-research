// prereg-2026-09-25 control: hold the 2 bond ETFs with the lowest 21-session return.
export const meta = {
  id: "r25-ctrl-drop-bond",
  name: "Control: bond ETF 1-month drop, bottom 2 of 5",
  family: "deep-validation-control",
  source: "Preregistered matched buy-after-a-drop control",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["TLT", "IEF", "SHY", "LQD", "HYG"],
  rebalance: "monthly",
  params: { need: 23, lag: 2, lookback: 21, skip: 0, hold: 2, minNames: 4 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { need, lag, lookback, skip, hold, minNames } = ctx.params;
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const r = b[e - skip].close / b[e - lookback].close - 1;
    if (Number.isFinite(r)) rows.push([sym, r]);
  }
  if (rows.length < minNames) return ew(universe);
  rows.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const out = {};
  for (const [sym] of rows.slice(0, hold)) out[sym] = 1 / hold;
  return out;
}
