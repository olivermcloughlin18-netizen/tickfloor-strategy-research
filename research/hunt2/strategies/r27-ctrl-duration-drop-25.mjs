// prereg-2026-09-27 dumb control for r27-duration-mom-neutral: 25% QQQ plus 75% in the bond ETF
// (TLT/IEF/SHY) with the LOWEST 21-session return, monthly.
export const meta = {
  id: "r27-ctrl-duration-drop-25",
  name: "Control: 25% QQQ plus 75% in the worst 1-month bond ETF",
  family: "deep-validation-control",
  source: "Preregistered matched naive control (prereg-2026-09-27 section 6)",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "TLT", "IEF", "SHY"],
  rebalance: "monthly",
  params: { lag: 2, lookback: 21, need: 23 },
};

const SLEEVE = ["TLT", "IEF", "SHY"];

function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { lag, lookback, need } = ctx.params;
  if (!universe.QQQ || !SLEEVE.every((s) => universe[s])) return ew(universe);
  const rows = [];
  for (const s of SLEEVE) {
    const b = universe[s];
    if (b.length < need) return ew(universe);
    const e = b.length - lag;
    const r = b[e].close / b[e - lookback].close - 1;
    if (!Number.isFinite(r)) return ew(universe);
    rows.push([s, r]);
  }
  rows.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return { QQQ: 0.25, [rows[0][0]]: 0.75 };
}
