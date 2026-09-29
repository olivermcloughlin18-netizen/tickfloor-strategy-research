// prereg-2026-09-25 B5: hold the 2 bond ETFs with the highest 12-1 return.
export const meta = {
  id: "r25-bond-etf-xsmom",
  name: "Bond ETF 12-1 momentum, top 2 of 5",
  family: "momentum",
  source: "Asness, Moskowitz & Pedersen 2013 JF (value and momentum everywhere); Jostova, Nikolova, Philipov & Stahel 2013 RFS",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["TLT", "IEF", "SHY", "LQD", "HYG"],
  rebalance: "monthly",
  params: { need: 254, lag: 2, lookback: 252, skip: 21, hold: 2, minNames: 4 },
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
  rows.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const out = {};
  for (const [sym] of rows.slice(0, hold)) out[sym] = 1 / hold;
  return out;
}
