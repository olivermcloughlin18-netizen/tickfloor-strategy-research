// prereg-2026-09-25 control: fixed 60% equity; the 40% bond sleeve goes to whichever of the three
// bond ETFs has the LOWEST 21-session return (buy-after-a-drop). Matched to r25-duration-mom-6040.
export const meta = {
  id: "r25-ctrl-duration-drop-6040",
  name: "Control: 60/40 with a 1-month-drop bond sleeve (QQQ + TLT/IEF/SHY)",
  family: "deep-validation-control",
  source: "Preregistered matched buy-after-a-drop control",
  assetClass: "etf",
  timeframe: "1d",
  assets: ["QQQ", "TLT", "IEF", "SHY"],
  rebalance: "monthly",
  params: { need: 23, lag: 2, lookback: 21, equity: 0.6 },
};

const EQUITY = new Set(["QQQ", "IWM"]);
function ew(u) {
  const s = Object.keys(u);
  const w = {};
  for (const x of s) w[x] = 1 / s.length;
  return w;
}

export function rank(universe, t, ctx) {
  const { need, lag, lookback, equity } = ctx.params;
  const syms = Object.keys(universe);
  const eq = syms.find((s) => EQUITY.has(s));
  const sleeve = syms.filter((s) => !EQUITY.has(s));
  if (syms.length !== 4 || !eq || sleeve.length !== 3) return ew(universe);
  if (universe[eq].length < need) return ew(universe);
  const rows = [];
  for (const s of sleeve) {
    const b = universe[s];
    if (b.length < need) return ew(universe);
    const r = b[b.length - lag].close / b[b.length - lag - lookback].close - 1;
    if (!Number.isFinite(r)) return ew(universe);
    rows.push([s, r]);
  }
  rows.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return { [eq]: equity, [rows[0][0]]: 1 - equity };
}
