// prereg-2026-09-25 B1: 12-1 return divided by 126-session volatility; hold the N highest,
// weighted by inverse volatility.
export const meta = {
  id: "r25-mom-riskadj",
  name: "Risk-adjusted 12-1 momentum, inverse-vol weights (wide US stocks)",
  family: "momentum",
  source: "Barroso & Santa-Clara 2015 JFE; Daniel & Moskowitz 2016 JFE (volatility-scaled momentum)",
  assetClass: "us_stock",
  timeframe: "1d",
  universe: "US_STOCKS_WIDE",
  rebalance: "monthly",
  params: { need: 254, lag: 2, minNames: 50, volWindow: 126 },
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
  const { need, lag, minNames, volWindow } = ctx.params;
  const elig = [];
  for (const sym of Object.keys(universe)) {
    const b = universe[sym];
    if (b.length < need) continue;
    const e = b.length - lag;
    const rs = [];
    for (let k = e - volWindow + 1; k <= e; k++) rs.push(b[k].close / b[k - 1].close - 1);
    const m = rs.reduce((p, q) => p + q, 0) / rs.length;
    const sd = Math.sqrt(rs.reduce((p, q) => p + (q - m) ** 2, 0) / (rs.length - 1));
    if (!(sd > 0)) continue;
    const score = (b[e - 21].close / b[e - 252].close - 1) / sd;
    if (Number.isFinite(score)) elig.push([sym, score, sd]);
  }
  const M = elig.length;
  if (M < minNames) return ew(universe);
  const N = Math.max(10, Math.round(0.2 * M));
  const top = order(elig, true).slice(0, N);
  const inv = top.reduce((p, x) => p + 1 / x[2], 0);
  const out = {};
  for (const x of top) out[x[0]] = 1 / x[2] / inv;
  return out;
}
