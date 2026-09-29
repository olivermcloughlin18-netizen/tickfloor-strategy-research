// prereg-2026-09-25 control: hold 100% of the asset with the LOWEST 21-session return (plain
// buy-after-a-drop at the same monthly cadence). Symbol-agnostic, so it also runs on holdout.
export const meta = {
  id: "r25-ctrl-laggard-qqq-agg",
  name: "Control: hold the 1-month laggard of QQQ/AGG",
  family: "deep-validation-control",
  source: "Preregistered matched buy-after-a-drop control",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "AGG"],
  rebalance: "monthly",
  params: { need: 23, lag: 2, lookback: 21 },
};

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { need, lag, lookback } = ctx.params;
  const syms = Object.keys(universe);
  if (syms.length !== 2) return ew(universe);
  const rows = [];
  for (const s of syms) {
    const b = universe[s];
    if (b.length < need) return ew(universe);
    const r = b[b.length - lag].close / b[b.length - lag - lookback].close - 1;
    if (!Number.isFinite(r)) return ew(universe);
    rows.push([s, r]);
  }
  rows.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return { [rows[0][0]]: 1 };
}
