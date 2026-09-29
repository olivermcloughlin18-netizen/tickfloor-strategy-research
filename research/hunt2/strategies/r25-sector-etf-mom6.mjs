// prereg-2026-09-25 B5: hold the 3 sector ETFs with the highest 126-session return.
export const meta = {
  id: "r25-sector-etf-mom6",
  name: "Sector ETF 6-month momentum, top 3 of 11",
  family: "momentum",
  source: "Moskowitz & Grinblatt 1999 JF; same rule as the never-scored r24b-sector-etf-mom (rejected on a meta bug), re-registered with a valid meta",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["XLK", "XLF", "XLE", "XLV", "XLI", "XLP", "XLY", "XLU", "XLB", "XLC", "VNQ"],
  rebalance: "monthly",
  params: { need: 128, lag: 2, lookback: 126, skip: 0, hold: 3, minNames: 6 },
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
