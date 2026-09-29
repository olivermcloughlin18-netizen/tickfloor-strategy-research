// prereg-2026-09-25 control: plain 12-1 momentum, top 20%, equal weight, this batch's conventions.
// Mechanism control for r25-mom-volscaled, r25-mom-riskadj, r25-tsmom-stock and r25-trend-factor.
export const meta = {
  id: "r25-ctrl-mom-unscaled",
  name: "Control: unscaled 12-1 momentum, top 20% (wide US stocks)",
  family: "deep-validation-control",
  source: "Preregistered mechanism control (Jegadeesh & Titman 1993 baseline)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, minNames: 50 },
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
  const { need, lag, minNames } = ctx.params;
  const rows = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const r = b[e - 21].close / b[e - 252].close - 1;
    if (Number.isFinite(r)) rows.push([sym, r]);
  }
  if (rows.length < minNames) return ew(universe);
  const N = Math.max(10, Math.round(0.2 * rows.length));
  const out = {};
  for (const [sym] of order(rows, true).slice(0, N)) out[sym] = 1 / N;
  return out;
}
